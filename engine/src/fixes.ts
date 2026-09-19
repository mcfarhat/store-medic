// Fix actions per finding kind. Plugin updates are EXECUTED for real when a write target is
// configured (WP_CLI_PATH/WP_CLI_USER) — the engine runs on the same host as the store and
// runs `wp plugin update <slug>` as the site user. Everything else is advisory for now.
import { promisify } from "util";
import { execFile } from "child_process";
import type { Finding } from "./store.js";

const execFileP = promisify(execFile);

export interface FixResult {
  applied: boolean;
  message: string;
}

async function updatePlugin(slug: string): Promise<FixResult> {
  const path = process.env.WP_CLI_PATH;
  const user = process.env.WP_CLI_USER;
  const bin = process.env.WP_CLI_BIN || "wp";
  if (!path || !user) {
    return { applied: false, message: `Update "${slug}" queued — auto-apply activates once write access is configured.` };
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { applied: false, message: `Cannot auto-update "${slug}" — unrecognized plugin id.` };
  }
  try {
    const { stdout } = await execFileP(
      "sudo",
      ["-u", user, "-H", bin, `--path=${path}`, "plugin", "update", slug],
      { timeout: 180000 },
    );
    const last = String(stdout).trim().split("\n").filter(Boolean).slice(-1)[0] || "done";
    return { applied: true, message: `Updated ${slug} — ${last}` };
  } catch (e: any) {
    const msg = String(e?.stderr || e?.stdout || e?.message || "error").trim().slice(0, 160);
    return { applied: false, message: `Update ${slug} failed: ${msg}` };
  }
}

export async function applyFix(f: Finding): Promise<FixResult> {
  switch (f.kind) {
    case "plugin_outdated": {
      const slug = String((f.meta as any)?.slug || "");
      return slug ? updatePlugin(slug) : { applied: false, message: "No plugin id to update." };
    }
    case "insecure_connection":
      return { applied: false, message: "Install/renew SSL and force HTTPS (server-level). Flagged for your host." };
    case "php_outdated":
      return { applied: false, message: "Bump PHP to 8.1+ in the hosting panel. Test on staging first." };
    case "ssl_expiring":
    case "ssl_expired":
      return { applied: false, message: "Renew SSL / enable auto-renewal (Let's Encrypt or Cloudflare)." };
    case "stockout":
      return { applied: false, message: "Restock or hide the product and enable back-in-stock alerts." };
    case "orders_failing":
      return { applied: false, message: "Re-check the payment gateway keys/webhooks; run a sandbox checkout." };
    case "site_down":
      return { applied: false, message: "Check hosting/uptime and the payment gateway." };
    case "site_slow":
      return { applied: false, message: "Enable page/object caching; audit recent plugin updates." };
    default:
      return { applied: false, message: "No automated fix for this finding yet." };
  }
}

// WordPress/WooCommerce health watcher via the WooCommerce System Status endpoint
// (/wc/v3/system_status, read scope). Surfaces outdated plugins, insecure config, old PHP —
// the slow-burning problems that get stores hacked or break checkout after an update.
import type { RawSignal } from "./woo.js";

interface WooConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

function authHeader(c: WooConfig): string {
  return "Basic " + Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
}

export async function scanHealth(c: WooConfig): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  let sys: any;
  try {
    const url = `${c.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/system_status`;
    const res = await fetch(url, { headers: { Authorization: authHeader(c) } });
    if (!res.ok) return signals;
    sys = await res.json();
  } catch {
    return signals;
  }

  // Outdated active plugins (WooCommerce reports version + version_latest).
  for (const p of (sys.active_plugins ?? []) as any[]) {
    const cur = String(p.version ?? "");
    const latest = String(p.version_latest ?? "");
    if (latest && cur && latest !== cur) {
      signals.push({
        kind: "plugin_outdated",
        severity: "warning",
        title: `Update available: ${p.name}`,
        detail: `${p.name} is on ${cur}; ${latest} is available (outdated plugins are the #1 hack vector)`,
        raw: { plugin: p.name, current: cur, latest },
      });
    }
  }

  // Store not served securely.
  if (sys.security && sys.security.secure_connection === false) {
    signals.push({
      kind: "insecure_connection",
      severity: "critical",
      title: "Store not served over HTTPS",
      detail: "WooCommerce reports the connection is not secure — checkout and card data are at risk",
      raw: {},
    });
  }

  // End-of-life PHP.
  const php = String(sys.environment?.php_version ?? "");
  if (php && /^[0-7]\./.test(php)) {
    signals.push({
      kind: "php_outdated",
      severity: "warning",
      title: `Outdated PHP ${php}`,
      detail: `PHP ${php} is end-of-life; upgrade to 8.1+ for security and speed`,
      raw: { php },
    });
  }

  return signals;
}

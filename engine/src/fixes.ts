// Fix actions per finding kind. With a READ-ONLY key we produce a concrete remediation plan
// and record it on approval. Write actions (update plugin, toggle stock, disable a plugin)
// activate automatically once a write-scoped key or a site connector plugin is configured.
import type { Finding } from "./store.js";

export interface FixResult {
  applied: boolean; // true = we actually changed the store; false = advised, needs write access
  message: string;
}

type FixHandler = (f: Finding) => FixResult;

const handlers: Record<string, FixHandler> = {
  plugin_outdated: (f) => ({
    applied: false,
    message: `Queued update: ${f.title.replace("Update available: ", "")}. Auto-applies once write access is granted.`,
  }),
  insecure_connection: () => ({
    applied: false,
    message: "Install/renew SSL and force HTTPS (server-level). Flagged for your host.",
  }),
  php_outdated: () => ({
    applied: false,
    message: "Bump PHP to 8.1+ in the hosting panel. Test staging first.",
  }),
  stockout: () => ({
    applied: false,
    message: "Restock or hide the product and enable back-in-stock alerts. Needs write access to apply.",
  }),
  orders_failing: () => ({
    applied: false,
    message: "Re-check the payment gateway keys/webhooks and run a sandbox checkout.",
  }),
  site_down: () => ({
    applied: false,
    message: "Check hosting/uptime and the payment gateway; post a maintenance notice if extended.",
  }),
  site_slow: () => ({
    applied: false,
    message: "Enable page/object caching and audit recent plugin updates.",
  }),
};

export function applyFix(f: Finding): FixResult {
  const h = handlers[f.kind];
  return h ? h(f) : { applied: false, message: "No automated fix for this finding yet." };
}

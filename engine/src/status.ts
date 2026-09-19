// Full store health snapshot for the app dashboard. Returns EVERY monitored check with a
// pass/warn/fail status — so the app shows the agent's breadth even when the store is healthy.
interface WooConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface Check {
  key: string;
  label: string;
  status: "ok" | "warning" | "critical";
  detail: string;
}

export interface StoreStatus {
  storeUrl: string;
  checkedAt: string;
  score: number; // 0-100, share of checks that are OK
  ok: number;
  total: number;
  checks: Check[];
}

function authHeader(c: WooConfig): string {
  return "Basic " + Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
}

export async function buildStatus(c: WooConfig): Promise<StoreStatus> {
  const base = c.storeUrl.replace(/\/$/, "");
  const checks: Check[] = [];

  // Storefront reachability + speed.
  try {
    const t0 = Date.now();
    const res = await fetch(c.storeUrl, { redirect: "follow" });
    const ms = Date.now() - t0;
    checks.push({ key: "storefront", label: "Storefront online", status: res.ok ? "ok" : "critical", detail: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}` });
    checks.push({ key: "speed", label: "Response speed", status: ms > 4000 ? "warning" : "ok", detail: `${ms} ms` });
  } catch (e) {
    checks.push({ key: "storefront", label: "Storefront online", status: "critical", detail: String(e).slice(0, 60) });
  }

  // System status: HTTPS, PHP, plugin updates, Woo version.
  let sys: any = null;
  try {
    const r = await fetch(`${base}/wp-json/wc/v3/system_status`, { headers: { Authorization: authHeader(c) } });
    if (r.ok) sys = await r.json();
  } catch { /* ignore */ }
  if (sys) {
    const secure = sys.security?.secure_connection;
    checks.push({ key: "https", label: "Secure (HTTPS)", status: secure === false ? "critical" : "ok", detail: secure === false ? "Not secure" : "TLS OK" });
    const php = String(sys.environment?.php_version ?? "");
    checks.push({ key: "php", label: "PHP version", status: /^[0-7]\./.test(php) ? "warning" : "ok", detail: php || "unknown" });
    const outdated = ((sys.active_plugins ?? []) as any[]).filter((p) => p.version_latest && p.version && p.version_latest !== p.version);
    checks.push({ key: "plugins", label: "Plugin updates", status: outdated.length ? "warning" : "ok", detail: outdated.length ? `${outdated.length} available` : "All up to date" });
    const wooV = String(sys.environment?.version ?? "");
    checks.push({ key: "woo", label: "WooCommerce", status: "ok", detail: wooV ? `v${wooV}` : "active" });
  } else {
    checks.push({ key: "api", label: "Store API", status: "warning", detail: "Status unavailable" });
  }

  // Failed orders (checkout / payment health).
  try {
    const r = await fetch(`${base}/wp-json/wc/v3/orders?status=failed&per_page=1`, { headers: { Authorization: authHeader(c) } });
    if (r.ok) {
      const total = Number(r.headers.get("x-wp-total") ?? "0");
      checks.push({ key: "orders", label: "Checkout & payments", status: total > 0 ? "critical" : "ok", detail: total > 0 ? `${total} failed order(s)` : "No failed orders" });
    }
  } catch { /* ignore */ }

  const ok = checks.filter((c) => c.status === "ok").length;
  const score = checks.length ? Math.round((ok / checks.length) * 100) : 100;
  return { storeUrl: c.storeUrl, checkedAt: new Date().toISOString(), score, ok, total: checks.length, checks };
}

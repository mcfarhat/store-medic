// WooCommerce store-health watcher. Produces RAW signals; verify.ts confirms them.
// Uses the WooCommerce REST API (read-only keys) + a plain HTTP probe of the storefront.

export interface RawSignal {
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  raw: Record<string, unknown>;
}

interface WooConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

function authHeader(c: WooConfig): string {
  return "Basic " + Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString("base64");
}

async function wooGet(c: WooConfig, path: string): Promise<any> {
  const url = `${c.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3/${path}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(c) } });
  if (!res.ok) throw new Error(`Woo ${path} -> ${res.status}`);
  return res.json();
}

// Each check returns 0+ raw signals. Cheap, independent, easy to extend.
export async function scanStore(c: WooConfig): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  // 1) Storefront reachability + latency (proxy for "checkout/site down").
  try {
    const t0 = Date.now();
    const res = await fetch(c.storeUrl, { redirect: "follow" });
    const ms = Date.now() - t0;
    if (!res.ok) {
      signals.push({
        kind: "site_down",
        severity: "critical",
        title: "Storefront returned an error",
        detail: `GET ${c.storeUrl} -> HTTP ${res.status}`,
        raw: { status: res.status, ms },
      });
    } else if (ms > 4000) {
      signals.push({
        kind: "site_slow",
        severity: "warning",
        title: "Storefront is slow",
        detail: `Homepage took ${ms}ms to respond`,
        raw: { ms },
      });
    }
  } catch (e) {
    signals.push({
      kind: "site_down",
      severity: "critical",
      title: "Storefront unreachable",
      detail: String(e),
      raw: {},
    });
  }

  // 2) Out-of-stock bestsellers (top sellers now showing outofstock).
  try {
    const top = await wooGet(c, "reports/top_sellers?period=week");
    for (const item of Array.isArray(top) ? top.slice(0, 10) : []) {
      const p = await wooGet(c, `products/${item.product_id}`);
      if (p?.stock_status === "outofstock") {
        signals.push({
          kind: "stockout",
          severity: "warning",
          title: `Bestseller out of stock: ${p.name}`,
          detail: `"${p.name}" sold ${item.quantity} this week and is now out of stock`,
          raw: { productId: p.id, name: p.name, soldThisWeek: item.quantity },
        });
      }
    }
  } catch { /* reports need sales; skip quietly on new stores */ }

  // 3) Failed / stuck orders (payment problems).
  try {
    const failed = await wooGet(c, "orders?status=failed&per_page=20");
    if (Array.isArray(failed) && failed.length > 0) {
      signals.push({
        kind: "orders_failing",
        severity: "critical",
        title: `${failed.length} failed order(s) detected`,
        detail: `Failed orders often mean a broken payment gateway or checkout`,
        raw: { count: failed.length, ids: failed.map((o: any) => o.id) },
      });
    }
  } catch { /* skip if orders scope missing */ }

  return signals;
}

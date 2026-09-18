// Dev probe: prove the engine authenticates to a live WooCommerce store and runs the pipeline.
// Run: (env from .env) npx tsx src/probe.ts
import { scanStore } from "./watchers/woo.js";
import { verify } from "./verify.js";

const cfg = {
  storeUrl: process.env.WOO_STORE_URL!,
  consumerKey: process.env.WOO_CONSUMER_KEY!,
  consumerSecret: process.env.WOO_CONSUMER_SECRET!,
};

// 1) Prove authenticated REST access.
const auth = "Basic " + Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");
const r = await fetch(`${cfg.storeUrl}/wp-json/wc/v3/products?per_page=3`, { headers: { Authorization: auth } });
console.log(`AUTH: GET /products -> HTTP ${r.status}`);
if (r.ok) {
  const products = await r.json();
  console.log("PRODUCTS(sample):", (products as any[]).map((p) => `${p.name} [${p.stock_status}]`).join(", "));
}

// 2) Run the watcher + verify pipeline.
const signals = await scanStore(cfg);
console.log(`\nSCAN: ${signals.length} raw signal(s)`);
for (const s of signals) {
  const v = await verify(s);
  console.log(`- ${s.kind} (${s.severity}) -> ${v ? "VERIFIED" : "dropped"} | ${s.title}`);
}
if (signals.length === 0) console.log("(store looks healthy right now — no issues to report)");

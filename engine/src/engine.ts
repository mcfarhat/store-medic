// The Watch -> Verify -> Approve loop. Scans stores on a cadence, verifies signals,
// records findings for the app to show. Nothing acts on the store without owner approval.
import cron from "node-cron";
import { scanStore } from "./watchers/woo.js";
import { verify } from "./verify.js";
import { addFinding, alreadyOpen, setStatus, type Finding } from "./store.js";

function wooConfig() {
  return {
    storeUrl: process.env.WOO_STORE_URL ?? "",
    consumerKey: process.env.WOO_CONSUMER_KEY ?? "",
    consumerSecret: process.env.WOO_CONSUMER_SECRET ?? "",
  };
}

export async function runCycle(storeId = "default"): Promise<Finding[]> {
  const cfg = wooConfig();
  if (!cfg.storeUrl) {
    console.warn("[engine] WOO_STORE_URL not set; skipping cycle");
    return [];
  }
  const created: Finding[] = [];
  const signals = await scanStore(cfg);
  for (const sig of signals) {
    if (alreadyOpen(storeId, sig.kind)) continue; // dedupe: don't re-alert an open problem
    const v = await verify(sig);
    if (!v) continue; // verify rejected it (false positive / recovered)
    created.push(addFinding({ storeId, ...v }));
  }
  console.log(`[engine] cycle for ${storeId}: ${signals.length} signals -> ${created.length} new findings`);
  return created;
}

// Approve = execute the suggested fix. In the scaffold we just transition state;
// real fix actions (toggle stock, clear cache, disable a plugin) are added per-kind.
export function approve(findingId: string): Finding | undefined {
  const f = setStatus(findingId, "approved");
  // TODO: dispatch the concrete fix action for f.kind, then mark resolved.
  return f;
}

export function startSchedule(cadence = "0 * * * *") {
  cron.schedule(cadence, () => void runCycle().catch((e) => console.error("[engine] cycle error", e)));
  console.log(`[engine] scheduled watch cycle: "${cadence}"`);
}

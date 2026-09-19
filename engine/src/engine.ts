// The Watch -> Verify -> Approve loop. Scans stores on a cadence, verifies signals,
// records findings for the app to show. Nothing acts on the store without owner approval.
import cron from "node-cron";
import { scanStore } from "./watchers/woo.js";
import { scanHealth } from "./watchers/wphealth.js";
import { scanUniversal } from "./universal.js";
import { verify } from "./verify.js";
import { applyFix } from "./fixes.js";
import { addFinding, alreadyOpen, getFinding, setStatus, type Finding } from "./store.js";

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
  const signals = [
    ...(await scanStore(cfg)),
    ...(await scanHealth(cfg)),
    ...(await scanUniversal(cfg.storeUrl)),
  ];
  for (const sig of signals) {
    if (alreadyOpen(storeId, sig.kind, sig.title)) continue;
    const v = await verify(sig);
    if (!v) continue;
    created.push(addFinding({ storeId, ...v, meta: sig.raw }));
  }
  console.log(`[engine] cycle for ${storeId}: ${signals.length} signals -> ${created.length} new findings`);
  return created;
}

// APPROVE: run the fix action for a finding. Marks "resolved" if actually applied,
// else "approved" (advisory recorded). Returns the updated finding incl. the fix outcome.
export async function approve(findingId: string): Promise<Finding | undefined> {
  const f = getFinding(findingId);
  if (!f) return undefined;
  const result = await applyFix(f);
  f.fix = result.message;
  setStatus(findingId, result.applied ? "resolved" : "approved");
  return f;
}

export function startSchedule(cadence = "0 * * * *") {
  cron.schedule(cadence, () => void runCycle().catch((e) => console.error("[engine] cycle error", e)));
  console.log(`[engine] scheduled watch cycle: "${cadence}"`);
}

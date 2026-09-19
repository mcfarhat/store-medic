// Store Medic engine API. Reads are open; mutating actions require the X-API-Key header.
import express from "express";
import { listFindings, setStatus } from "./store.js";
import { runCycle, approve, startSchedule } from "./engine.js";
import { buildStatus } from "./status.js";

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY || "";
function requireKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (API_KEY && req.get("x-api-key") !== API_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
}

function wooConfig() {
  return {
    storeUrl: process.env.WOO_STORE_URL ?? "",
    consumerKey: process.env.WOO_CONSUMER_KEY ?? "",
    consumerSecret: process.env.WOO_CONSUMER_SECRET ?? "",
  };
}

app.get("/health", (_req, res) => res.json({ ok: true }));

// Full store health snapshot (all checks, incl. the green ones) for the dashboard.
app.get("/status", async (_req, res) => {
  try {
    res.json(await buildStatus(wooConfig()));
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

app.get("/findings", (req, res) => {
  res.json(listFindings(req.query.storeId as string | undefined));
});

app.post("/scan", requireKey, async (req, res) => {
  const created = await runCycle((req.body?.storeId as string) ?? "default");
  res.json({ created });
});

app.post("/findings/:id/approve", requireKey, async (req, res) => {
  const f = await approve(req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  res.json(f);
});

app.post("/findings/:id/dismiss", requireKey, (req, res) => {
  const f = setStatus(req.params.id, "dismissed");
  if (!f) return res.status(404).json({ error: "not found" });
  res.json(f);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[engine] listening on :${port}`);
  startSchedule(process.env.WATCH_CRON ?? "0 * * * *");
});

// Store Medic engine API. The app polls these endpoints (push added later).
import express from "express";
import { listFindings, setStatus } from "./store.js";
import { runCycle, approve, startSchedule } from "./engine.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// List findings (optionally by store).
app.get("/findings", (req, res) => {
  res.json(listFindings(req.query.storeId as string | undefined));
});

// Trigger a scan on demand (also runs on the cron cadence).
app.post("/scan", async (req, res) => {
  const created = await runCycle((req.body?.storeId as string) ?? "default");
  res.json({ created });
});

// Owner approves the suggested fix.
app.post("/findings/:id/approve", (req, res) => {
  const f = approve(req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  res.json(f);
});

// Owner dismisses a finding.
app.post("/findings/:id/dismiss", (req, res) => {
  const f = setStatus(req.params.id, "dismissed");
  if (!f) return res.status(404).json({ error: "not found" });
  res.json(f);
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[engine] listening on :${port}`);
  startSchedule(process.env.WATCH_CRON ?? "0 * * * *");
});

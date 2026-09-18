// Minimal in-memory state for the scaffold. Swap for SQLite/Postgres later.
export type Severity = "info" | "warning" | "critical";
export type FindingStatus =
  | "open"
  | "awaiting_approval"
  | "approved"
  | "resolved"
  | "dismissed";

export interface Finding {
  id: string;
  storeId: string;
  kind: string; // e.g. "checkout_broken", "plugin_outdated", "stockout", "price_undercut"
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[]; // human-readable lines, incl. Tavily-cited sources
  suggestedFix?: string;
  status: FindingStatus;
  createdAt: string;
}

const findings = new Map<string, Finding>();
let seq = 1;

export function addFinding(f: Omit<Finding, "id" | "status" | "createdAt">): Finding {
  const id = `f${seq++}`;
  const rec: Finding = { ...f, id, status: "awaiting_approval", createdAt: new Date().toISOString() };
  findings.set(id, rec);
  return rec;
}

export function listFindings(storeId?: string): Finding[] {
  const all = [...findings.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return storeId ? all.filter((f) => f.storeId === storeId) : all;
}

export function setStatus(id: string, status: FindingStatus): Finding | undefined {
  const f = findings.get(id);
  if (f) f.status = status;
  return f;
}

// Dedupe key so we don't re-alert the same open problem every cycle.
export function alreadyOpen(storeId: string, kind: string): boolean {
  return [...findings.values()].some(
    (f) => f.storeId === storeId && f.kind === kind && f.status !== "resolved" && f.status !== "dismissed",
  );
}

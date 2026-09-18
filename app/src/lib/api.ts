// Thin client over the Store Medic engine API.
import Constants from "expo-constants";

const BASE = (Constants.expoConfig?.extra?.engineUrl as string) ?? "http://localhost:8787";

export type Severity = "info" | "warning" | "critical";
export interface Finding {
  id: string;
  storeId: string;
  kind: string;
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
  suggestedFix?: string;
  status: string;
  createdAt: string;
}

export async function getFindings(storeId?: string): Promise<Finding[]> {
  const q = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const res = await fetch(`${BASE}/findings${q}`);
  return res.json();
}

export async function approveFinding(id: string): Promise<Finding> {
  const res = await fetch(`${BASE}/findings/${id}/approve`, { method: "POST" });
  return res.json();
}

export async function dismissFinding(id: string): Promise<Finding> {
  const res = await fetch(`${BASE}/findings/${id}/dismiss`, { method: "POST" });
  return res.json();
}

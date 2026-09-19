// Thin client over the Store Medic engine API.
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const BASE = extra.engineUrl ?? "http://localhost:8787";
const API_KEY = extra.apiKey ?? "";

export type CheckStatus = "ok" | "warning" | "critical";
export interface Check {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
}
export interface StoreStatus {
  storeUrl: string;
  checkedAt: string;
  score: number;
  ok: number;
  total: number;
  checks: Check[];
}
export interface Finding {
  id: string;
  storeId: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  evidence: string[];
  suggestedFix?: string;
  fix?: string;
  status: string;
  createdAt: string;
}

function headers(withKey = false): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (withKey && API_KEY) h["X-API-Key"] = API_KEY;
  return h;
}

export async function getStatus(): Promise<StoreStatus> {
  const r = await fetch(`${BASE}/status`);
  return r.json();
}
export async function getFindings(): Promise<Finding[]> {
  const r = await fetch(`${BASE}/findings`);
  return r.json();
}
export async function approveFinding(id: string): Promise<Finding> {
  const r = await fetch(`${BASE}/findings/${id}/approve`, { method: "POST", headers: headers(true) });
  return r.json();
}
export async function dismissFinding(id: string): Promise<Finding> {
  const r = await fetch(`${BASE}/findings/${id}/dismiss`, { method: "POST", headers: headers(true) });
  return r.json();
}

// Store Medic dashboard: overall health score + a tile per monitored check (so the agent's
// breadth is visible even when healthy) + the findings feed with live Approve feedback.
import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet,
} from "react-native";
import {
  getStatus, getFindings, approveFinding, dismissFinding,
  type StoreStatus, type Finding, type CheckStatus,
} from "../lib/api";

const C = {
  bg: "#0B1220", card: "#111C31", line: "#1E2A44",
  text: "#FFFFFF", muted: "#93A4C0",
  ok: "#22C55E", warning: "#F59E0B", critical: "#EF4444", accent: "#2563EB",
};
const statusColor = (s: CheckStatus | Finding["severity"]) =>
  s === "ok" ? C.ok : s === "warning" ? C.warning : s === "info" ? C.accent : C.critical;

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function DashboardScreen({ onOpenPaywall }: { onOpenPaywall: () => void }) {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Record<string, string>>({}); // findingId -> "applying" | result msg

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, f] = await Promise.all([getStatus().catch(() => null), getFindings().catch(() => [])]);
      setStatus(s);
      setFindings(f.filter((x) => x.status === "awaiting_approval" || x.status === "open"));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onApprove = async (f: Finding) => {
    setBusy((b) => ({ ...b, [f.id]: "applying" }));
    try {
      const r = await approveFinding(f.id);
      setBusy((b) => ({ ...b, [f.id]: r.fix || "Done" }));
      setTimeout(load, 1500);
    } catch {
      setBusy((b) => ({ ...b, [f.id]: "Failed — try again" }));
    }
  };
  const onDismiss = async (f: Finding) => { await dismissFinding(f.id); void load(); };

  const host = status ? status.storeUrl.replace(/^https?:\/\//, "") : "";
  const score = status?.score ?? 100;
  const scoreColor = score >= 90 ? C.ok : score >= 70 ? C.warning : C.critical;
  const attention = findings.length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#fff" />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.h1}>Store Medic</Text>
          <Text style={styles.sub}>{host || "your store"}</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Agent active</Text>
        </View>
      </View>

      {/* Health score */}
      <View style={[styles.scoreCard, { borderColor: scoreColor }]}>
        <View>
          <Text style={styles.scoreLabel}>Store health</Text>
          <Text style={styles.scoreHint}>
            {attention === 0 ? "All systems healthy" : `${attention} item${attention > 1 ? "s" : ""} need attention`}
            {status ? ` · checked ${timeAgo(status.checkedAt)}` : ""}
          </Text>
        </View>
        <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}<Text style={styles.scorePct}>%</Text></Text>
      </View>

      {/* Check tiles */}
      <Text style={styles.section}>Monitors</Text>
      <View style={styles.tiles}>
        {(status?.checks ?? []).map((c) => (
          <View key={c.key} style={styles.tile}>
            <View style={styles.tileTop}>
              <View style={[styles.dot, { backgroundColor: statusColor(c.status) }]} />
              <Text style={styles.tileLabel}>{c.label}</Text>
            </View>
            <Text style={styles.tileDetail}>{c.detail}</Text>
          </View>
        ))}
        {!status && <ActivityIndicator color="#fff" style={{ margin: 20 }} />}
      </View>

      {/* Findings */}
      <Text style={styles.section}>Needs attention {attention ? `(${attention})` : ""}</Text>
      {attention === 0 && status && <Text style={styles.allClear}>✅ Nothing to fix right now. Your agent is watching.</Text>}
      {findings.map((f) => {
        const state = busy[f.id];
        return (
          <View key={f.id} style={styles.finding}>
            <View style={[styles.sevBar, { backgroundColor: statusColor(f.severity) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fTitle}>{f.title}</Text>
              <Text style={styles.fDetail}>{f.detail}</Text>
              {f.suggestedFix ? <Text style={styles.fFix}>Fix: {f.suggestedFix}</Text> : null}
              {state && state !== "applying" ? <Text style={styles.fResult}>✓ {state}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.btn, styles.approve, state === "applying" && { opacity: 0.6 }]}
                  disabled={state === "applying"}
                  onPress={() => onApprove(f)}
                >
                  {state === "applying"
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.btnText}>Approve fix</Text>}
                </Pressable>
                <Pressable style={[styles.btn, styles.dismiss]} onPress={() => onDismiss(f)}>
                  <Text style={styles.btnText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      {/* Pro upsell */}
      <Pressable style={styles.pro} onPress={onOpenPaywall}>
        <Text style={styles.proText}>⚡ Upgrade to Pro — watch every store, auto-fix, 5-min checks</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  h1: { color: C.text, fontSize: 28, fontWeight: "800" },
  sub: { color: C.muted, marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", backgroundColor: "#0E2A1C", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok, marginRight: 6 },
  liveText: { color: C.ok, fontSize: 12, fontWeight: "600" },
  scoreCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 16, borderLeftWidth: 4, padding: 18 },
  scoreLabel: { color: C.text, fontSize: 16, fontWeight: "700" },
  scoreHint: { color: C.muted, marginTop: 4, fontSize: 12, maxWidth: 220 },
  scoreNum: { fontSize: 44, fontWeight: "800" },
  scorePct: { fontSize: 20 },
  section: { color: C.muted, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", backgroundColor: C.card, borderRadius: 12, padding: 12 },
  tileTop: { flexDirection: "row", alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  tileLabel: { color: C.text, fontWeight: "600", flexShrink: 1 },
  tileDetail: { color: C.muted, fontSize: 12, marginTop: 6, marginLeft: 17 },
  allClear: { color: C.muted, backgroundColor: C.card, borderRadius: 12, padding: 16, overflow: "hidden" },
  finding: { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12 },
  sevBar: { width: 4, borderRadius: 2, marginRight: 12 },
  fTitle: { color: C.text, fontSize: 16, fontWeight: "700" },
  fDetail: { color: "#B9C6DD", marginTop: 4, fontSize: 13 },
  fFix: { color: "#7DD3FC", marginTop: 8, fontStyle: "italic", fontSize: 13 },
  fResult: { color: C.ok, marginTop: 8, fontWeight: "600" },
  row: { flexDirection: "row", marginTop: 12, gap: 10 },
  btn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, minWidth: 110, alignItems: "center" },
  approve: { backgroundColor: C.accent },
  dismiss: { backgroundColor: "#334155" },
  btnText: { color: "#fff", fontWeight: "700" },
  pro: { backgroundColor: "#1D2B4D", borderRadius: 14, padding: 16, marginTop: 28, alignItems: "center", borderWidth: 1, borderColor: C.accent },
  proText: { color: "#DCE6F5", fontWeight: "600", textAlign: "center" },
});

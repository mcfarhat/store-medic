// The main feed: findings the agent caught, newest first, with one-tap approve.
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { getFindings, approveFinding, dismissFinding, type Finding } from "../lib/api";

const SEV_COLOR: Record<string, string> = { critical: "#EF4444", warning: "#F59E0B", info: "#38BDF8" };

export default function StoreHealthScreen() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setFindings(await getFindings()); } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onApprove = async (id: string) => { await approveFinding(id); void load(); };
  const onDismiss = async (id: string) => { await dismissFinding(id); void load(); };

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Store Medic</Text>
      <Text style={styles.sub}>Your agent is watching. Approve a fix when it catches something.</Text>
      <FlatList
        data={findings}
        keyExtractor={(f) => f.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#fff" />}
        ListEmptyComponent={<Text style={styles.empty}>All clear — no issues right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.dot, { backgroundColor: SEV_COLOR[item.severity] ?? "#888" }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
              {item.suggestedFix ? <Text style={styles.fix}>Fix: {item.suggestedFix}</Text> : null}
              <View style={styles.row}>
                <Pressable style={[styles.btn, styles.approve]} onPress={() => onApprove(item.id)}>
                  <Text style={styles.btnText}>Approve fix</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.dismiss]} onPress={() => onDismiss(item.id)}>
                  <Text style={styles.btnText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220", paddingTop: 64, paddingHorizontal: 16 },
  h1: { color: "#fff", fontSize: 28, fontWeight: "700" },
  sub: { color: "#93A4C0", marginTop: 4, marginBottom: 16 },
  empty: { color: "#93A4C0", textAlign: "center", marginTop: 48 },
  card: { flexDirection: "row", backgroundColor: "#111C31", borderRadius: 14, padding: 14, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginRight: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  detail: { color: "#B9C6DD", marginTop: 4 },
  fix: { color: "#7DD3FC", marginTop: 8, fontStyle: "italic" },
  row: { flexDirection: "row", marginTop: 12, gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  approve: { backgroundColor: "#2563EB" },
  dismiss: { backgroundColor: "#334155" },
  btnText: { color: "#fff", fontWeight: "600" },
});

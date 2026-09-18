// RevenueCat paywall for Store Medic Pro. Rendered when a free user hits a Pro gate
// (2nd store, faster cadence, auto-fix). Packages/prices come from the current offering.
import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { getProOffering, purchase } from "../lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

const PRO_PERKS = [
  "Watch unlimited stores",
  "Checks every 5 minutes (vs hourly)",
  "One-tap auto-fix actions",
  "Priority + push alerts",
];

export default function PaywallScreen({ onDone }: { onDone: (isPro: boolean) => void }) {
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const offering = await getProOffering();
      setPkgs(offering?.availablePackages ?? []);
    })();
  }, []);

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    try { onDone(await purchase(pkg)); } finally { setBusy(false); }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Store Medic Pro</Text>
      <Text style={styles.sub}>Never miss a problem. Let your agent fix it the moment it happens.</Text>
      {PRO_PERKS.map((p) => (
        <Text key={p} style={styles.perk}>• {p}</Text>
      ))}
      {busy ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#fff" />
      ) : (
        pkgs.map((pkg) => (
          <Pressable key={pkg.identifier} style={styles.cta} onPress={() => buy(pkg)}>
            <Text style={styles.ctaText}>{pkg.product.title} — {pkg.product.priceString}</Text>
          </Pressable>
        ))
      )}
      <Pressable onPress={() => onDone(false)}><Text style={styles.later}>Maybe later</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220", padding: 24, justifyContent: "center" },
  h1: { color: "#fff", fontSize: 30, fontWeight: "800" },
  sub: { color: "#93A4C0", marginTop: 8, marginBottom: 20 },
  perk: { color: "#DCE6F5", fontSize: 16, marginVertical: 4 },
  cta: { backgroundColor: "#2563EB", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  later: { color: "#64748B", textAlign: "center", marginTop: 16 },
});

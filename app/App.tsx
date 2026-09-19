// App entry: init RevenueCat, show the dashboard, gate Pro behind the paywall.
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import DashboardScreen from "./src/screens/DashboardScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import { initRevenueCat, isPro } from "./src/lib/revenuecat";

export default function App() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initRevenueCat();
    isPro().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      {showPaywall ? (
        <PaywallScreen onDone={() => setShowPaywall(false)} />
      ) : (
        <DashboardScreen onOpenPaywall={() => setShowPaywall(true)} />
      )}
    </>
  );
}

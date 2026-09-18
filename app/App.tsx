// App entry: init RevenueCat, show the store-health feed, and gate Pro behind the paywall.
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import StoreHealthScreen from "./src/screens/StoreHealthScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import { initRevenueCat, isPro } from "./src/lib/revenuecat";

export default function App() {
  const [showPaywall, setShowPaywall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initRevenueCat();
    // Free users can use 1 store; the paywall is shown when they hit a Pro gate.
    // Here we just resolve initial entitlement state.
    isPro().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      {showPaywall ? (
        <PaywallScreen onDone={() => setShowPaywall(false)} />
      ) : (
        <StoreHealthScreen />
      )}
    </>
  );
}

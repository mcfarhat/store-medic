// RevenueCat integration. Gates "Pro" (multi-store, faster cadence, auto-fix, priority alerts).
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";

const PRO_ENTITLEMENT = "pro";

export function initRevenueCat(): void {
  const extra = Constants.expoConfig?.extra ?? {};
  const apiKey = Platform.select({
    android: extra.revenueCatApiKeyAndroid as string,
    ios: extra.revenueCatApiKeyIos as string,
  });
  if (apiKey && apiKey !== "REPLACE") Purchases.configure({ apiKey });
}

export async function isPro(): Promise<boolean> {
  try {
    const info: CustomerInfo = await Purchases.getCustomerInfo();
    return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

// Fetch the current offering so PaywallScreen can render packages/prices.
export async function getProOffering() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchase(pkg: Parameters<typeof Purchases.purchasePackage>[0]) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

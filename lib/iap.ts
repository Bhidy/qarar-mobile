/**
 * In-app purchase (RevenueCat) — SmartSignals.
 *
 * Wired to react-native-purchases. The SDK public key is the RevenueCat "Test
 * Store" sandbox key for now (EXPO_PUBLIC_REVENUECAT_*); swap to appl_/goog_ keys
 * once App Store + Play apps are added in RevenueCat. Calls are guarded so the app
 * still runs on a binary that predates the native module (activates after rebuild).
 *
 * Mapping: configureIap is called with the Supabase user id as appUserID, and
 * iapLogIn(userId) keeps RevenueCat's app_user_id == auth.users.id — so the
 * RevenueCat webhook (/api/webhooks/revenuecat) writes the shared entitlement to
 * the right user.
 */
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { SUBSCRIPTIONS_ENABLED } from "@/constants/config";

const IOS_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || "").trim();
const ANDROID_KEY = (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || "").trim();
const RAW_KEY = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;

// ── Safety guard: a payments-SDK key must NEVER crash the app ─────────────────
// RevenueCat v10 FORCE-CLOSES any non-debug build (TestFlight / App Store) the
// instant Purchases.configure() is called with a "test_" Test-Store key — it shows
// a "Wrong API Key" dialog and quits the app. That is unacceptable: a payment-
// provider misconfiguration must degrade gracefully, never take down the whole app.
//
// So in a RELEASE build we REFUSE a test_ key → IAP runs as "unavailable". Premium
// still flows through the unified web/Paymob entitlement (read via /billing/status),
// and the paywall already shows a friendly "being enabled" state. A real
// appl_/goog_ PRODUCTION key activates native IAP normally. In DEV (__DEV__) the
// test_ key is allowed so local StoreKit-sandbox testing keeps working.
const IS_TEST_KEY = /^test_/i.test(RAW_KEY);
export const IAP_BLOCKED_TEST_KEY = !__DEV__ && IS_TEST_KEY; // surfaced for QA/diagnostics

// ── MASTER SWITCH ────────────────────────────────────────────────────────────
// While the paid model is OFF (constants/config → SUBSCRIPTIONS_ENABLED=false),
// the RevenueCat SDK is NEVER configured and no purchase can run — regardless of
// whether a production key is present in the build env. Flipping SUBSCRIPTIONS_
// ENABLED on (a deliberate CODE change) is the ONLY way to activate in-app
// purchases. This makes "do not activate until the owner confirms" a code-level
// guarantee, not an env-config convention that a stray key could trip.
const KEY = !SUBSCRIPTIONS_ENABLED || IAP_BLOCKED_TEST_KEY ? "" : RAW_KEY;
export const IAP_AVAILABLE = !!KEY;

let configured = false;

export function configureIap(appUserId?: string): void {
  if (configured || !KEY) {
    if (IAP_BLOCKED_TEST_KEY) {
      // Loud, non-fatal: this is exactly what would otherwise have crashed the app.
      console.warn(
        "[iap] RevenueCat test_ key blocked in a release build → native IAP DISABLED " +
        "(premium via web/Paymob). Set a production appl_/goog_ key to enable in-app purchases.",
      );
    }
    return;
  }
  try {
    Purchases.configure({ apiKey: KEY, appUserID: appUserId });
    configured = true;
  } catch (e) {
    // Native module absent (older binary) — IAP simply stays unavailable.
    console.log("[iap] configure skipped:", (e as any)?.message ?? e);
  }
}

export async function iapLogIn(userId: string): Promise<void> {
  if (!configured) return;
  try { await Purchases.logIn(userId); } catch (e) { console.log("[iap] logIn:", (e as any)?.message ?? e); }
}

export async function iapLogOut(): Promise<void> {
  if (!configured) return;
  try { await Purchases.logOut(); } catch { /* ignore */ }
}

export async function purchasePremium(
  productId: "premium_monthly" | "premium_annual",
): Promise<{ ok: boolean; available: boolean }> {
  if (!configured || !KEY) return { ok: false, available: false };
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const pkg =
      pkgs.find((p) => p.product.identifier.includes(productId) || p.identifier.includes(productId)) ??
      (productId === "premium_annual" ? pkgs.find((p) => /year|annual/i.test(p.packageType)) : pkgs.find((p) => /month/i.test(p.packageType))) ??
      pkgs[0];
    if (!pkg) return { ok: false, available: true }; // SDK works but no offering configured yet
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { ok: !!customerInfo.entitlements.active["premium"], available: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, available: true };
    console.log("[iap] purchase error:", e?.message ?? e);
    return { ok: false, available: true };
  }
}

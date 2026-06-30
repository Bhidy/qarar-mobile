/**
 * App-wide product configuration flags.
 *
 * SUBSCRIPTIONS_ENABLED — master switch for the paid subscription / payment model.
 *
 *   false (current):  the app is a fully-FREE product. Every registered user is
 *                     treated as top-tier ("pro"), so ALL content — research reports,
 *                     analyst calls, technical articles, portfolios — is open with no
 *                     restrictions. Every payment / paywall / subscription surface is
 *                     HIDDEN: no "Premium" lock, no "Subscribe", no "Manage Subscription",
 *                     no PRO badge, no upsell. The user never learns a paid tier exists.
 *
 *   true  (later):    the subscription model is LIVE. Real entitlement decides access
 *                     (web/Paymob + native RevenueCat), paywalls re-appear, and the
 *                     Subscribe flow + PRO badge show again.
 *
 * Nothing about the subscription system is deleted when this is false — subscribe.tsx,
 * lib/iap.ts, the paywall, the payments schema and RevenueCat wiring all remain intact
 * and dormant. Flipping this single flag to `true` re-activates the entire model with
 * no feature rebuild. Keep all gating expressed as `subscriptionsEnabled && <real check>`.
 */
export const SUBSCRIPTIONS_ENABLED = false;

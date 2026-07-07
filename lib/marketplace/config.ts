/**
 * Analyst Marketplace (mobile) — feature flag.
 *
 * Frontend-only demo, mirroring the web marketplace. Everything is mock +
 * AsyncStorage; no real payment/entitlement. MARKETPLACE_ENABLED gates the
 * discreet entry point in the Profile screen (the routes always exist). Kept
 * OFF by default — flip to `true` to surface it for preview, exactly like the
 * web SHOW_MARKETPLACE pattern.
 */
export const MARKETPLACE_ENABLED = false;

/**
 * Analyst Marketplace route group. The whole feature is a flag-gated demo — when
 * MARKETPLACE_ENABLED is false (the shipped default) EVERY marketplace route
 * (including any deep link like rumblepro://marketplace/checkout) redirects
 * straight to the app, so no subscription/pricing screen is ever reachable. This
 * keeps the app unambiguously free for App Store review while preserving the code
 * for a future flip.
 */
import { Redirect, Stack } from "expo-router";
import { MARKETPLACE_ENABLED } from "@/lib/marketplace/config";

export default function MarketplaceLayout() {
  if (!MARKETPLACE_ENABLED) return <Redirect href="/tabs" />;
  return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}

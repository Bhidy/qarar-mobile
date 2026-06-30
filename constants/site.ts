// Canonical web base URL for in-app links (research PDF fallback, "view full
// report"). EXPO_PUBLIC_* is inlined at BUILD time, so changing the domain still
// requires a new EAS build — but this is the single edit point. Fallback = prod domain.
export const WEB_BASE =
  (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") || "https://mubashersignals.com";

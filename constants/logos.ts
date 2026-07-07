// Company logos are served remotely from our own CDN (mubashersignals.com/logos/)
// via TickerLogo → LOGO_SET manifest, NOT bundled in the app binary. Previously
// 16 EGX blue-chip SVGs were embedded here; they carried third-party attribution
// and are now fetched at runtime instead (verified present on the CDN), which
// removes any bundled third-party logo art from the shipped app. Kept as an
// (empty) escape hatch so a logo can be hard-bundled again if ever needed offline.
export const EGX_LOGOS: Record<string, string> = {};

export function getLogoSvg(ticker: string): string | undefined {
  return EGX_LOGOS[ticker.toUpperCase()];
}

/**
 * Typography constants for SmartSignals mobile.
 *
 * English  → Manrope (body/UI)  |  Sora (display/headings)
 * Arabic   → IBM Plex Sans Arabic
 */

// ── Font family string constants ──────────────────────────────────────────────
export const FontFamily = {
  // Manrope — English body / UI
  Manrope: {
    "400": "Manrope_400Regular",
    "500": "Manrope_500Medium",
    "600": "Manrope_600SemiBold",
    "700": "Manrope_700Bold",
    "800": "Manrope_800ExtraBold",
  },
  // Sora — English display / headings
  Sora: {
    "400": "Sora_400Regular",
    "600": "Sora_600SemiBold",
    "700": "Sora_700Bold",
    "800": "Sora_800ExtraBold",
  },
  // IBM Plex Sans Arabic — Arabic / RTL
  Arabic: {
    "400": "IBMPlexSansArabic_400Regular",
    "500": "IBMPlexSansArabic_500Medium",
    "600": "IBMPlexSansArabic_600SemiBold",
    "700": "IBMPlexSansArabic_700Bold",
    "800": "IBMPlexSansArabic_700Bold", // 700 is max — map 800 to 700
  },
} as const;

type EnWeight  = keyof typeof FontFamily.Manrope;
type ArWeight  = keyof typeof FontFamily.Arabic;
type AnyWeight = "400" | "500" | "600" | "700" | "800";

/**
 * Returns the correct fontFamily string based on language and weight.
 * Use as a drop-in replacement for the old Cairo helper in every screen.
 *
 * @param isAr   - true when app language is Arabic
 * @param weight - CSS-style weight string
 */
export function fontFamilyFor(isAr: boolean, weight: AnyWeight): string {
  if (isAr) {
    return FontFamily.Arabic[weight as ArWeight] ?? FontFamily.Arabic["400"];
  }
  return FontFamily.Manrope[weight as EnWeight] ?? FontFamily.Manrope["400"];
}

/**
 * Returns Sora font family for English display/heading text.
 * Always falls back to Manrope for Arabic (Sora has no Arabic glyphs).
 */
export function displayFontFor(isAr: boolean, weight: AnyWeight): string {
  if (isAr) {
    return FontFamily.Arabic[weight as ArWeight] ?? FontFamily.Arabic["400"];
  }
  return FontFamily.Sora[weight as keyof typeof FontFamily.Sora] ?? FontFamily.Sora["400"];
}

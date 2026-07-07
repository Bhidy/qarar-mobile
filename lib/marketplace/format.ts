/**
 * Analyst Marketplace (mobile) — display helpers. Pure functions; language via an
 * `isAr` boolean (mirrors the app's inline-bilingual convention).
 */
import type { AnalystProfile, AnalystType, LanguageCapability, MarketId, SignalCoverage } from "./types";
import type { AccentKey } from "./bundles";

// ── Money (mobile demo bills in USD) ─────────────────────────────────────────
export function formatUSD(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
export function formatCompact(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`;
  }
  return `${n}`;
}

// ── Labels ───────────────────────────────────────────────────────────────────
export function marketExchange(m: MarketId): string {
  return m === "egypt" ? "EGX" : m === "saudi" ? "Tadawul" : "US";
}
export function marketLabel(m: MarketId, isAr: boolean): string {
  if (m === "egypt") return isAr ? "مصر" : "Egypt";
  if (m === "saudi") return isAr ? "السعودية" : "Saudi Arabia";
  return isAr ? "الولايات المتحدة" : "USA";
}
export function coverageLabel(c: SignalCoverage, isAr: boolean): string {
  if (c === "fundamental") return isAr ? "أساسي" : "Fundamental";
  if (c === "technical") return isAr ? "فني" : "Technical";
  return isAr ? "أساسي وفني" : "Fundamental & Technical";
}
export function languageLabel(langs: LanguageCapability[], isAr: boolean): string {
  const bilingual = langs.includes("ar") && langs.includes("en");
  if (bilingual) return isAr ? "ثنائي اللغة" : "Bilingual";
  if (langs.includes("ar")) return isAr ? "العربية" : "Arabic";
  return isAr ? "الإنجليزية" : "English";
}
export function analystTypeLabel(t: AnalystType, isAr: boolean): string {
  return t === "mubasher" ? (isAr ? "محلل مباشر" : "Mubasher Analyst") : (isAr ? "محلل مستقل" : "Public Analyst");
}

// ── Bilingual field pickers ──────────────────────────────────────────────────
export const analystName = (a: AnalystProfile, isAr: boolean) => (isAr && a.nameAr ? a.nameAr : a.name);
export const analystRole = (a: AnalystProfile, isAr: boolean) => (isAr && a.roleAr ? a.roleAr : a.role);
export const analystBio = (a: AnalystProfile, isAr: boolean) => (isAr && a.bioAr ? a.bioAr : a.bio);
export const analystCountry = (a: AnalystProfile, isAr: boolean) => (isAr && a.countryAr ? a.countryAr : a.country);
export const analystSpecialties = (a: AnalystProfile, isAr: boolean) =>
  isAr && a.specialtiesAr?.length ? a.specialtiesAr : a.specialties;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

// ── Color utilities ──────────────────────────────────────────────────────────
/** Semi-transparent tint from a #RRGGBB hex — for soft backgrounds in both themes. */
export function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ColorSet = ReturnType<typeof import("@/context/ThemeContext")["useColors"]>;

export interface ResolvedAccent {
  main: string;
  soft: string;
  ink: string;
}
/** Resolve a bundle's accent KEY to theme-aware colors. */
export function bundleAccent(C: ColorSet, key: AccentKey): ResolvedAccent {
  if (key === "plum") return { main: C.accent.plum, soft: C.accent.plumSoft, ink: C.accent.plum };
  if (key === "gold") return { main: C.accent.gold, soft: tint(C.accent.gold, 0.16), ink: C.accent.gold };
  return { main: C.accent.teal, soft: tint(C.accent.teal, 0.16), ink: C.accent.teal };
}

/** Deterministic avatar background from an id, using brand accents. */
export function avatarColor(C: ColorSet, id: string): string {
  const palette = [C.primary, C.accent.teal, C.accent.gold, C.accent.plum, C.accent.terracotta];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

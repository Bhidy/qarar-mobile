/**
 * Analyst Marketplace (mobile) — SUBSCRIPTION BUNDLES.
 *
 * Single source of truth for the three tiers + the feature-comparison matrix,
 * mirroring web/lib/marketplace/bundles.ts. Pure data + helpers (no hooks). Icon
 * fields are Ionicons glyph names; `accent` is a token KEY resolved to colors at
 * render time (see bundleAccent in format.ts). Analyst content is Fundamental &
 * Technical signals ONLY — every other perk is a platform-automated feature.
 */
import type { Ionicons } from "@expo/vector-icons";
import { ANALYSTS } from "./data";

export type BundleId = "starter" | "pro" | "elite";
export type AccentKey = "teal" | "gold" | "plum";
export type IconName = keyof typeof Ionicons.glyphMap;

export const BUNDLE_ORDER: BundleId[] = ["starter", "pro", "elite"];

export type FeatureValue = boolean | { en: string; ar: string };

export interface FeatureRow {
  key: string;
  icon: IconName;
  en: string;
  ar: string;
  values: Record<BundleId, FeatureValue>;
}

export interface Bundle {
  id: BundleId;
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  priceUSD: number;
  slots: number | null; // null = unlimited (all analysts)
  highlighted?: boolean;
  accent: AccentKey;
  icon: IconName;
}

export const BUNDLES: Bundle[] = [
  {
    id: "starter",
    nameEn: "Starter", nameAr: "الأساسية",
    taglineEn: "For the focused investor", taglineAr: "للمستثمر المُركّز",
    priceUSD: 29, slots: 3, accent: "teal", icon: "sparkles-outline",
  },
  {
    id: "pro",
    nameEn: "Pro", nameAr: "الاحترافية",
    taglineEn: "For the active trader", taglineAr: "للمتداول النشط",
    priceUSD: 59, slots: 6, highlighted: true, accent: "gold", icon: "sparkles-outline",
  },
  {
    id: "elite",
    nameEn: "Elite", nameAr: "النخبة",
    taglineEn: "The complete desk", taglineAr: "المكتب الكامل",
    priceUSD: 99, slots: null, accent: "plum", icon: "ribbon-outline",
  },
];

export const FEATURE_MATRIX: FeatureRow[] = [
  { key: "slots", icon: "people-outline", en: "Analyst picks", ar: "اختيار المحللين",
    values: { starter: { en: "3 analysts", ar: "٣ محللين" }, pro: { en: "6 analysts", ar: "٦ محللين" }, elite: { en: "All analysts", ar: "كل المحللين" } } },
  { key: "signals", icon: "trending-up-outline", en: "Fundamental & Technical signals", ar: "الإشارات الأساسية والفنية",
    values: { starter: true, pro: true, elite: true } },
  { key: "push", icon: "notifications-outline", en: "Real-time signal alerts", ar: "تنبيهات فورية للإشارات",
    values: { starter: true, pro: true, elite: true } },
  { key: "targets", icon: "flag-outline", en: "Target & stop-loss hit alerts", ar: "تنبيهات بلوغ الهدف ووقف الخسارة",
    values: { starter: true, pro: true, elite: true } },
  { key: "swap", icon: "swap-horizontal-outline", en: "Change your analysts", ar: "تغيير محلليك",
    values: { starter: { en: "Monthly", ar: "شهريًا" }, pro: { en: "Weekly", ar: "أسبوعيًا" }, elite: { en: "Anytime", ar: "في أي وقت" } } },
  { key: "email", icon: "mail-outline", en: "Email alerts & weekly digest", ar: "تنبيهات بريدية وملخص أسبوعي",
    values: { starter: false, pro: true, elite: true } },
  { key: "news", icon: "newspaper-outline", en: "Intraday news & announcements", ar: "أخبار وإفصاحات خلال اليوم",
    values: { starter: false, pro: true, elite: true } },
  { key: "markets", icon: "globe-outline", en: "Markets covered", ar: "الأسواق المغطّاة",
    values: { starter: { en: "Single market", ar: "سوق واحد" }, pro: { en: "All markets", ar: "كل الأسواق" }, elite: { en: "All markets", ar: "كل الأسواق" } } },
  { key: "early", icon: "flash-outline", en: "Early signal access", ar: "وصول مبكر للإشارات",
    values: { starter: false, pro: false, elite: true } },
  { key: "exclusive", icon: "star-outline", en: "Exclusive premium news feed", ar: "موجز الأخبار الحصري",
    values: { starter: false, pro: false, elite: true } },
  { key: "support", icon: "help-buoy-outline", en: "Priority support", ar: "دعم ذو أولوية",
    values: { starter: false, pro: false, elite: true } },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const truthy = (v: FeatureValue): boolean => v === true || typeof v === "object";

export function bundleById(id: string | null | undefined): Bundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}
export function isUnlimited(b: Bundle): boolean {
  return b.slots === null;
}
export function slotCountOf(b: Bundle): number {
  return b.slots ?? ANALYSTS.length;
}
export function slotLabel(b: Bundle, isAr: boolean): string {
  if (isUnlimited(b)) return isAr ? "كل المحللين" : "All analysts";
  const n = b.slots as number;
  return isAr ? `${n} محللين` : `${n} analyst${n === 1 ? "" : "s"}`;
}
export function smallestBundleFor(count: number): Bundle {
  return BUNDLES.find((b) => count <= slotCountOf(b)) ?? BUNDLES[BUNDLES.length - 1];
}

export interface BundlePerk {
  key: string;
  icon: IconName;
  en: string;
  ar: string;
  value?: { en: string; ar: string };
}

export function bundlePerks(id: BundleId): BundlePerk[] {
  return FEATURE_MATRIX.filter((row) => truthy(row.values[id])).map((row) => {
    const v = row.values[id];
    return { key: row.key, icon: row.icon, en: row.en, ar: row.ar, value: typeof v === "object" ? v : undefined };
  });
}

/**
 * Analyst Marketplace (mobile) — type contracts. Mirrors the web marketplace
 * shape so a Phase-2 backend can serve both apps from one schema.
 */
import type { AppMarket } from "@/context/ThemeContext";

export type MarketId = AppMarket;
export type LanguageCapability = "ar" | "en";
export type AnalystType = "mubasher" | "public";
export type SignalCoverage = "fundamental" | "technical" | "both";
export type SignalName = "Buy" | "Invest" | "Hold" | "Sell" | "Take Profit";

export interface AnalystMetrics {
  publishedSignals: number;
  successRate: number;
  avgReturn: number;
  activeSignals: number;
  closedSignals: number;
  subscribers: number;
}

export interface AnalystSignalPreview {
  id: string;
  ticker: string;
  company: string;
  companyAr?: string;
  signal: SignalName;
  kind: "fundamental" | "technical";
  status: "active" | "closed";
  market: MarketId;
  date: string;
  returnPct?: number | null;
}

export interface AnalystProfile {
  id: string;
  slug: string;
  name: string;
  nameAr?: string;
  role: string;
  roleAr?: string;
  bio: string;
  bioAr?: string;
  country: string;
  countryAr?: string;
  countryFlag: string;
  market: MarketId;
  languages: LanguageCapability[];
  analystType: AnalystType;
  coverage: SignalCoverage;
  specialties: string[];
  specialtiesAr?: string[];
  metrics: AnalystMetrics;
  verified: boolean;
  recommended: boolean;
  latestSignals: AnalystSignalPreview[];
}

/**
 * useData — universal data hook for the SmartSignals mobile app.
 *
 * Fetches all content from Supabase (written by the admin panel) and returns
 * it in the exact same shape as /constants/data.ts and /constants/saudi-data.ts,
 * so all existing screens work with a one-line import change.
 *
 * Falls back gracefully to static constants when Supabase is not configured
 * or unavailable. Polls every 30 seconds to pick up admin edits in real time.
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { supabasePublic, isSupabaseReady } from "@/lib/supabase";
import { buildIndexMap, indexReturnPct, type IndexMap } from "@/lib/performance";
import type { IndexUpdate } from "@/constants/index-catalog";

// Rolling window (days) of daily index bars pulled for live benchmark computation.
// PostgREST hard-caps a single response at 1000 rows, so a combined `.in([...])` query
// returns only the OLDEST bars (2018–2020) and 2025/26 calls fall out of coverage (then
// fall back to the stored nightly benchmark). Per-ticker windowed keeps each query under
// the cap. Kept in sync with web/app/api/feed's INDEX_BARS_WINDOW_DAYS (~3.3yr).
const INDEX_BARS_WINDOW_DAYS = 1200;

// Override the stored benchmark with the index return over the call's holding period
// (initiatedDate → now active / → closedDate closed) so EGX30/TASI is tied to the
// initiation date (#1). Keeps the stored value when the index isn't covered yet.
function applyBenchmark<T extends Record<string, any>>(
  arr: T[], indexMap: IndexMap, market: "egypt" | "saudi" | "usa",
): T[] {
  const bench = market === "usa" ? "SPX" : market === "saudi" ? "TASI" : "EGX30";
  return arr.map((c) => {
    const from = (c as any).initiatedDate ?? (c as any).date;
    const to = String((c as any).status ?? "active") === "closed" ? (c as any).closedDate : undefined;
    const pct = indexReturnPct(indexMap, bench, from, to);
    // USA: no live S&P 500 feed yet (Phase 2) → indexReturnPct is null, keep the
    // admin-entered sp500 as an honest pass-through.
    if (pct == null) return c;
    // Set every benchmark field so getBenchmarkReturn is deterministic (audit M-1/M-2).
    if (market === "usa") return { ...c, sp500: pct };
    return market === "saudi" ? { ...c, tadawul: pct } : { ...c, egx30: pct, egx30Capped: pct };
  });
}

import { MARKETS_ENABLED } from "@/context/ThemeContext";

// ── Market lock (frontend-only, reversible) ──────────────────────────────────
// SINGLE chokepoint: empty out every disabled-market dataset before it reaches
// any screen. This guarantees Egypt-only content app-wide — lists, search,
// "related" sections, and even deep-linked detail pages cannot surface Saudi/USA
// data while those markets are disabled. Re-enabling a market in MARKETS_ENABLED
// instantly restores its data everywhere. Belt-and-suspenders with the market
// clamp in ThemeContext (which already forces the *view* to Egypt).
function lockMarkets<T extends Record<string, any>>(d: T): T {
  const SAUDI_ON = MARKETS_ENABLED.includes("saudi" as any);
  const USA_ON   = MARKETS_ENABLED.includes("usa" as any);
  if (SAUDI_ON && USA_ON) return d;
  return {
    ...d,
    SAUDI_FUNDAMENTAL: SAUDI_ON ? d.SAUDI_FUNDAMENTAL : [],
    SAUDI_TECHNICAL:   SAUDI_ON ? d.SAUDI_TECHNICAL   : [],
    SAUDI_NEWS:        SAUDI_ON ? d.SAUDI_NEWS        : [],
    SAUDI_ARTICLES:    SAUDI_ON ? d.SAUDI_ARTICLES    : [],
    USA_FUNDAMENTAL:   USA_ON   ? d.USA_FUNDAMENTAL   : [],
    USA_TECHNICAL:     USA_ON   ? d.USA_TECHNICAL     : [],
    USA_NEWS:          USA_ON   ? d.USA_NEWS          : [],
    USA_ARTICLES:      USA_ON   ? d.USA_ARTICLES      : [],
  };
}

// ── Static fallback data ─────────────────────────────────────────────────────
import {
  ARTICLES     as STATIC_ARTICLES,
  FUNDAMENTAL_CALLS as STATIC_FUND,
  TECHNICAL_CALLS   as STATIC_TECH,
  NEWS         as STATIC_NEWS,
  PORTFOLIOS   as STATIC_PORTFOLIOS,
  NOTIFICATIONS as STATIC_NOTIFICATIONS,
  type Article,
  type FundamentalCall,
  type TechnicalCall,
  type TechnicalArticle,
  type Notification,
} from "@/constants/data";

import {
  SAUDI_FUNDAMENTAL as STATIC_SAUDI_FUND,
  SAUDI_TECHNICAL   as STATIC_SAUDI_TECH,
  SAUDI_NEWS        as STATIC_SAUDI_NEWS,
  SAUDI_ARTICLES    as STATIC_SAUDI_ARTICLES,
  type SaudiStock,
  type SaudiTechnical,
} from "@/constants/saudi-data";

import {
  USA_FUNDAMENTAL as STATIC_USA_FUND,
  USA_TECHNICAL   as STATIC_USA_TECH,
  USA_NEWS        as STATIC_USA_NEWS,
  USA_ARTICLES    as STATIC_USA_ARTICLES,
  type UsaStock,
  type UsaTechnical,
} from "@/constants/usa-data";

// ── Return type ───────────────────────────────────────────────────────────────
interface AppData {
  ARTICLES:          Article[];
  FUNDAMENTAL_CALLS: FundamentalCall[];
  TECHNICAL_CALLS:   TechnicalCall[];
  TECHNICAL_ARTICLES: TechnicalArticle[];
  INDEX_UPDATES: IndexUpdate[];
  NEWS:              typeof STATIC_NEWS;
  PORTFOLIOS:        typeof STATIC_PORTFOLIOS;
  NOTIFICATIONS:     Notification[];
  SAUDI_FUNDAMENTAL: SaudiStock[];
  SAUDI_TECHNICAL:   SaudiTechnical[];
  SAUDI_NEWS:        typeof STATIC_SAUDI_NEWS;
  SAUDI_ARTICLES:    Article[];
  USA_FUNDAMENTAL:   UsaStock[];
  USA_TECHNICAL:     UsaTechnical[];
  USA_NEWS:          typeof STATIC_USA_NEWS;
  USA_ARTICLES:      Article[];
  // Mubasher live feeds (real EGX) — keyed by UPPERCASE ticker; empty until cron populates.
  PRICES:            Record<string, any>;
  COMPANIES:         Record<string, any>;
  RESEARCH_DOCS:     any[];
  loading:           boolean;
  /** Manual refetch for pull-to-refresh. */
  refetch:           () => Promise<void>;
  /** Mark a notification read locally (durable across restarts) + best-effort server. */
  markNotificationRead: (id: string | number) => Promise<void>;
  /** Mark ALL current notifications read; clears the OS badge + delivered notifications. */
  markAllNotificationsRead: () => Promise<void>;
}

// A report's `ticker` may hold MULTIPLE symbols (comma/space separated, e.g.
// "ABUK, COMI") for multi-stock reports authored on the web. The mobile app uses the
// FIRST symbol as the primary stock (logo + /stock link) so a multi-ticker report never
// renders a broken "ABUK,COMI" symbol here.
function primaryTicker(v: any): string | undefined {
  if (!v) return undefined;
  const first = String(v).split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean)[0];
  return first || undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function arr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return [String(val)];
}

// Tolerant market match (egypt view includes "both" + missing market), so admin
// content is never silently filtered out — mirrors the web DataContext.
function inMarket(r: any, market: "egypt" | "saudi" | "usa"): boolean {
  const m = r?.market;
  if (m === "commodities") return true; // commodities are cross-market, visible in all views
  if (market === "egypt") return !m || m === "egypt" || m === "both";
  if (market === "usa") return m === "usa" || m === "both";
  return m === "saudi" || m === "both";
}

// Inject live Mubasher prices into a call array (parity with web DataContext):
// real currentPrice + live upside-to-target. Falls back to the stored snapshot.
function applyLivePrices<T extends Record<string, any>>(arr: T[], prices: Record<string, any>, retField: "remaining" | "return"): T[] {
  return arr.map((c) => {
    // Closed calls are an audited record — frozen at close; never overwrite (parity with web).
    if (String(c?.status ?? "active") === "closed") return c;
    const t = c?.ticker ? String(c.ticker).toUpperCase() : "";
    const live = t ? prices[t] : undefined;
    if (!live || typeof live.lastPrice !== "number") return c;
    const cp = live.lastPrice;
    const out: any = { ...c, currentPrice: cp };
    if (typeof c.targetPrice === "number" && cp > 0) out[retField] = +(((c.targetPrice - cp) / cp) * 100).toFixed(2);
    // Keep Performance consistent with the live price (parity with web applyLivePrices).
    if (retField === "remaining" && typeof c.entryPrice === "number" && c.entryPrice > 0) {
      out.performance = +(((cp - c.entryPrice) / c.entryPrice) * 100).toFixed(2);
    }
    return out as T;
  });
}

function toArticle(row: any): Article {
  return {
    id:         row.id,
    type:       row.type ?? "article",
    readTime:   row.readTime ?? row.read_time ?? 5,
    section:    row.section ?? "insights",
    title:      row.title,
    titleAr:    row.titleAr ?? row.titlear ?? undefined,
    subtitle:   row.subtitle ?? undefined,
    subtitleAr: row.subtitleAr ?? row.subtitlear ?? undefined,
    body:       row.body ?? undefined,
    bodyAr:     row.bodyAr ?? row.bodyar ?? undefined,   // AR body → reader (was dropped → English fallback bug)
    bodyFormat: row.bodyFormat ?? row.bodyformat ?? undefined, // honor rich flag like web (audit mobile-M2)
    author:     arr(row.author).length ? arr(row.author) : ["Smart Signals Research"],
    // authorAr is best-effort: enables Arabic bylines in Related Research and
    // detail views. Falls back to `author` when the admin hasn't authored an
    // Arabic translation yet.
    authorAr:   arr(row.authorAr ?? row.authorar).length ? arr(row.authorAr ?? row.authorar) : undefined,
    authorRole: row.authorRole ?? row.authorrole ?? undefined,
    authorRoleAr: row.authorRoleAr ?? row.authorroleAr ?? row.authorroleAr ?? row.authorrolear ?? undefined,
    date:       row.date,
    tag:        row.tag ?? undefined,
    ticker:     primaryTicker(row.ticker),
    coverImage: row.coverImage ?? row.coverimage ?? undefined,
    market:     row.market ?? undefined,
    // Interactive chart (Technical Reports) — captured image + live chart config.
    chartTimeframe: row.chartTimeframe ?? row.charttimeframe ?? undefined,
    chartImage:     row.chartImage ?? row.chartimage ?? undefined,
    chartCaption:   row.chartCaption ?? row.chartcaption ?? undefined,
    chartProvider:  row.chartProvider ?? row.chartprovider ?? undefined,
    chartSymbol:    row.chartSymbol ?? row.chartsymbol ?? undefined,
    chartInterval:  row.chartInterval ?? row.chartinterval ?? undefined,
    chartStudies:   row.chartStudies ?? row.chartstudies ?? undefined,
  };
}

function toFundamental(row: any): FundamentalCall {
  return {
    ticker:        row.ticker,
    company:       row.company,
    signal:        row.signal,
    analyst:       Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    initiatedDate: row.initiatedDate ?? row.initiateddate ?? "",
    updatedDate:   row.updatedDate ?? row.updateddate ?? undefined,
    updates:       row.updates ?? undefined,
    targetPrice:   row.targetPrice ?? row.targetprice ?? 0,
    currentPrice:  row.currentPrice ?? row.currentprice ?? 0,
    remaining:     row.remaining ?? 0,
    performance:   row.performance ?? 0,
    egx30:         row.egx30 ?? undefined,   // missing benchmark EXCLUDED from the mean (NOT 0% — that fakes a flat market + inflates alpha)
    egx30Capped:   row.egx30Capped ?? row.egx30capped ?? undefined,
    sector:        row.sector ?? "",
    thesis:        row.thesis ?? undefined,
    thesisAr:      row.thesisAr ?? row.thesisar ?? undefined,
    articleId:     row.articleId ?? row.articleid ?? undefined,
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    entryPrice:    row.entryPrice ?? row.entryprice ?? undefined,
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
  } as FundamentalCall;
}

function toTechnical(row: any): TechnicalCall {
  return {
    ticker:       row.ticker,
    company:      row.company,
    signal:       row.signal,
    analyst:      Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    date:         row.date ?? "",
    updatedDate:  row.updatedDate ?? row.updateddate ?? undefined,
    updates:      row.updates ?? undefined,
    entryMin:     row.entryMin ?? row.entrymin ?? 0,
    entryMax:     row.entryMax ?? row.entrymax ?? 0,
    targetPrice:  row.targetPrice ?? row.targetprice ?? 0,
    stopLoss:     row.stopLoss ?? row.stoploss ?? 0,
    currentPrice: row.currentPrice ?? row.currentprice ?? 0,
    return:       row.return ?? 0,
    pattern:      row.pattern ?? "",
    timeframe:    row.timeframe ?? "Daily",
    notes:        row.notes ?? undefined,
    notesAr:      row.notesAr ?? row.notesar ?? undefined,
    chartImage:   row.chartImage ?? row.chartimage ?? undefined,
    chartCaption: row.chartCaption ?? row.chartcaption ?? undefined,
    chartProvider: row.chartProvider ?? row.chartprovider ?? undefined,
    chartSymbol:   row.chartSymbol ?? row.chartsymbol ?? undefined,
    chartInterval: row.chartInterval ?? row.chartinterval ?? undefined,
    chartStudies:  row.chartStudies ?? row.chartstudies ?? undefined,
    chartLayout:   row.chartLayout ?? row.chartlayout ?? undefined,
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
    // Extended price structure
    tp2:             row.tp2 ?? undefined,
    tp3:             row.tp3 ?? undefined,
    conservativeSL:  row.conservativeSL ?? row.conservativesl ?? undefined,
    aggressiveSL:    row.aggressiveSL ?? row.aggressivesl ?? undefined,
    trailingStopPct: row.trailingStopPct ?? row.trailingstoppct ?? undefined,
    trend:           row.trend ?? undefined,
  } as TechnicalCall;
}

function toTechnicalArticle(row: any): TechnicalArticle {
  return {
    id:              row.id,
    ticker:          primaryTicker(row.ticker) ?? row.ticker,
    company:         row.company ?? undefined,
    companyAr:       row.companyAr ?? row.companyar ?? undefined,
    market:          (row.market ?? "egypt"),
    analyst:         Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? undefined),
    title:           row.title ?? "",
    titleAr:         row.titleAr ?? row.titlear ?? undefined,
    subtitle:        row.subtitle ?? undefined,
    subtitleAr:      row.subtitleAr ?? row.subtitlear ?? undefined,
    chartTimeframe:  row.chartTimeframe ?? row.charttimeframe ?? undefined,
    chartImage:      row.chartImage ?? row.chartimage ?? undefined,
    chartCaption:    row.chartCaption ?? row.chartcaption ?? undefined,
    technicalBody:   row.technicalBody ?? row.technicalbody ?? undefined,
    technicalBodyAr: row.technicalBodyAr ?? row.technicalbodyar ?? undefined,
    priceSummary:    row.priceSummary ?? row.pricesummary ?? undefined,
    priceSummaryAr:  row.priceSummaryAr ?? row.pricesummaryar ?? undefined,
    disclaimer:      row.disclaimer ?? undefined,
    disclaimerAr:    row.disclaimerAr ?? row.disclaimerar ?? undefined,
    date:            row.date ?? undefined,
    trend:           row.trend ?? undefined,
    published:       row.published,
  } as TechnicalArticle;
}

// Index Updates — analyst commentary on a market index (EGX30/EGX70/TASI/S&P 500/
// Nasdaq 100/Dow Jones), distinct from per-stock Technical Calls. Mirrors
// toTechnicalArticle's dual-case-read defensiveness.
function toIndexUpdate(row: any): IndexUpdate {
  return {
    id:             row.id,
    indexSymbol:    row.indexSymbol ?? row.indexsymbol ?? "",
    market:         (row.market ?? "egypt"),
    analyst:        row.analyst ?? undefined,
    overview:       row.overview ?? undefined,
    currentPrice:   row.currentPrice != null ? Number(row.currentPrice) : (row.currentprice != null ? Number(row.currentprice) : undefined),
    title:          row.title ?? "",
    titleAr:        row.titleAr ?? row.titlear ?? undefined,
    body:           row.body ?? undefined,
    bodyAr:         row.bodyAr ?? row.bodyar ?? undefined,
    chartSymbol:    row.chartSymbol ?? row.chartsymbol ?? undefined,
    chartInterval:  row.chartInterval ?? row.chartinterval ?? undefined,
    chartImage:     row.chartImage ?? row.chartimage ?? undefined,
    date:           row.date ?? undefined,
    published:      row.published,
  } as IndexUpdate;
}

function toSaudiStock(row: any): SaudiStock {
  return {
    ticker:        row.ticker,
    company:       row.company,
    companyAr:     row.companyAr ?? row.companyfar ?? "",
    sector:        row.sector ?? "",
    sectorAr:      row.sectorAr ?? row.sectorar ?? "",
    signal:        row.signal,
    analyst:       Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    initiatedDate: row.initiatedDate ?? row.initiateddate ?? "",
    targetPrice:   row.targetPrice ?? row.targetprice ?? 0,
    currentPrice:  row.currentPrice ?? row.currentprice ?? 0,
    remaining:     row.remaining ?? 0,
    performance:   row.performance ?? 0,
    tadawul:       row.tadawul ?? undefined,   // missing benchmark EXCLUDED from the mean (NOT 0%)
    thesis:        row.thesis ?? "",
    thesisAr:      row.thesisAr ?? row.thesisar ?? "",
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    entryPrice:    row.entryPrice ?? row.entryprice ?? undefined,
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
  } as any;
}

function toSaudiTechnical(row: any): SaudiTechnical {
  return {
    ticker:       row.ticker,
    company:      row.company,
    signal:       row.signal,
    analyst:      Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    date:         row.date ?? "",
    entryMin:     row.entryMin ?? row.entrymin ?? 0,
    entryMax:     row.entryMax ?? row.entrymax ?? 0,
    targetPrice:  row.targetPrice ?? row.targetprice ?? 0,
    stopLoss:     row.stopLoss ?? row.stoploss ?? 0,
    currentPrice: row.currentPrice ?? row.currentprice ?? 0,
    return:       row.return ?? 0,
    pattern:      row.pattern ?? "",
    timeframe:    row.timeframe ?? "Daily",
    notes:        row.notes ?? undefined,
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
  } as any;
}

function toUsaStock(row: any): UsaStock {
  return {
    ticker:        row.ticker,
    company:       row.company,
    companyAr:     row.companyAr ?? row.companyfar ?? "",
    sector:        row.sector ?? "",
    sectorAr:      row.sectorAr ?? row.sectorar ?? "",
    signal:        row.signal,
    analyst:       Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    initiatedDate: row.initiatedDate ?? row.initiateddate ?? "",
    targetPrice:   row.targetPrice ?? row.targetprice ?? 0,
    currentPrice:  row.currentPrice ?? row.currentprice ?? 0,
    remaining:     row.remaining ?? 0,
    performance:   row.performance ?? 0,
    sp500:         row.sp500 ?? undefined,   // missing benchmark EXCLUDED from the mean (NOT 0%)
    thesis:        row.thesis ?? "",
    thesisAr:      row.thesisAr ?? row.thesisar ?? "",
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    entryPrice:    row.entryPrice ?? row.entryprice ?? undefined,
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
  } as any;
}

function toUsaTechnical(row: any): UsaTechnical {
  return {
    ticker:       row.ticker,
    company:      row.company,
    signal:       row.signal,
    analyst:      Array.isArray(row.analyst) ? row.analyst.join(", ") : (row.analyst ?? ""),
    date:         row.date ?? "",
    entryMin:     row.entryMin ?? row.entrymin ?? 0,
    entryMax:     row.entryMax ?? row.entrymax ?? 0,
    targetPrice:  row.targetPrice ?? row.targetprice ?? 0,
    stopLoss:     row.stopLoss ?? row.stoploss ?? 0,
    currentPrice: row.currentPrice ?? row.currentprice ?? 0,
    return:       row.return ?? 0,
    pattern:      row.pattern ?? "",
    timeframe:    row.timeframe ?? "Daily",
    notes:        row.notes ?? undefined,
    // Lifecycle fields — required by the performance engine (closed-call cohort).
    status:        row.status ?? "active",
    closedDate:    row.closedDate ?? row.closeddate ?? undefined,
    closedPrice:   row.closedPrice ?? row.closedprice ?? undefined,
    realizedReturn: row.realizedReturn ?? row.realizedreturn ?? undefined,
    totalReturn:    row.totalReturn ?? row.totalreturn ?? undefined,
    dividendReturn: row.dividendReturn ?? row.dividendreturn ?? undefined,
    dataQuality:    row.dataQuality ?? row.dataquality ?? undefined,
  } as any;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 30_000; // 30 seconds

// Dev-only mock gate: production must never render fabricated sample data as live.
const ALLOW_MOCK = typeof __DEV__ !== "undefined" && __DEV__;
const mk = <T,>(mock: T, empty: T): T => (ALLOW_MOCK ? mock : empty);

// Mubasher feed tables are additive and may not exist until the schema SQL runs.
// Skip a table for the session once it's confirmed missing → no recurring 404s.
const missingFeedTables = new Set<string>();
async function feedSelect(table: string, orderCol?: string): Promise<any[]> {
  if (!supabasePublic || missingFeedTables.has(table)) return [];
  const q = orderCol
    ? supabasePublic.from(table).select("*").order(orderCol, { ascending: false })
    : supabasePublic.from(table).select("*");
  const { data, error } = await q;
  if (error) {
    if ((error as any).code === "PGRST205" || /does not exist|find the table|schema cache/i.test(error.message || "")) {
      missingFeedTables.add(table);
    }
    return [];
  }
  return data ?? [];
}

type DataState = Omit<AppData, "refetch" | "markNotificationRead" | "markAllNotificationsRead">;
const CACHE_KEY = "@data_cache_v1"; // bump the suffix to invalidate the cached shape

// Production NEVER shows fabricated sample data as if it were live signals.
// Static seeds are DEV-only; in prod an empty/failed fetch yields [] so screens
// render their real empty state. (audit: static-fallback-masks-empty-backend)
function initialData(): DataState {
  return {
    ARTICLES:          mk(STATIC_ARTICLES, []),
    FUNDAMENTAL_CALLS: mk(STATIC_FUND, []),
    TECHNICAL_CALLS:   mk(STATIC_TECH, []),
    TECHNICAL_ARTICLES: [],
    INDEX_UPDATES:     [],
    NEWS:              mk(STATIC_NEWS, []),
    PORTFOLIOS:        mk(STATIC_PORTFOLIOS, []),
    NOTIFICATIONS:     mk(STATIC_NOTIFICATIONS, []),
    SAUDI_FUNDAMENTAL: mk(STATIC_SAUDI_FUND, []),
    SAUDI_TECHNICAL:   mk(STATIC_SAUDI_TECH, []),
    SAUDI_NEWS:        mk(STATIC_SAUDI_NEWS, []),
    SAUDI_ARTICLES:    mk(STATIC_SAUDI_ARTICLES, []),
    USA_FUNDAMENTAL:   mk(STATIC_USA_FUND, []),
    USA_TECHNICAL:     mk(STATIC_USA_TECH, []),
    USA_NEWS:          mk(STATIC_USA_NEWS, []),
    USA_ARTICLES:      mk(STATIC_USA_ARTICLES, []),
    PRICES:            {},
    COMPANIES:         {},
    RESEARCH_DOCS:     [],
    loading:           isSupabaseReady,
  };
}

const DataContext = createContext<AppData>({ ...initialData(), refetch: async () => {}, markNotificationRead: async () => {}, markAllNotificationsRead: async () => {} });

/**
 * Single source of truth for all app content. Mounted ONCE at the root so the entire
 * app shares one fetch + one 30s poll — previously EVERY screen ran its own useData()
 * with an independent fetch+poll, so each navigation re-loaded all tables (the lag).
 * Also hydrates instantly from an on-device cache on cold start (stale-while-revalidate).
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DataState>(initialData);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Once a live fetch has committed, the async cold-start cache hydrate must NOT
  // overwrite it with the (older) on-device snapshot — that race could mask fresh
  // data for ~one poll window after launch. Flipped true inside commit().
  const freshArrivedRef = useRef(false);

  // ── Durable, local-first notification read-state ────────────────────────────
  // The server `notifications.read` column is GLOBAL (not per-user) and is
  // overwritten on every poll + cold start, so it cannot be the source of truth
  // for "have I read this". We keep a per-device map { id: readAt } in AsyncStorage
  // and MERGE it over every snapshot (fetch + cache rehydrate), so a read item
  // NEVER resurfaces as unread after a poll/restart, while a genuinely new id (not
  // in the map) still shows unread. Bounded to the newest 500 entries.
  const READ_KEY = "@notif_read_v2";
  const readMapRef = useRef<Record<string, number>>({});

  function persistReadMap() {
    let map = readMapRef.current;
    const ids = Object.keys(map);
    if (ids.length > 800) {
      const kept = ids.sort((a, b) => (map[b] ?? 0) - (map[a] ?? 0)).slice(0, 500);
      const next: Record<string, number> = {};
      for (const id of kept) next[id] = map[id];
      readMapRef.current = next;
      map = next;
    }
    AsyncStorage.setItem(READ_KEY, JSON.stringify(map)).catch(() => {});
  }

  // Force read:true for any id the user has read on this device.
  function mergeRead<T extends { id: string | number; read?: boolean }>(ns: T[]): T[] {
    const m = readMapRef.current;
    return ns.map((n) => (n.read || !m[String(n.id)] ? n : { ...n, read: true }));
  }

  // Apply + persist the latest good snapshot so the next cold start renders instantly.
  function commit(next: DataState) {
    freshArrivedRef.current = true; // live data is now authoritative over the cache
    const merged = { ...next, NOTIFICATIONS: mergeRead(next.NOTIFICATIONS) };
    setData(merged);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...merged, loading: false })).catch(() => {});
  }

  async function fetchAll() {
    if (!supabasePublic) return;

    try {
      const [
        [
          { data: articles },
          { data: fundCalls },
          { data: techCalls },
          { data: newsRows },
          { data: portfolioRows },
          { data: notifRows },
        ],
        [priceRows, companyRows, researchRows, techArticleRows, indexUpdateRows, indexRows],
      ] = await Promise.all([
        Promise.all([
          supabasePublic.from("articles").select("*").order("createdAt", { ascending: false }),
          supabasePublic.from("fundamental_calls").select("*").order("createdAt", { ascending: false }),
          supabasePublic.from("technical_calls").select("*").order("createdAt", { ascending: false }),
          supabasePublic.from("news_items").select("*").order("createdAt", { ascending: false }).limit(100),
          supabasePublic.from("portfolios").select("*").order("createdAt", { ascending: false }),
          supabasePublic.from("notifications").select("*").order("createdAt", { ascending: false }),
        ]),
        // Mubasher live feeds — resilient: skips a table once it's known-missing.
        Promise.all([
          feedSelect("prices"),
          feedSelect("companies"),
          feedSelect("research_docs", "reportDate"),
          feedSelect("technical_articles", "createdAt"),
          feedSelect("index_updates", "createdAt"),
          // EGX30 / TASI / SPX daily index bars → matched-period benchmark (#1). Fetched
          // PER TICKER + windowed so each query stays under PostgREST's 1000-row cap and
          // covers recent calls (a combined query returned only the oldest 2018–2020 bars).
          Promise.all((["EGX30", "TASI", "SPX"]).map((tk) =>
            (supabasePublic!.from("price_bars").select("ticker,ts,closeP")
              .eq("ticker", tk).eq("interval", "1d")
              .gte("ts", Math.floor(Date.now() / 1000) - INDEX_BARS_WINDOW_DAYS * 86400)
              .order("ts", { ascending: true }) as any)
              .then((r: any) => r?.data ?? [], () => [] as any[])
          )).then((parts: any[][]) => parts.flat(), () => [] as any[]),
        ]),
      ]);

      // Keyed maps for the live feeds (empty until the cron populates the tables).
      const PRICES: Record<string, any> = {};
      (priceRows ?? []).forEach((p: any) => { if (p?.ticker) PRICES[String(p.ticker).toUpperCase()] = p; });
      const COMPANIES: Record<string, any> = {};
      (companyRows ?? []).forEach((c: any) => { if (c?.ticker) COMPANIES[String(c.ticker).toUpperCase()] = c; });
      const RESEARCH_DOCS = (researchRows ?? []) as any[];
      const indexMap = buildIndexMap(indexRows ?? []); // EGX30/TASI daily bars (#1)

      // If all tables empty, keep static data (not seeded yet) but surface live feeds.
      if (!articles?.length && !fundCalls?.length && !techArticleRows?.length && !indexUpdateRows?.length) {
        setData(d => ({ ...d, PRICES, COMPANIES, RESEARCH_DOCS, loading: false }));
        return;
      }

      // Drafts (published === false) are hidden from the app, exactly like the web
      // frontend. Rows with no flag (null/undefined — legacy or Mubasher feed) count
      // as published, so nothing already-live disappears.
      const isPub = (r: any) => r?.published !== false;
      const pubArticles = (articles ?? []).filter(isPub);
      const pubFund     = (fundCalls ?? []).filter(isPub);
      const pubTech     = (techCalls ?? []).filter(isPub);
      const pubNews     = (newsRows ?? []).filter(isPub);

      const egxArticles   = pubArticles.filter((a: any) => !a.market || a.market === "egypt" || a.market === "both" || a.market === "commodities");
      const saudiArticles = pubArticles.filter((a: any) => a.market === "saudi" || a.market === "both" || a.market === "commodities");
      const usaArticles   = pubArticles.filter((a: any) => a.market === "usa" || a.market === "both" || a.market === "commodities");

      const egxFund   = pubFund.filter((r: any) => inMarket(r, "egypt"));
      const saudiFund = pubFund.filter((r: any) => inMarket(r, "saudi"));
      const usaFund   = pubFund.filter((r: any) => inMarket(r, "usa"));
      const egxTech   = pubTech.filter((r: any) => inMarket(r, "egypt"));
      const saudiTech = pubTech.filter((r: any) => inMarket(r, "saudi"));
      const usaTech   = pubTech.filter((r: any) => inMarket(r, "usa"));

      const egxNews   = pubNews.filter((n: any) => !n.market || n.market === "egypt");
      const saudiNews = pubNews.filter((n: any) => n.market === "saudi");
      const usaNews   = pubNews.filter((n: any) => n.market === "usa");

      // Technical Articles — published, normalized, all markets (the screen filters by
      // the active market with a "both"-tolerant check).
      const techArticles = (techArticleRows ?? []).filter(isPub).map(toTechnicalArticle);
      const indexUpdates = (indexUpdateRows ?? []).filter(isPub).map(toIndexUpdate);

      commit({
        ARTICLES:          egxArticles.length   > 0 ? egxArticles.map(toArticle)          : mk(STATIC_ARTICLES, []),
        FUNDAMENTAL_CALLS: egxFund.length       > 0 ? applyBenchmark(applyLivePrices(egxFund.map(toFundamental), PRICES, "remaining"), indexMap, "egypt") : mk(STATIC_FUND, []),
        TECHNICAL_CALLS:   egxTech.length       > 0 ? applyLivePrices(egxTech.map(toTechnical), PRICES, "return")     : mk(STATIC_TECH, []),
        TECHNICAL_ARTICLES: techArticles,
        INDEX_UPDATES:     indexUpdates,
        NEWS:              egxNews.length        > 0 ? egxNews                             : mk(STATIC_NEWS, []),
        PORTFOLIOS:        (portfolioRows ?? []).length > 0
          ? (portfolioRows as any[]).map(p => ({
              id:        p.id,
              name:      p.name,
              shortName: p.shortName ?? p.shortname ?? "",
              return:    p.return ?? 0,
              egx30:     p.egx30 ?? 0,
              stocks:    p.stocks ?? 0,
              color:     p.color ?? "#4D8EF8",
              desc:      p.description ?? p.desc ?? "",
            }))
          : mk(STATIC_PORTFOLIOS, []),
        NOTIFICATIONS:     (notifRows ?? []).length > 0
          ? (notifRows as any[]).map((n: any): Notification => ({
              id:         n.id,
              date:       n.date,
              time:       n.time,
              title:      n.title,
              titleAr:    n.titleAr ?? n.titlear ?? undefined,
              subtitle:   n.subtitle,
              subtitleAr: n.subtitleAr ?? n.subtitlear ?? undefined,
              type:       n.type,
              ticker:     n.ticker,
              price:      n.price,
              read:       n.read ?? false,
              articleId:  n.articleId ?? n.articleid,
            }))
          : mk(STATIC_NOTIFICATIONS, []),
        SAUDI_FUNDAMENTAL: saudiFund.length     > 0 ? applyBenchmark(applyLivePrices(saudiFund.map(toSaudiStock), PRICES, "remaining"), indexMap, "saudi") : mk(STATIC_SAUDI_FUND, []),
        SAUDI_TECHNICAL:   saudiTech.length     > 0 ? applyLivePrices(saudiTech.map(toSaudiTechnical), PRICES, "return") : mk(STATIC_SAUDI_TECH, []),
        SAUDI_NEWS:        saudiNews.length     > 0 ? saudiNews                           : mk(STATIC_SAUDI_NEWS, []),
        SAUDI_ARTICLES:    saudiArticles.length > 0 ? saudiArticles.map(toArticle)       : mk(STATIC_SAUDI_ARTICLES, []),
        USA_FUNDAMENTAL:   usaFund.length       > 0 ? applyBenchmark(applyLivePrices(usaFund.map(toUsaStock), PRICES, "remaining"), indexMap, "usa") : mk(STATIC_USA_FUND, []),
        USA_TECHNICAL:     usaTech.length       > 0 ? applyLivePrices(usaTech.map(toUsaTechnical), PRICES, "return") : mk(STATIC_USA_TECH, []),
        USA_NEWS:          usaNews.length       > 0 ? usaNews                             : mk(STATIC_USA_NEWS, []),
        USA_ARTICLES:      usaArticles.length   > 0 ? usaArticles.map(toArticle)         : mk(STATIC_USA_ARTICLES, []),
        PRICES,
        COMPANIES,
        RESEARCH_DOCS,
        loading:           false,
      });
    } catch (err) {
      console.warn("[useData] fetch failed, using static data:", err);
      setData(d => ({ ...d, loading: false }));
    }
  }

  // Instant hydrate from the on-device cache (stale-while-revalidate): render the last
  // known content immediately on cold start, then the fetch below refreshes it. This is
  // what turns a cold launch from "spinner → data" into "data shown instantly".
  useEffect(() => {
    let alive = true;
    (async () => {
      // Load the durable read-map FIRST so the very first paint already reflects reads.
      try {
        const rawRead = await AsyncStorage.getItem(READ_KEY);
        if (rawRead) readMapRef.current = JSON.parse(rawRead) || {};
      } catch { /* ignore */ }
      // Re-apply read-state over whatever is already in state (covers a fetch that
      // may have committed before the read-map finished loading).
      if (alive) setData((d) => ({ ...d, NOTIFICATIONS: mergeRead(d.NOTIFICATIONS) }));
      // Then hydrate the content cache (merge read-state over it too) — but ONLY if a
      // live fetch hasn't already committed (else this stale snapshot would clobber it).
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (alive && raw && !freshArrivedRef.current) {
          const cached = JSON.parse(raw) as Partial<DataState>;
          setData((d) => ({
            ...d, ...cached,
            NOTIFICATIONS: mergeRead((cached.NOTIFICATIONS ?? d.NOTIFICATIONS) as Notification[]),
            loading: false,
          }));
        }
      } catch { /* ignore a corrupt cache */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isSupabaseReady) return;
    fetchAll();
    // Self-scheduling poll with ±20% jitter so 1M devices don't hit the DB on the
    // same tick (market-open / push-tap herds). The OS already pauses RN timers when
    // backgrounded; AppState 'active' triggers an immediate catch-up refetch.
    let stopped = false;
    const schedule = () => {
      if (stopped) return;
      const jitter = POLL_INTERVAL * (0.9 + Math.random() * 0.2);
      pollRef.current = setTimeout(async () => {
        if (!stopped) { try { await fetchAll(); } catch { /* logged in fetchAll */ } }
        schedule();
      }, jitter) as unknown as ReturnType<typeof setInterval>;
    };
    schedule();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") fetchAll(); });
    return () => {
      stopped = true;
      if (pollRef.current) clearTimeout(pollRef.current as unknown as ReturnType<typeof setTimeout>);
      sub.remove();
    };
  }, []);

  // ── Real-time push (Supabase Realtime) ─────────────────────────────────────
  // The instant the ingest cron or admin writes a row, every connected device
  // refetches within ~1s — no waiting for the 30s poll. The 30s poll stays as a
  // resilient FALLBACK (and covers the case where Realtime isn't enabled on a
  // table: then there are simply no events and polling carries the load). A short
  // debounce coalesces bursts (e.g. an intraday price snapshot writing 200 rows).
  useEffect(() => {
    const sb = supabasePublic;
    if (!sb) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { fetchAll().catch(() => {}); }, 500);
    };
    const HOT_TABLES = [
      "prices", "fundamental_calls", "technical_calls",
      "news_items", "notifications", "articles", "technical_articles", "index_updates",
    ];
    let channel = sb.channel("ss-live");
    for (const table of HOT_TABLES) {
      channel = channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, bump);
    }
    channel.subscribe();
    return () => {
      if (debounce) clearTimeout(debounce);
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, []);

  async function markNotificationRead(id: string | number) {
    // Durable local read-state (survives restart + polls) + optimistic UI update.
    readMapRef.current[String(id)] = Date.now();
    persistReadMap();
    setData(d => ({
      ...d,
      NOTIFICATIONS: d.NOTIFICATIONS.map(n => (String(n.id) === String(id) ? { ...n, read: true } : n)),
    }));
    // Best-effort server mirror (keeps web in sync where it shares the column).
    if (supabasePublic) {
      try {
        await (supabasePublic.from("notifications").update({ read: true }).eq("id", id) as any);
      } catch { /* non-fatal */ }
    }
  }

  async function markAllNotificationsRead() {
    const now = Date.now();
    const ids = data.NOTIFICATIONS.map(n => String(n.id));
    ids.forEach(id => { readMapRef.current[id] = now; });
    persistReadMap();
    setData(d => ({ ...d, NOTIFICATIONS: d.NOTIFICATIONS.map(n => (n.read ? n : { ...n, read: true })) }));
    // Clear the OS badge + delivered notifications so the icon/lock-screen match.
    try { await Notifications.setBadgeCountAsync(0); } catch { /* ignore */ }
    try { await Notifications.dismissAllNotificationsAsync(); } catch { /* ignore */ }
    if (supabasePublic && ids.length) {
      try { await (supabasePublic.from("notifications").update({ read: true }).in("id", ids) as any); } catch { /* non-fatal */ }
    }
  }

  // Keep the OS app-icon badge in sync with the REAL unread count everywhere — not
  // just inside /tabs (the old badge effect lived in the tab bar, which isn't mounted
  // on a cold deep-link into Inbox). Driven by the merged, durable read-state.
  const unreadCount = data.NOTIFICATIONS.filter(n => !n.read).length;
  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  return React.createElement(DataContext.Provider, { value: { ...lockMarkets(data), refetch: fetchAll, markNotificationRead, markAllNotificationsRead } }, children);
}

/**
 * Shared app data — reads the single DataProvider above. API-compatible with the old
 * per-screen hook, so every existing `useData()` call keeps working unchanged, but now
 * they all share one fetch + one poll + the instant cache instead of each re-fetching.
 */
export function useData(): AppData {
  return useContext(DataContext);
}

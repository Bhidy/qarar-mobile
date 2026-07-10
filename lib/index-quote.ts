/**
 * Index live-quote helpers — mirror of web/lib/index-quote.ts + the feedTicker
 * mapping from web/lib/index-catalog.ts. Keep the two in sync.
 *
 * The catalog symbol and our feed ticker DIVERGE for the S&P 500 ("SPX500" vs
 * feed "SPX"); EGX70 / NDX have NO ingested feed (initiation level only — a
 * missing live level must render as nothing, never a fabricated number).
 */

const INDEX_FEED_TICKER: Record<string, string> = {
  EGX30: "EGX30",
  TASI: "TASI",
  SPX500: "SPX",
  DJI: "DJI",
};

/** Our prices-table ticker for an index symbol, or null when we have no feed. */
export function indexFeedTicker(value?: string | null): string | null {
  const v = String(value ?? "").toUpperCase().trim();
  return INDEX_FEED_TICKER[v] ?? null;
}

/** Performance % of the live level vs the captured initiation level. Null when
 *  either side is missing/invalid (honest "—", never a fabricated 0). */
export function indexPerformancePct(initiation?: number | null, live?: number | null): number | null {
  const a = Number(initiation), b = Number(live);
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) return null;
  return +(((b - a) / a) * 100).toFixed(2);
}

/** Live index level from the useData PRICES map (keyed by feed ticker). */
export function liveIndexLevel(PRICES: Record<string, any>, indexSymbol?: string | null): number | null {
  const t = indexFeedTicker(indexSymbol);
  const last = t ? Number(PRICES?.[t]?.lastPrice) : NaN;
  return Number.isFinite(last) && last > 0 ? last : null;
}

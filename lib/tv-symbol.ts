/**
 * TradingView symbol/interval helpers for the mobile live-chart WebView — mirrors
 * web/lib/tradingview.ts so the in-app chart resolves the same EXCHANGE:TICKER and
 * interval the customer web signal page uses.
 */

export function tvSymbol(ticker?: string, market?: string, override?: string): string {
  const ov = (override || "").trim();
  if (ov) return ov.toUpperCase();
  const t = (ticker || "").trim().toUpperCase();
  if (!t) return "";
  if (t.includes(":")) return t; // already qualified
  // Saudi/Tadawul tickers are 4-digit numerics; otherwise default EGX. USA → bare symbol.
  const ex = market === "saudi" ? "TADAWUL"
    : market === "usa" ? ""
    : /^\d{3,4}$/.test(t) ? "TADAWUL" : "EGX";
  return ex ? `${ex}:${t}` : t;
}

const INTERVAL_BY_TIMEFRAME: Record<string, string> = {
  "1H": "60", "2H": "120", "4H": "240", Daily: "D", Weekly: "W", Monthly: "M",
};

export function tvInterval(timeframe?: string, override?: string): string {
  const ov = (override || "").trim();
  if (ov) return ov;
  return INTERVAL_BY_TIMEFRAME[(timeframe as string) ?? "Daily"] ?? "D";
}

export function parseTvStudies(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

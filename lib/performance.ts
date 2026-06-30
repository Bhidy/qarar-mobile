/**
 * performance.ts — single source of truth for "Overall Performance" metrics.
 * Ported verbatim from the web app (web/lib/performance.ts) so the mobile app,
 * the customer web, and the admin panel all compute identical numbers from the
 * same closed-call cohort. Pure / framework-agnostic.
 */

export type CallStatus = "active" | "closed";

export interface PerfCall {
  status?: CallStatus | string;
  analyst?: string | string[];
  entryPrice?: number;        // fundamental
  entryMin?: number;          // technical zone
  entryMax?: number;
  closedDate?: string;
  closedPrice?: number;
  realizedReturn?: number;
  currentPrice?: number;      // system-owned live price (active) / frozen (closed)
  targetPrice?: number;
  performance?: number;       // legacy / live snapshot
  dividendReturn?: number;    // Σ(DPS in window)/entry×100; 0 until dividend data
  totalReturn?: number;       // priceReturn + dividendReturn (locked at close)
  initiatedDate?: string;     // fundamental
  date?: string;              // technical (and public fundamental rows)
  egx30?: number;
  egx30Capped?: number;
  tadawul?: number;
  sp500?: number;
  dataQuality?: "verified" | "review" | "manual" | string;  // fundamental provenance gate
}

export interface OverallPerformance {
  totalCount: number;
  activeCount: number;
  closedCount: number;
  winCount: number;
  lossCount: number;
  hitRatio: number | null;
  avgRealizedReturn: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  avgDurationDays: number | null;
  benchmarkReturn: number | null;
  alpha: number | null;
  excludedCount: number;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function yearFrom(raw: string): number {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return NaN;
  return raw.length <= 2 ? 2000 + n : n;
}

export function parseCallDate(input?: string | null): Date | null {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  let m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const year = yearFrom(m[3]);
    if (month !== undefined && !Number.isNaN(year)) return new Date(year, month, parseInt(m[1], 10));
  }
  m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const year = yearFrom(m[3]);
    if (month !== undefined && !Number.isNaN(year)) return new Date(year, month, parseInt(m[2], 10));
  }
  m = s.match(/^([A-Za-z]{3,})\.?,?\s+(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const year = yearFrom(m[2]);
    if (month !== undefined && !Number.isNaN(year)) return new Date(year, month, 1);
  }
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// ── Benchmark tied to the Initiated Date (#1) ──────────────────────────────────
// Compute the EGX30 / TASI index return over the call's holding period from the
// daily index bars (price_bars, INS=7) instead of a static hand-typed %.
type IdxBar = { t: number; c: number };
export type IndexMap = Record<string, IdxBar[]>;

export function buildIndexMap(rows: any[]): IndexMap {
  const m: IndexMap = {};
  for (const r of rows ?? []) {
    const tk = String(r?.ticker ?? "").toUpperCase();
    const c = Number(r?.closeP ?? r?.closep);
    // price_bars.ts is epoch SECONDS → ×1000 for JS ms (audit C-1: was read as ms).
    const tsNum = Number(r?.ts);
    const t = Number.isFinite(tsNum) && tsNum > 0 ? tsNum * 1000 : new Date(r?.date ?? "").getTime();
    if (!tk || !Number.isFinite(c) || Number.isNaN(t)) continue;
    (m[tk] ??= []).push({ t, c });
  }
  for (const k in m) m[k].sort((a, b) => a.t - b.t);
  return m;
}

function closeAsOf(bars: IdxBar[], target: number): number | null {
  // Before our earliest bar ⇒ null so the caller keeps the stored benchmark
  // instead of clamping to the oldest bar (audit H-1/H-2).
  if (!bars.length || target < bars[0].t) return null;
  let res: number | null = null;
  for (const b of bars) { if (b.t <= target) res = b.c; else break; }
  return res;
}

export function indexReturnPct(
  indexMap: IndexMap, benchTicker: string,
  fromDate?: string | null, toDate?: string | null,
): number | null {
  const bars = indexMap[String(benchTicker).toUpperCase()];
  if (!bars || bars.length < 2) return null;
  const from = parseCallDate(fromDate ?? undefined)?.getTime();
  if (from == null || Number.isNaN(from)) return null;
  const start = closeAsOf(bars, from);
  const toT = toDate ? parseCallDate(toDate)?.getTime() : undefined;
  const end = (toT != null && !Number.isNaN(toT)) ? closeAsOf(bars, toT) : bars[bars.length - 1].c;
  if (start == null || end == null || start <= 0) return null;
  return +(((end - start) / start) * 100).toFixed(2);
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isPublishable(call: PerfCall): boolean {
  const q = call.dataQuality;
  if (q === undefined || q === null || q === "") return true;
  return q === "verified";
}

export function isClosed(call: PerfCall): boolean {
  return String(call.status ?? "active").toLowerCase() === "closed";
}

function normName(name: string): string {
  return name.replace(/\(.*?\)/g, "").trim().toLowerCase();
}

export function matchesAnalyst(callAnalyst: string | string[] | undefined, selected?: string | null): boolean {
  if (!selected) return true;
  if (!callAnalyst) return false;
  const target = normName(selected);
  const names = (Array.isArray(callAnalyst) ? callAnalyst : String(callAnalyst).split(","))
    .map(n => normName(String(n)))
    .filter(Boolean);
  return names.some(n => n === target || n.startsWith(target) || target.startsWith(n));
}

export function getEntryPrice(call: PerfCall): number | null {
  if (typeof call.entryPrice === "number" && call.entryPrice > 0) return call.entryPrice;
  if (typeof call.entryMin === "number" && typeof call.entryMax === "number" && call.entryMax > 0) {
    return (call.entryMin + call.entryMax) / 2;
  }
  return null;
}

// The 3 formulas — Price/Dividend/Total Return (mirror of web/lib/performance.ts).
export function priceReturnFrom(entry: number | null, current?: number | null): number | null {
  if (!entry || entry <= 0) return null;
  if (typeof current !== "number" || !Number.isFinite(current) || current <= 0) return null;
  return ((current - entry) / entry) * 100;
}
export function getDividendReturn(call: PerfCall): number {
  return typeof call.dividendReturn === "number" && Number.isFinite(call.dividendReturn) ? call.dividendReturn : 0;
}
/** Live unrealized Total Return (%) for an OPEN call. */
export function getLiveReturn(call: PerfCall): number | null {
  const pr = priceReturnFrom(getEntryPrice(call), call.currentPrice);
  return pr === null ? null : pr + getDividendReturn(call);
}

export function getRealizedReturn(call: PerfCall): number | null {
  if (!isClosed(call)) return null;
  if (typeof call.totalReturn === "number" && Number.isFinite(call.totalReturn)) return call.totalReturn;
  if (typeof call.realizedReturn === "number" && Number.isFinite(call.realizedReturn)) return call.realizedReturn + getDividendReturn(call);
  const pr = priceReturnFrom(getEntryPrice(call), call.closedPrice);
  if (pr !== null) return pr + getDividendReturn(call);
  if (typeof call.performance === "number" && Number.isFinite(call.performance)) return call.performance + getDividendReturn(call);
  return null;
}

export function getDurationDays(call: PerfCall): number | null {
  if (!isClosed(call)) return null;
  const start = parseCallDate(call.initiatedDate ?? call.date);
  const end = parseCallDate(call.closedDate);
  if (!start || !end) return null;
  const d = daysBetween(start, end);
  return d >= 0 ? d : null;
}

export function getBenchmarkReturn(call: PerfCall): number | null {
  for (const v of [call.egx30, call.egx30Capped, call.tadawul, call.sp500]) {
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) return v;
  }
  if (typeof call.egx30 === "number") return call.egx30;
  if (typeof call.egx30Capped === "number") return call.egx30Capped;
  if (typeof call.tadawul === "number") return call.tadawul;
  if (typeof call.sp500 === "number") return call.sp500;
  return null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeOverallPerformance(calls: PerfCall[], opts?: { publishableOnly?: boolean }): OverallPerformance {
  const allClosed = calls.filter(isClosed);
  const closed = opts?.publishableOnly ? allClosed.filter(isPublishable) : allClosed;
  const excludedCount = allClosed.length - closed.length;
  const activeCount = calls.length - allClosed.length;
  const returns = closed.map(getRealizedReturn).filter((r): r is number => r !== null && Number.isFinite(r));
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const durations = closed.map(getDurationDays).filter((d): d is number => d !== null);
  const benchmarks = closed.map(getBenchmarkReturn).filter((b): b is number => b !== null && Number.isFinite(b));
  const avgRealizedReturn = mean(returns);
  const benchmarkReturn = mean(benchmarks);
  return {
    totalCount: calls.length,
    activeCount,
    closedCount: closed.length,
    winCount: wins.length,
    lossCount: losses.length,
    hitRatio: returns.length > 0 ? (wins.length / returns.length) * 100 : null,
    avgRealizedReturn,
    avgWin: mean(wins),
    avgLoss: mean(losses),
    avgDurationDays: mean(durations),
    benchmarkReturn,
    alpha: avgRealizedReturn !== null && benchmarkReturn !== null ? avgRealizedReturn - benchmarkReturn : null,
    excludedCount,
  };
}

/** "65.8%" | "—" — formats a nullable metric with optional sign. */
export function fmtPct(v: number | null, digits = 1, sign = false): string {
  if (v === null) return "—";
  return `${sign && v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

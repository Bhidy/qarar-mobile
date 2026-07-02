/**
 * Market-status engine — the single source of truth for "is this market open?".
 *
 * Pure + dependency-free (Intl only) so the SAME logic runs on the server
 * (/api/feed, /api/cron/ingest, /api/cron/watchdog), the web client, and a
 * mirrored copy in the mobile app (mobile/lib/market-status.ts — keep in sync).
 *
 * Why this exists (2026-07-02 forensic audit): prices legitimately freeze on
 * weekends/holidays/after-hours, but nothing in the system knew the difference
 * between "market closed" and "feed broken". Users saw a frozen index during
 * the July-2 EGX holiday and read it as a defect; the freshness watchdog
 * cried STALE-FEED after every close. Every consumer now asks this engine first.
 *
 * Weekly schedule + session times are deterministic here; ad-hoc closures
 * (e.g. June-30 Revolution Day observed on Thu Jul 2 2026 — announced only
 * days ahead) live in the `market_calendar` table, which callers pass in.
 */

export type MarketKey = "egypt" | "saudi" | "usa";

export type MarketState =
  | "open"      // continuous trading session in progress
  | "preopen"   // pre-open auction / about to open (same trading day)
  | "closed"    // trading day, but before pre-open or after the close
  | "weekend"   // non-trading weekday
  | "holiday";  // market_calendar full-day closure

export interface HolidayRow {
  market: string;
  date: string;      // "YYYY-MM-DD" in the MARKET's local timezone
  kind: string;      // "holiday" | "half_day"
  note?: string | null;
}

export interface MarketStatus {
  market: MarketKey;
  state: MarketState;
  /** Holiday note when state==="holiday" (e.g. "Armed Forces Day"). */
  note: string | null;
  /** Market-local "YYYY-MM-DD". */
  localDate: string;
  /** Market-local "HH:MM". */
  localTime: string;
  /** Session bounds (market-local "HH:MM") for the CURRENT local date. */
  opensAt: string;
  closesAt: string;
  /** True when today is a trading day whose session already ended. */
  afterClose: boolean;
  /** Minutes into the session (state==="open" only) — watchdog rollover grace. */
  minutesSinceOpen: number | null;
  /** Minutes since today's close (afterClose only) — ingest close-tail window. */
  minutesPastClose: number | null;
}

interface SessionSpec {
  tz: string;
  /** Trading days as JS getDay() numbers in the market's local tz (0=Sun). */
  days: number[];
  preopenMin: number; // minutes-of-day
  openMin: number;
  closeMin: number;
  halfDayCloseMin: number; // close used when market_calendar kind==="half_day"
}

const SESSIONS: Record<MarketKey, SessionSpec> = {
  // EGX: Sun–Thu, pre-open auction 09:30–10:00, continuous 10:00–14:30 Cairo.
  egypt: { tz: "Africa/Cairo",      days: [0, 1, 2, 3, 4], preopenMin: 9 * 60 + 30, openMin: 10 * 60,     closeMin: 14 * 60 + 30, halfDayCloseMin: 12 * 60 },
  // Tadawul: Sun–Thu, auction 09:30–10:00, continuous 10:00–15:00 Riyadh.
  saudi: { tz: "Asia/Riyadh",       days: [0, 1, 2, 3, 4], preopenMin: 9 * 60 + 30, openMin: 10 * 60,     closeMin: 15 * 60,      halfDayCloseMin: 13 * 60 },
  // NYSE/Nasdaq: Mon–Fri 09:30–16:00 New York; half days close 13:00.
  usa:   { tz: "America/New_York",  days: [1, 2, 3, 4, 5], preopenMin: 9 * 60,      openMin: 9 * 60 + 30, closeMin: 16 * 60,      halfDayCloseMin: 13 * 60 },
};

/** Market-local {date, weekday, minutes-of-day} without any date library. */
function localParts(tz: string, now: Date): { date: string; day: number; min: number; hhmm: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const hour = Number(p.hour) % 24; // Intl can emit "24" for midnight
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    day: dayIdx,
    min: hour * 60 + Number(p.minute),
    hhmm: `${String(hour).padStart(2, "0")}:${p.minute}`,
  };
}

const asHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function getMarketStatus(market: MarketKey, holidays: HolidayRow[] | null | undefined, now: Date = new Date()): MarketStatus {
  const spec = SESSIONS[market];
  const loc = localParts(spec.tz, now);
  const cal = (holidays ?? []).find((h) => h.market === market && h.date === loc.date) ?? null;

  let closeMin = spec.closeMin;
  if (cal?.kind === "half_day") closeMin = spec.halfDayCloseMin;

  const base: Omit<MarketStatus, "state" | "note" | "afterClose" | "minutesSinceOpen" | "minutesPastClose"> = {
    market, localDate: loc.date, localTime: loc.hhmm,
    opensAt: asHHMM(spec.openMin), closesAt: asHHMM(closeMin),
  };

  if (cal && cal.kind !== "half_day") {
    return { ...base, state: "holiday", note: cal.note ?? "Market holiday", afterClose: false, minutesSinceOpen: null, minutesPastClose: null };
  }
  if (!spec.days.includes(loc.day)) {
    return { ...base, state: "weekend", note: null, afterClose: false, minutesSinceOpen: null, minutesPastClose: null };
  }
  if (loc.min >= spec.openMin && loc.min < closeMin) {
    return { ...base, state: "open", note: cal?.note ?? null, afterClose: false, minutesSinceOpen: loc.min - spec.openMin, minutesPastClose: null };
  }
  if (loc.min >= spec.preopenMin && loc.min < spec.openMin) {
    return { ...base, state: "preopen", note: cal?.note ?? null, afterClose: false, minutesSinceOpen: null, minutesPastClose: null };
  }
  const afterClose = loc.min >= closeMin;
  return { ...base, state: "closed", note: cal?.note ?? null, afterClose, minutesSinceOpen: null, minutesPastClose: afterClose ? loc.min - closeMin : null };
}

export function getAllMarketStatuses(holidays: HolidayRow[] | null | undefined, now: Date = new Date()): Record<MarketKey, MarketStatus> {
  return {
    egypt: getMarketStatus("egypt", holidays, now),
    saudi: getMarketStatus("saudi", holidays, now),
    usa: getMarketStatus("usa", holidays, now),
  };
}

/**
 * True when the ingest should still fetch this market: in session, entering it,
 * or within the post-close tail — a 15-min DELAYED vendor keeps publishing the
 * session's final bars for ~30 min after the bell; skipping immediately at close
 * would freeze the day's official close ~20 min short.
 */
export function isIngestWindow(status: MarketStatus, tailMin = 60): boolean {
  if (status.state === "open" || status.state === "preopen") return true;
  return status.afterClose && status.minutesPastClose != null && status.minutesPastClose <= tailMin;
}

/** Format a prices.asOf timestamp as market-local "HH:MM" for display. */
export function formatAsOfLocal(asOfIso: string | null | undefined, market: MarketKey): string | null {
  if (!asOfIso) return null;
  const d = new Date(asOfIso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: SESSIONS[market].tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

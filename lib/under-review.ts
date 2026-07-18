/**
 * AUTO "UNDER REVIEW" — display helper (mirror of web lib/under-review.ts;
 * keep in sync). The flag itself is SERVER-OWNED: set by the web ingest sweep
 * when the feed price crosses the analyst's fairValue in the call's direction,
 * cleared only by the analyst's admin save. Mobile only RENDERS it.
 *
 * Rule: on ACTIVE market surfaces (home rows, fundamental cards, stock header)
 * a flagged call shows "Under Review" instead of its Buy/Sell rating. RECORD
 * surfaces (closed cards, performance/track-record tables, update history)
 * keep the real signal — pass the raw signal there instead of calling this.
 */
export const UNDER_REVIEW_SIGNAL = "Under Review";

export function displaySignal(
  call: { signal?: string | null; status?: string | null; underReview?: boolean | null } | null | undefined,
): string {
  if (!call) return "";
  const closed = String(call.status ?? "active").toLowerCase() === "closed";
  if (!closed && call.underReview === true) return UNDER_REVIEW_SIGNAL;
  return String(call.signal ?? "");
}

// Canonical display date format for the mobile app: DD/MM/YYYY (EN + AR).
// Mirrors web/lib/utils.ts `formatDate`. A SELF-CONTAINED, safe display
// formatter — it converts every stored/entered format we've observed to
// DD/MM/YYYY and NEVER throws or fabricates: an unrecognised string is returned
// unchanged (so a malformed legacy value degrades to itself, not a crash).

const _MON3: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const _yr = (y: number) => (y < 100 ? 2000 + y : y);
const _p2 = (n: number) => String(n).padStart(2, "0");
const _ddmmyyyy = (d: number, m: number, y: number) =>
  d >= 1 && d <= 31 && m >= 1 && m <= 12 ? `${_p2(d)}/${_p2(m)}/${y}` : "";

export function formatDate(input?: string | null): string {
  if (input == null || typeof input !== "string") return input ?? "";
  const s = input.trim();
  if (!s) return s;
  let m: RegExpMatchArray | null;

  // ISO — 2026-05-12 / 2026-05-12T10:00:00Z
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return _ddmmyyyy(+m[3], +m[2], +m[1]) || s;
  // "12 May 26" / "12 May 2026"  (day · month-name · year)
  if ((m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{2,4})$/))) {
    const mo = _MON3[m[2].slice(0, 3).toLowerCase()];
    if (mo) return _ddmmyyyy(+m[1], mo, _yr(+m[3])) || s;
  }
  // "May 12, 2026"  (month-name · day · year — comma REQUIRED)
  if ((m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),\s*(\d{2,4})$/))) {
    const mo = _MON3[m[1].slice(0, 3).toLowerCase()];
    if (mo) return _ddmmyyyy(+m[2], mo, _yr(+m[3])) || s;
  }
  // Legacy "May 26 12" / "Apr 26 22" (month-name · 2-digit YEAR · day, no comma)
  if ((m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{2})\s+(\d{1,2})$/))) {
    const mo = _MON3[m[1].slice(0, 3).toLowerCase()];
    if (mo) return _ddmmyyyy(+m[3], mo, _yr(+m[2])) || s;
  }
  // "12/05/2026" / "12/5/26"
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) return _ddmmyyyy(+m[1], +m[2], _yr(+m[3])) || s;

  return s; // month-only ("Jan 26") or anything unrecognised → leave untouched
}

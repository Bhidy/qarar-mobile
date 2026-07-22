/**
 * company-name — ONE ticker→company-name truth for the whole app.
 *
 * Every surface that prints a bare symbol (home Calls Summary, call cards,
 * watchlist, search, the stock header) resolves the display name through this
 * module, so a stock is never called "ETEL" on one screen and
 * "ETEL / المصرية للاتصالات" on another.
 *
 * Byte-for-byte mirror of web/lib/company-name.ts — keep the two in sync.
 *
 * Sources, in precedence order (first non-empty value PER LANGUAGE wins):
 *   1. the analyst's own `company` / `companyAr` on a published call — editorial
 *      input beats the feed, and it is the only source that covers US symbols
 *      (symbol_master carries EGX + Tadawul only).
 *   2. `symbol_master` — the Mubasher symbol table (RT=52). 1,049 rows, 100%
 *      populated in BOTH languages; this is what fills every gap.
 *   3. `companies` — the rich Mubasher profile. Last resort only: ~57% of its
 *      rows key `ticker` with a company name rather than a symbol, and its
 *      `nameAr` column is empty for every row (verified 2026-07-22).
 *
 * Missing name ⇒ empty string, never the ticker echoed back and never a
 * fabricated placeholder. Callers render nothing instead of a fake second line.
 */

export type NameEntry = { en?: string; ar?: string };
export type CompanyNames = Record<string, NameEntry>;

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Fold one row into the map. First non-empty value per language wins, so calling
 * order IS the precedence order — later sources only fill gaps, never overwrite.
 */
export function addCompanyName(map: CompanyNames, ticker: unknown, en?: unknown, ar?: unknown): void {
  const key = clean(ticker).toUpperCase();
  if (!key) return;
  const e = clean(en);
  const a = clean(ar);
  if (!e && !a) return;
  const cur = (map[key] ??= {});
  if (e && !cur.en) cur.en = e;
  if (a && !cur.ar) cur.ar = a;
}

/** Build the map from ordered sources. Earlier sources win (see addCompanyName). */
export function buildCompanyNames(
  sources: { rows?: any[] | null; en: string; ar?: string; ticker?: string }[],
): CompanyNames {
  const map: CompanyNames = {};
  for (const src of sources) {
    const tk = src.ticker ?? "ticker";
    for (const row of src.rows ?? []) {
      if (!row) continue;
      addCompanyName(map, row[tk], row[src.en], src.ar ? row[src.ar] : undefined);
    }
  }
  return map;
}

/**
 * Display name for a ticker in the reader's language. Falls back to the other
 * language when one side is missing (US symbols have no Arabic name), then to
 * "" — the caller decides what an unknown name looks like.
 */
export function resolveCompanyName(
  map: CompanyNames,
  ticker: string | null | undefined,
  isAr: boolean,
): string {
  const key = clean(ticker).toUpperCase();
  if (!key) return "";
  const e = map[key];
  if (!e) return "";
  return (isAr ? e.ar || e.en : e.en || e.ar) ?? "";
}

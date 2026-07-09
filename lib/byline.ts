/**
 * Byline localization — owner rule: NO English text in Arabic mode.
 * The data layer injects "Smart Signals Research" as the house byline when a
 * report has no author; in Arabic that must render as the Arabic research-desk
 * byline (brand name stays latin, like a logo). Also joins multi-author lists
 * with the Arabic comma in AR. Mirror: web/lib/byline.ts.
 */
const HOUSE_EN = "Smart Signals Research";
const HOUSE_AR = "فريق أبحاث Smart Signals";

export function displayAuthor(name: string | undefined, isAr: boolean): string {
  const n = (name ?? "").trim();
  return isAr && n === HOUSE_EN ? HOUSE_AR : n;
}

export function displayAuthors(authors: string[] | string | undefined, isAr: boolean): string {
  const list = (Array.isArray(authors) ? authors : [authors]).filter(Boolean) as string[];
  return list.map((a) => displayAuthor(a, isAr)).join(isAr ? "، " : ", ");
}

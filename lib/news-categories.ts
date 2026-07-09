/** News category chip labels (EN/AR) — single source for the news list chips
 *  AND the article-detail kicker (which previously rendered raw English —
 *  "CORPORATE" — in Arabic mode). Keys match the web CATEGORY_LABEL_AR 1:1. */
export const CATEGORY_LABEL: Record<string, { en: string; ar: string }> = {
  Earnings:  { en: "Earnings",  ar: "أرباح" },
  Corporate: { en: "Corporate", ar: "شركات" },
  Macro:     { en: "Macro",     ar: "اقتصاد كلي" },
  Global:    { en: "Global",    ar: "عالمي" },
  Market:    { en: "Market",    ar: "سوق" },
  IPO:       { en: "IPO",       ar: "اكتتاب" },
};

export function categoryLabel(category: string | undefined | null, isAr: boolean): string {
  const c = String(category ?? "").trim();
  if (!c) return "";
  const hit = CATEGORY_LABEL[c];
  return hit ? (isAr ? hit.ar : hit.en) : c;
}

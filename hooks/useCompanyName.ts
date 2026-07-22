/**
 * useCompanyName — the one way a screen turns a ticker into a display name.
 *
 * Mirror of web/hooks/useCompanyName.ts. Resolves against useData()'s
 * COMPANY_NAMES map in the reader's language (analyst call text →
 * symbol_master → companies profile; see lib/company-name). Returns "" when no
 * name is known, so a card renders nothing rather than echoing the ticker back
 * or inventing a placeholder.
 *
 *   const companyName = useCompanyName();
 *   <Text>{companyName("ETEL")}</Text>   // "المصرية للاتصالات" in AR
 *
 * `fallback` is the record's OWN text (an analyst's editorial name on that
 * call); it wins when present, and the map fills every other case.
 */
import { useCallback } from "react";
import { useData } from "@/hooks/useData";
import { useTheme } from "@/context/ThemeContext";
import { resolveCompanyName } from "@/lib/company-name";

export function useCompanyName() {
  const { COMPANY_NAMES } = useData();
  const { language } = useTheme();
  const isAr = language === "ar";

  return useCallback(
    (ticker?: string | null, fallback?: { en?: string | null; ar?: string | null }) => {
      const own = (isAr ? fallback?.ar || fallback?.en : fallback?.en || fallback?.ar) ?? "";
      return own.trim() || resolveCompanyName(COMPANY_NAMES, ticker, isAr);
    },
    [COMPANY_NAMES, isAr],
  );
}

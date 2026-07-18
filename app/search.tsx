import { useMemo, useState } from "react";
import { View, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme, MARKETS_ENABLED } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { visibleCallUpdates } from "@/lib/call-updates";
import { useData } from "@/hooks/useData";
import { displaySignal } from "@/lib/under-review";

const has = (s: any, q: string) => typeof s === "string" && s.toLowerCase().includes(q);

// Whole-word match for PROSE fields (titles / company names) so a ticker query
// like "COMI" never matches inside "upcoming"/"economic". The query must sit on
// token boundaries (non-alphanumeric on both sides). Implemented with a manual
// indexOf scan — NOT a regex lookbehind, which Hermes doesn't reliably support.
// Ticker fields keep the plain substring `has` (exact/prefix behaviour unchanged).
const isAlnum = (ch: string) => /[a-z0-9؀-ۿ]/i.test(ch);
const hasWord = (s: any, q: string) => {
  if (typeof s !== "string" || !q) return false;
  const hay = s.toLowerCase();
  let idx = hay.indexOf(q);
  while (idx !== -1) {
    const before = idx > 0 ? hay[idx - 1] : "";
    const after = idx + q.length < hay.length ? hay[idx + q.length] : "";
    if ((!before || !isAlnum(before)) && (!after || !isAlnum(after))) return true;
    idx = hay.indexOf(q, idx + 1);
  }
  return false;
};

type Hit = { key: string; ticker?: string; title: string; subtitle?: string; signal?: string; market?: string; updates?: number; go: () => void };

/** Site-wide search by company symbol (#6) — mirrors web: market-spanning, grouped
 *  results (Calls / Reports / News / Research) over the already-loaded content. */
export default function SearchScreen() {
  const C = useColors();
  const { language, isRTL, market } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const {
    FUNDAMENTAL_CALLS, TECHNICAL_CALLS, SAUDI_FUNDAMENTAL, SAUDI_TECHNICAL,
    USA_FUNDAMENTAL, USA_TECHNICAL, USA_NEWS,
    ARTICLES, SAUDI_ARTICLES, TECHNICAL_ARTICLES, NEWS, SAUDI_NEWS,
  } = useData();

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (q.length < 1) return null;
    const calls: Hit[] = [];
    const seen = new Set<string>();
    const pushCall = (c: any, market: string, kind: string) => {
      const tk = String(c.ticker ?? "");
      if (!(has(tk, q) || hasWord(c.company, q) || hasWord(c.companyAr, q))) return;
      const k = `${kind}:${tk}:${market}`;
      if (seen.has(k)) return; seen.add(k);
      calls.push({
        key: k, ticker: tk, signal: displaySignal(c), market,
        title: isAr ? (c.companyAr || c.company || tk) : (c.company || tk),
        subtitle: kind === "f" ? (isAr ? "توصية أساسية" : "Fundamental call") : (isAr ? "توصية فنية" : "Technical call"),
        updates: visibleCallUpdates(c.updates).length,
        go: () => router.push({ pathname: "/stock/[ticker]", params: { ticker: tk } }),
      });
    };
    (FUNDAMENTAL_CALLS as any[]).forEach(c => pushCall(c, "egypt", "f"));
    (TECHNICAL_CALLS as any[]).forEach(c => pushCall(c, "egypt", "t"));
    (SAUDI_FUNDAMENTAL as any[]).forEach(c => pushCall(c, "saudi", "f"));
    (SAUDI_TECHNICAL as any[]).forEach(c => pushCall(c, "saudi", "t"));
    (USA_FUNDAMENTAL as any[]).forEach(c => pushCall(c, "usa", "f"));
    (USA_TECHNICAL as any[]).forEach(c => pushCall(c, "usa", "t"));

    const reports: Hit[] = [];
    [...(ARTICLES as any[]), ...(SAUDI_ARTICLES as any[])].forEach((a: any) => {
      if (has(a.ticker, q) || hasWord(a.title, q) || hasWord(a.titleAr, q)) {
        reports.push({
          key: `art:${a.id}`, ticker: a.ticker, market: a.market,
          title: isAr && a.titleAr ? a.titleAr : a.title, subtitle: a.section,
          go: () => router.push({ pathname: "/article/[id]", params: { id: a.id } }),
        });
      }
    });
    (TECHNICAL_ARTICLES as any[]).forEach((a: any) => {
      if (has(a.ticker, q) || hasWord(a.title, q) || hasWord(a.titleAr, q)) {
        reports.push({
          key: `ta:${a.id}`, ticker: a.ticker, market: a.market,
          title: isAr && a.titleAr ? a.titleAr : a.title, subtitle: isAr ? "تقرير فني" : "Technical report",
          go: () => router.push({ pathname: "/technical-article/[id]", params: { id: a.id } }),
        });
      }
    });

    const news: Hit[] = [];
    const seenN = new Set<string>();
    [...(NEWS as any[]), ...(SAUDI_NEWS as any[]), ...(USA_NEWS as any[])].forEach((n: any) => {
      if (seenN.has(n.id)) return;
      if (has(n.ticker, q) || hasWord(n.title, q) || hasWord(n.titleAr, q)) {
        seenN.add(n.id);
        news.push({
          key: `news:${n.id}`, ticker: n.ticker, market: n.market,
          title: isAr && n.titleAr ? n.titleAr : n.title, subtitle: n.source || (isAr ? "خبر" : "News"),
          go: () => router.push({ pathname: "/news/[id]", params: { id: n.id } }),
        });
      }
    });

    // Market lock: never surface results from a disabled market (Saudi/USA) while
    // the app is Egypt-only. undefined/"both" = Egypt-inclusive → kept.
    const keepMkt = (m?: string) => !m || m === "both" || MARKETS_ENABLED.includes(m as any);
    return {
      calls:   calls.filter(h => keepMkt(h.market)),
      reports: reports.filter(h => keepMkt(h.market)),
      news:    news.filter(h => keepMkt(h.market)),
    };
  }, [q, isAr, FUNDAMENTAL_CALLS, TECHNICAL_CALLS, SAUDI_FUNDAMENTAL, SAUDI_TECHNICAL, USA_FUNDAMENTAL, USA_TECHNICAL, USA_NEWS, ARTICLES, SAUDI_ARTICLES, TECHNICAL_ARTICLES, NEWS, SAUDI_NEWS]);

  const total = groups ? groups.calls.length + groups.reports.length + groups.news.length : 0;

  const Row = ({ hit }: { hit: Hit }) => (
    <Pressable onPress={hit.go} style={[styles.row, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && styles.rowRTL]}>
      {hit.ticker ? (
        // Company logo tile (shared TickerLogo: local SVG → CDN → initials fallback).
        <TickerLogo ticker={hit.ticker} size={34} />
      ) : (
        <View style={[styles.rowIcon, { backgroundColor: C.bg.elevated }]}>
          <Ionicons name="document-text-outline" size={16} color={C.text.muted} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={[styles.rowTop, isRTL && styles.rowRTL]}>
          {hit.ticker ? <Text style={[styles.rowSymbol, { color: C.text.primary, fontFamily: ff("800") }]}>{hit.ticker}</Text> : null}
          {hit.signal ? <SignalBadge signal={hit.signal} size="sm" /> : null}
          {hit.market ? <Text style={styles.flag} accessibilityLabel={hit.market === "usa" ? "NYSE/NASDAQ" : hit.market === "saudi" ? "Tadawul" : "EGX"}>{hit.market === "usa" ? "🇺🇸" : hit.market === "saudi" ? "🇸🇦" : "🇪🇬"}</Text> : null}
          {hit.updates ? (
            <View style={[styles.upd, { backgroundColor: `${C.primary}14`, borderColor: `${C.primary}40` }]}>
              <Text style={[styles.updText, { color: C.primary, fontFamily: ff("700") }]}>{hit.updates} {isAr ? "تحديثات" : "updates"}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.rowTitle, { color: C.text.primary, fontFamily: ff("600"), textAlign: isAr ? "right" : "left" }]}>{hit.title}</Text>
        {hit.subtitle ? <Text numberOfLines={1} style={[styles.rowSub, { color: C.text.muted, textAlign: isAr ? "right" : "left" }]}>{hit.subtitle}</Text> : null}
      </View>
      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={C.text.muted} />
    </Pressable>
  );

  const Group = ({ icon, title, hits }: { icon: any; title: string; hits: Hit[] }) => {
    if (hits.length === 0) return null;
    return (
      <View style={{ gap: Spacing[2] }}>
        <View style={[styles.groupHead, isRTL && styles.rowRTL]}>
          <Ionicons name={icon} size={15} color={C.primary} />
          <Text style={[styles.groupTitle, { color: C.text.primary, fontFamily: ff("700") }]}>{title}</Text>
          <Text style={[styles.groupCount, { color: C.text.muted }]}>({hits.length})</Text>
        </View>
        {hits.map(h => <Row key={h.key} hit={h} />)}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary, fontFamily: ff("700") }]}>{isAr ? "بحث" : "Search"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && styles.rowRTL]}>
          <Ionicons name="search" size={16} color={C.text.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={
              // Market-aware examples: Tadawul = numeric symbols, EGX = Latin tickers.
              market === "saudi"
                ? (isAr ? "ابحث بالرمز… مثل 2222، 1120" : "Search by symbol… e.g. 2222, 1120")
                : market === "usa"
                ? (isAr ? "ابحث بالرمز… مثل AAPL، MSFT" : "Search by symbol… e.g. AAPL, MSFT")
                : (isAr ? "ابحث بالرمز… مثل COMI، TMGH" : "Search by symbol… e.g. COMI, TMGH")
            }
            placeholderTextColor={C.text.muted}
            style={[styles.input, { color: C.text.primary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left" }]}
            autoCapitalize="characters"
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }} keyboardShouldPersistTaps="handled">
        {!groups ? (
          <View style={styles.empty}>
            <Ionicons name="search" size={36} color={C.text.muted} />
            <Text style={[styles.emptyText, { color: C.text.muted }]}>{isAr ? "اكتب رمز الشركة للبحث." : "Type a company symbol to search."}</Text>
          </View>
        ) : total === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: C.text.muted }]}>{isAr ? `لا توجد نتائج لـ "${query}".` : `No results for "${query}".`}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.totalLine, { color: C.text.muted, textAlign: isAr ? "right" : "left" }]}>{total} {isAr ? "نتيجة" : "results"}</Text>
            <Group icon="bar-chart-outline" title={isAr ? "التوصيات" : "Calls"} hits={groups.calls} />
            <Group icon="document-text-outline" title={isAr ? "التقارير والمقالات" : "Reports & Articles"} hits={groups.reports} />
            <Group icon="newspaper-outline" title={isAr ? "الأخبار" : "News"} hits={groups.news} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: Typography.base, fontWeight: "700", textAlign: "center" },
  searchWrap: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3], paddingBottom: Spacing[2] },
  searchBox: { flexDirection: "row", alignItems: "center", gap: Spacing[2], height: 46, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing[3] },
  input: { flex: 1, fontSize: Typography.base, padding: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.lg, borderWidth: 1 },
  rowRTL: { flexDirection: "row-reverse" },
  rowIcon: { width: 38, height: 38, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  rowTicker: { fontSize: 11, fontWeight: "800" },
  rowSymbol: { fontSize: Typography.sm, fontWeight: "800", letterSpacing: 0.5 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  flag: { fontSize: 11 },
  upd: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full, borderWidth: 1 },
  updText: { fontSize: 10, fontWeight: "700" },
  rowTitle: { fontSize: Typography.sm, fontWeight: "600" },
  rowSub: { fontSize: 11, textTransform: "capitalize" },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupTitle: { fontSize: Typography.sm, fontWeight: "700" },
  groupCount: { fontSize: 12 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: Spacing[2] },
  emptyText: { fontSize: Typography.sm, textAlign: "center" },
  totalLine: { fontSize: 12 },
});

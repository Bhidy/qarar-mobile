import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format-date";
import { View, StyleSheet, Pressable, FlatList, RefreshControl, TextInput, ScrollView } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { NewsCover } from "@/components/shared/NewsCover";
import { AnnouncementsSection } from "@/components/news/AnnouncementsSection";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

import { CATEGORY_LABEL } from "@/lib/news-categories";

type NewsTab = "market" | "announcements";

const isArabicText = (s?: string | null) => !!s && /[؀-ۿ]/.test(s);

export default function NewsTabScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { NEWS, SAUDI_NEWS, loading, refetch } = useData();
  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const [activeTab, setActiveTab] = useState<NewsTab>("market");
  // Search + category filter on the market-news list. Mirrors web /news exactly.
  // "all" = no filter; categories match the web `CATEGORY_LABEL` keys 1:1.
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  // 1. language filter — STRICT (both Egypt and Saudi pools): the DISPLAY title
  //    (titleAr-first in AR, title in EN) must be genuinely in the UI language —
  //    AR mode requires real Arabic script, EN mode rejects any Arabic script.
  //    Empty titles are dropped defensively.
  const langFiltered = useMemo(() => {
    return (isSaudi ? SAUDI_NEWS : NEWS).filter((n: any) => {
      const display = isAr
        ? String(n.titleAr ?? "").trim() || String(n.title ?? "").trim()
        : String(n.title ?? "").trim();
      if (!display) return false;
      return isAr ? isArabicText(display) : !isArabicText(display);
    });
  }, [NEWS, SAUDI_NEWS, isSaudi, isAr]);

  // 2. category + search filter — only the categories actually present this session
  //    are surfaced as chips, so we never show "IPO" if no IPO story exists.
  const presentCategories = useMemo(() => {
    const set = new Set<string>();
    langFiltered.forEach((n: any) => { if (n.category) set.add(String(n.category)); });
    return Array.from(set);
  }, [langFiltered]);

  const news = useMemo(() => {
    const q = query.trim().toLowerCase();
    return langFiltered.filter((n: any) => {
      if (category !== "all" && String(n.category || "") !== category) return false;
      if (!q) return true;
      const title  = String(n.title   || "").toLowerCase();
      const titleA = String(n.titleAr || "").toLowerCase();
      const src    = String(n.source  || "").toLowerCase();
      const tkr    = String(n.ticker  || "").toLowerCase();
      return title.includes(q) || titleA.includes(q) || src.includes(q) || tkr.includes(q);
    });
  }, [langFiltered, query, category]);

  const tabs: { key: NewsTab; en: string; ar: string }[] = [
    { key: "market",        en: "Market News",   ar: "أخبار السوق" },
    { key: "announcements", en: "Announcements", ar: "الإفصاحات" },
  ];

  const pageTitle = isSaudi
    ? (isAr ? "أخبار تداول" : "Tadawul News")
    : (isAr ? "الأخبار" : "News");

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg.base }]} edges={["top"]}>

      {/* Page header */}
      <View style={[s.header, { borderBottomColor: C.border.subtle }]}>
        {/* Unified header (Profile / Bell / Search). noBorder → divider stays below the tabs/search. */}
        <ScreenHeader
          title="News" titleAr="الأخبار"
          subtitle="Market news & company updates" subtitleAr="أخبار ومستجدات السوق"
          icon="newspaper" noBorder
        />

        {/* Tab switcher — row-reversed in Arabic so "أخبار السوق" (market news) is the FIRST (rightmost) tab */}
        <View style={[s.tabBar, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isAr && s.rowRTL]}>
          {tabs.map(t => {
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[s.tabBtn, active && { backgroundColor: C.primary }]}
              >
                <Text style={[s.tabLabel, { color: active ? "#fff" : C.text.muted, fontFamily: ff("700") }]}>
                  {isAr ? t.ar : t.en}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Search + category chips — market-news only (announcements has its own UI) */}
        {activeTab === "market" && (
          <View style={{ marginTop: Spacing[3], gap: Spacing[2] }}>
            <View style={[s.searchWrap, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && s.rowRTL]}>
              <Ionicons name="search" size={15} color={C.text.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={isAr ? "ابحث في العناوين، الرموز، المصدر…" : "Search headlines, tickers, source…"}
                placeholderTextColor={C.text.muted}
                style={[s.searchInput, { color: C.text.primary, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }]}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {!!query && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={C.text.muted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                { gap: 8, paddingVertical: 2, paddingHorizontal: Spacing[4] },
                // True RTL: `inverted` is a no-op on ScrollView. Reverse the data and
                // push the row to the right edge so "الكل" sits at the right in Arabic.
                isAr && { flexGrow: 1, justifyContent: "flex-end" as const },
              ]}
            >
              {(isAr ? [...["all", ...presentCategories]].reverse() : ["all", ...presentCategories]).map(key => {
                const active = category === key;
                const label = key === "all"
                  ? (isAr ? "الكل" : "All")
                  : (CATEGORY_LABEL[key] ? (isAr ? CATEGORY_LABEL[key].ar : CATEGORY_LABEL[key].en) : key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => setCategory(key)}
                    style={[
                      s.chip,
                      { backgroundColor: active ? C.primary : C.bg.surface, borderColor: active ? C.primary : C.border.subtle },
                    ]}
                  >
                    <Text style={[s.chipLabel, { color: active ? "#fff" : C.text.secondary, fontFamily: ff("700") }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Content */}
      {activeTab === "market" ? (
        <FlatList
          data={news as any[]}
          keyExtractor={(item: any) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing[4], paddingBottom: TAB_BAR_CLEARANCE, gap: Spacing[3] }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="newspaper-outline" size={28} color={C.text.muted} />
              <Text style={[s.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
                {isAr ? "لا توجد أخبار حالياً" : "No news available right now"}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const cat = item.category as string | undefined;
            const label = cat ? (CATEGORY_LABEL[cat] ?? { en: cat, ar: cat }) : null;
            const title = isAr && item.titleAr ? item.titleAr : item.title;
            const titleAr = isArabicText(title);
            const source = item.source ?? cat ?? "";
            return (
              <Pressable
                onPress={() => router.push({ pathname: "/news/[id]", params: { id: String(item.id) } })}
                style={({ pressed }) => [s.card, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, pressed && { opacity: 0.85 }]}
              >
                <NewsCover id={String(item.id)} image={item.image} ticker={item.ticker} category={cat} height={150} radius={0} />
                <View style={s.cardBody}>
                  <View style={[s.metaRow, isRTL && s.rowRTL]}>
                    {label && (
                      <View style={[s.pill, { backgroundColor: `${C.accent.gold}1A` }]}>
                        <Text style={[s.pillText, { color: C.accent.gold, fontFamily: ff("700") }]}>
                          {isAr ? label.ar : label.en}
                        </Text>
                      </View>
                    )}
                    {!!source && (
                      <Text style={[s.source, { color: C.text.muted, fontFamily: ff("600") }]} numberOfLines={1}>
                        {source}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[s.cardTitle, { color: C.text.primary, fontFamily: ff("700") }, titleAr && s.textRight]}
                    numberOfLines={3}
                  >
                    {title}
                  </Text>
                  {!!item.date && (
                    <Text style={[s.date, { color: C.text.muted, fontFamily: ff("400") }, isRTL && s.textRight]}>
                      {formatDate(item.date)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <AnnouncementsSection />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  rowRTL:       { flexDirection: "row-reverse" },
  textRight:    { textAlign: "right", writingDirection: "rtl" },
  header:       { borderBottomWidth: 1, paddingTop: Spacing[3], paddingBottom: Spacing[3] },
  headerRow:    { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  headerIcon:   { width: 40, height: 40, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pageTitle:    { fontSize: Typography.lg, fontWeight: "800" },
  pageSubtitle: { fontSize: Typography.xs, marginTop: 1 },
  tabBar:       { flexDirection: "row", marginHorizontal: Spacing[4], marginBottom: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, padding: 3, gap: 3 },
  tabBtn:       { flex: 1, paddingVertical: 7, borderRadius: Radius.md, alignItems: "center" },
  tabLabel:     { fontSize: Typography.xs, fontWeight: "700" },
  card:         { borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  cardBody:     { padding: Spacing[4], gap: Spacing[2] },
  metaRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing[2] },
  pill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText:     { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  source:       { fontSize: Typography.xs, flexShrink: 1, textAlign: "right" },
  cardTitle:    { fontSize: Typography.sm, lineHeight: 20 },
  date:         { fontSize: Typography.xs },
  empty:        { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: Spacing[2] },
  emptyText:    { fontSize: Typography.sm, textAlign: "center" },

  // Search + filter chips (parity with web /news)
  searchWrap:   { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, marginHorizontal: Spacing[4] },
  searchInput:  { flex: 1, fontSize: Typography.sm, paddingVertical: 0, minHeight: 22 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, marginInline: 1 },
  chipLabel:    { fontSize: 11.5, letterSpacing: 0.2 },
});

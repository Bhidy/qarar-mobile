import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format-date";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { NewsCover } from "@/components/shared/NewsCover";
import { AnnouncementsSection } from "@/components/news/AnnouncementsSection";

type NewsTab = "market" | "announcements";

const CATEGORY_LABEL: Record<string, { en: string; ar: string }> = {
  Earnings:  { en: "Earnings",  ar: "أرباح" },
  Corporate: { en: "Corporate", ar: "شركات" },
  Macro:     { en: "Macro",     ar: "اقتصاد كلي" },
  Global:    { en: "Global",    ar: "عالمي" },
  Market:    { en: "Market",    ar: "سوق" },
  IPO:       { en: "IPO",       ar: "اكتتاب" },
};

const isArabicText = (s?: string | null) => !!s && /[؀-ۿ]/.test(s);

export default function AllNewsScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { NEWS, SAUDI_NEWS } = useData();
  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const [activeTab, setActiveTab] = useState<NewsTab>("market");

  // Language strictness (applies to BOTH the Egypt and Saudi pools): the DISPLAY
  // title (titleAr-first in AR, title in EN) must be genuinely in the UI language —
  // AR mode requires real Arabic script, EN mode rejects any Arabic script.
  // Empty titles are dropped defensively.
  const news = useMemo(() => {
    return (isSaudi ? SAUDI_NEWS : NEWS).filter((n: any) => {
      const display = isAr
        ? String(n.titleAr ?? "").trim() || String(n.title ?? "").trim()
        : String(n.title ?? "").trim();
      if (!display) return false;
      return isAr ? isArabicText(display) : !isArabicText(display);
    });
  }, [NEWS, SAUDI_NEWS, isSaudi, isAr]);

  const tabs: { key: NewsTab; en: string; ar: string }[] = [
    { key: "market",        en: "Market News",   ar: "أخبار السوق" },
    { key: "announcements", en: "Announcements", ar: "الإفصاحات" },
  ];

  const pageTitle = isSaudi
    ? (isAr ? "أخبار تداول" : "Tadawul News")
    : (isAr ? "أخبار السوق" : "Market News");

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg.base }]} edges={["top"]}>

      {/* Header with back button */}
      <View style={[s.header, { borderBottomColor: C.border.subtle }]}>
        <View style={[s.headerTop, isRTL && s.rowRTL]}>
          <Pressable style={[s.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
          </Pressable>
          <Text style={[s.pageTitle, { color: C.text.primary, fontFamily: ff("700") }]}>
            {pageTitle}
          </Text>
          <View style={{ width: 36 }} />
        </View>

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
      </View>

      {/* Content */}
      {activeTab === "market" ? (
        <FlatList
          data={news as any[]}
          keyExtractor={(item: any) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing[4], gap: Spacing[3] }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="newspaper-outline" size={28} color={C.text.muted} />
              <Text style={[s.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
                {isAr ? "لا توجد أخبار بالعربية حالياً" : "No English news available right now"}
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
  safe:      { flex: 1 },
  rowRTL:    { flexDirection: "row-reverse" },
  textRight: { textAlign: "right", writingDirection: "rtl" },
  header:    { borderBottomWidth: 1, paddingTop: Spacing[1] },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  backBtn:   { width: 36, height: 36, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: Typography.base, fontWeight: "700" },
  tabBar:    { flexDirection: "row", marginHorizontal: Spacing[4], marginBottom: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, padding: 3, gap: 3 },
  tabBtn:    { flex: 1, paddingVertical: 7, borderRadius: Radius.md, alignItems: "center" },
  tabLabel:  { fontSize: Typography.xs, fontWeight: "700" },
  card:      { borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  cardBody:  { padding: Spacing[4], gap: Spacing[2] },
  metaRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing[2] },
  pill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText:  { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  source:    { fontSize: Typography.xs, flexShrink: 1, textAlign: "right" },
  cardTitle: { fontSize: Typography.sm, lineHeight: 20 },
  date:      { fontSize: Typography.xs },
  empty:     { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: Spacing[2] },
  emptyText: { fontSize: Typography.sm, textAlign: "center" },
});

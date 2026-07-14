import { ScrollView, View, StyleSheet, Pressable, FlatList, RefreshControl } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { ContentCard } from "@/components/shared/ContentCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { NewsCover } from "@/components/shared/NewsCover";
import { EmptyState } from "@/components/shared/EmptyState";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";

function HSection({ title, subtitle, icon, items, iconColor, C, fontFamily, isRTL, emptyTitle }: {
  title: string; subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: any[]; iconColor: string; C: any;
  isRTL: boolean;
  emptyTitle?: string;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionPad}>
        <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
          <View style={[styles.sectionIcon, { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30` }]}>
            <Ionicons name={icon} size={14} color={iconColor} />
          </View>
          <SectionHeader title={title} subtitle={subtitle} />
        </View>
      </View>
      <FlatList
        horizontal
        inverted={isRTL}
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <ContentCard card={item} />}
        contentContainerStyle={styles.hList}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ width: 320, paddingHorizontal: Spacing[4] }}>
            <EmptyState compact icon="albums-outline" title={emptyTitle ?? "Nothing here yet"} />
          </View>
        }
      />
    </View>
  );
}

export default function InsightsScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { ARTICLES, SAUDI_ARTICLES, USA_ARTICLES, NEWS, PORTFOLIOS, SAUDI_NEWS, USA_NEWS, RESEARCH_DOCS, loading, refetch } = useData();

  // Market-aware: Tadawul must not surface Egyptian articles (and vice-versa).
  const arts = market === "usa" ? USA_ARTICLES : market === "saudi" ? SAUDI_ARTICLES : ARTICLES;
  const earnings    = arts.filter(a => a.section === "fundamental");
  const macroItems  = arts.filter(a => a.section === "macro");
  const liveItems   = arts.filter(a => a.section === "live");
  const videoItems  = arts.filter(a => a.type === "video");

  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const isUsa = market === "usa";

  const fontFamily = (weight: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, weight);

  // Language rule (matches web): Arabic mode → Arabic news only; English mode → English only.
  // Classify by the headline's actual script — the DB `lang` column is unreliable.
  const isArabicText = (s?: string | null) => !!s && /[؀-ۿ]/.test(s);
  const newsPool = (isUsa ? USA_NEWS : isSaudi ? SAUDI_NEWS : NEWS);
  const newsPrimary = newsPool.filter((n: any) => {
    const arabicNative = isArabicText(n.title);
    return isAr ? (arabicNative || !!n.titleAr?.trim()) : !arabicNative;
  });
  // Fallback: Arabic-only markets (Egypt) show their Arabic news to English users
  // instead of an empty section. Matches web filterNewsForLanguage.
  const newsAll = (!isAr && newsPrimary.length === 0 && newsPool.length > 0)
    ? newsPool.filter((n: any) => isArabicText(n.title) || !!n.titleAr?.trim())
    : newsPrimary;
  // Show at most 5 here; the full list lives on /news ("View All").
  const newsData = newsAll.slice(0, 5);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg.base }]} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.accent.gold} />}
      >

        {/* ── Page header ────────────────────────────────────── */}
        <View style={[styles.pageHeader, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
          <View style={[styles.headerIcon, { backgroundColor: `${C.accent.gold}15`, borderColor: `${C.accent.gold}25` }]}>
            <Ionicons name="bulb" size={18} color={C.accent.gold} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
              {isAr ? "رؤى وتحليلات" : "Insights"}
            </Text>
            <Text style={[styles.pageSubtitle, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
              {isAr ? "كل أبحاثك وتحليلاتك" : "All your research & analysis"}
            </Text>
          </View>
        </View>

        {/* ── Company Earnings ───────────────────────────────── */}
        <HSection
          title={isAr ? "أرباح الشركات" : "Company Earnings"}
          subtitle={isAr ? "أبرز نتائج الأرباح." : "Key takeaways on earnings results."}
          icon="trending-up"
          items={earnings}
          emptyTitle={isAr ? "لا توجد تحليلات أرباح بعد" : "No earnings insights yet"}
          iconColor={C.primary}
          C={C}
          fontFamily={fontFamily}
          isRTL={isRTL}
        />

        {/* ── Macro Insights ─────────────────────────────────── */}
        <HSection
          title={isAr ? "رؤى الاقتصاد الكلي" : "Macro Insights"}
          subtitle={isAr ? "أبرز الأحداث والبيانات الاقتصادية." : "Key economic events and data."}
          icon="globe-outline"
          items={macroItems}
          emptyTitle={isAr ? "لا توجد رؤى اقتصادية بعد" : "No macro insights yet"}
          iconColor={C.primary}
          C={C}
          fontFamily={fontFamily}
          isRTL={isRTL}
        />

        {/* ── Smart Signals News ─────────────────────────────── */}
        <View style={[styles.section, styles.sectionPad]}>
          <SectionHeader
            title={isAr ? "أخبار Smart Signals" : "Smart Signals News"}
            subtitle={isAr ? "أخبار السوق اليومية لتبقى على اطلاع" : "Daily market news to stay up to date"}
            onViewAll={() => router.push("/news")}
          />
          <View style={[styles.newsList, { borderColor: C.border.subtle }]}>
            {newsData.length === 0 ? (
              <EmptyState compact icon="newspaper-outline" title={isAr ? "لا توجد أخبار بعد" : "No news yet"} />
            ) : newsData.map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: "/news/[id]", params: { id: String(item.id) } })}
                style={({ pressed }) => [
                  styles.newsItem,
                  isRTL && styles.rowRTL,
                  { backgroundColor: i % 2 === 0 ? C.bg.surface : C.bg.elevated },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <NewsCover id={String((item as any).id)} image={(item as any).image} ticker={(item as any).ticker} category={(item as any).category} height={40} width={56} radius={8} />
                <Text style={[styles.newsText, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]} numberOfLines={2}>
                  {(isAr && (item as any).titleAr) ? (item as any).titleAr : item.title}
                </Text>
                <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={12} color={C.text.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Research Reports — HIDDEN: re-enable when Research section is ready */}

        {/* ── Market Watch ───────────────────────────────────── */}
        <HSection
          title={isAr ? "مراقبة السوق" : "Market Watch"}
          subtitle={isAr ? "ما يحدث وما هو قادم." : "What's happening and what's next."}
          icon="eye-outline"
          items={videoItems}
          emptyTitle={isAr ? "لا يوجد محتوى بعد" : "Nothing here yet"}
          iconColor={C.primary}
          C={C}
          fontFamily={fontFamily}
          isRTL={isRTL}
        />

        {/* ── Stock Portfolios ───────────────────────────────── */}
        <View style={[styles.section, styles.sectionPad]}>
          <SectionHeader
            title={isAr ? "محافظ الأسهم" : "Stock Portfolios"}
            subtitle={isAr ? "محافظ مختارة بعناية تهدف للتفوق على السوق." : "Hand-picked portfolios that aim to beat the market."}
          />
          <View style={styles.portfolioList}>
            {PORTFOLIOS.length === 0 ? (
              <EmptyState compact icon="briefcase-outline" title={isAr ? "لا توجد محافظ بعد" : "No portfolios yet"} />
            ) : PORTFOLIOS.map((p, idx) => {
              const colors = [C.primary, C.accent.gold, C.accent.teal];
              const col = colors[idx % colors.length];
              return (
                <Pressable
                  key={p.name}
                  style={({ pressed }) => [
                    styles.portfolioCard,
                    isRTL && styles.rowRTL,
                    { borderColor: `${col}20`, backgroundColor: `${col}06` },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={[styles.portfolioIcon, { backgroundColor: `${col}15` }]}>
                    <Ionicons name="briefcase" size={18} color={col} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.portfolioName, { color: C.text.primary, fontFamily: fontFamily("700") }, isRTL && styles.textRight]}>{p.name}</Text>
                    <Text style={[styles.portfolioDesc, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>{p.desc}</Text>
                  </View>
                  <View style={[styles.activeTag, { backgroundColor: `${col}12`, borderColor: `${col}25` }]}>
                    <Text style={[styles.activeTagText, { color: col, fontFamily: fontFamily("700") }]}>
                      {isAr ? "فعّال" : "Active"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Expert Live Sessions ────────────────────────────── */}
        <HSection
          title={isAr ? "جلسات خبراء مباشرة" : "Expert Live Sessions"}
          subtitle={isAr ? "شاهد جلسات الخبراء المسجلة من Discord." : "Watch recorded expert sessions from Discord."}
          icon="radio"
          items={liveItems}
          emptyTitle={isAr ? "لا توجد جلسات مسجلة بعد" : "No live sessions yet"}
          iconColor={C.accent.red}
          C={C}
          fontFamily={fontFamily}
          isRTL={isRTL}
        />

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  sectionPad: { paddingHorizontal: Spacing[4] },
  section: { marginTop: Spacing[6] },
  hList: { paddingHorizontal: Spacing[4], gap: Spacing[3] },

  pageHeader: {
    flexDirection: "row", alignItems: "center", gap: Spacing[3],
    padding: Spacing[4], paddingTop: Spacing[2], borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: Radius.xl,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  pageTitle: { fontSize: Typography.xl, fontWeight: "800" },
  pageSubtitle: { fontSize: Typography.xs },

  sectionTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[2] },
  sectionIcon: {
    width: 28, height: 28, borderRadius: Radius.md,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },

  newsList: { borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1 },
  newsItem: {
    flexDirection: "row", alignItems: "center", gap: Spacing[2],
    paddingHorizontal: Spacing[4], paddingVertical: 12,
  },
  newsDot: { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  newsText: { flex: 1, fontSize: Typography.xs, lineHeight: 16 },

  portfolioList: { gap: Spacing[3] },
  portfolioCard: {
    flexDirection: "row", alignItems: "center", gap: Spacing[3],
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1,
  },
  portfolioIcon: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  portfolioName: { fontWeight: "700", fontSize: Typography.sm, marginBottom: 2 },
  portfolioDesc: { fontSize: 11 },
  activeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, flexShrink: 0 },
  activeTagText: { fontSize: 10, fontWeight: "700" },
});

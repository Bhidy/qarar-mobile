/**
 * Technical Analysis tab — Chart-based trading calls.
 * Supports Egypt (EGX) and Saudi (Tadawul) markets + Arabic/English.
 */
import { ScrollView, View, StyleSheet, Pressable, FlatList, RefreshControl, Image } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { CallUpdates, UpdatedBadge } from "@/components/shared/CallUpdates";
import { EmptyState } from "@/components/shared/EmptyState";
import { ViewMoreButton } from "@/components/shared/ViewMoreButton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useViewMore } from "@/hooks/useViewMore";
import { visibleCallUpdates } from "@/lib/call-updates";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { computeOverallPerformance, fmtPct, isClosed } from "@/lib/performance";
import { type TechnicalCall } from "@/constants/data";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { type SaudiTechnical } from "@/constants/saudi-data";
import { type UsaTechnical } from "@/constants/usa-data";
import { looksLikeHtml } from "@/lib/rich-text";
import { indexCatalogEntry } from "@/constants/index-catalog";

export default function TechnicalScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { TECHNICAL_CALLS, ARTICLES, TECHNICAL_ARTICLES, INDEX_UPDATES, SAUDI_TECHNICAL, USA_TECHNICAL, loading, refetch } = useData();

  const watchlists = ARTICLES.filter(a => a.section === "technical");

  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const isUsa = market === "usa";

  // Technical Articles — chart-led editorial write-ups for the active market
  // ("both" shows in either market view).
  const techArticles = (TECHNICAL_ARTICLES as any[]).filter(a =>
    isUsa ? (a.market === "usa" || a.market === "both")
    : isSaudi ? (a.market === "saudi" || a.market === "both")
    : (!a.market || a.market === "egypt" || a.market === "both"),
  );
  // Index Updates — analyst commentary on a market index for the active market
  // ("both" isn't a concept here since every index has exactly one home market).
  const indexUpdates = (INDEX_UPDATES as any[]).filter(u =>
    isUsa ? u.market === "usa" : isSaudi ? u.market === "saudi" : (!u.market || u.market === "egypt"),
  );

  const tfLabel = (tf?: string) => {
    if (!tf) return "";
    const ar: Record<string, string> = { Daily: "يومي", Weekly: "أسبوعي", Monthly: "شهري", Intraday: "خلال اليوم" };
    return isAr ? (ar[tf] ?? tf) : tf;
  };

  const fontFamily = (weight: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, weight);

  const currency = isUsa ? "USD" : isSaudi ? (isAr ? "ر.س" : "SAR") : (isAr ? "ج.م" : "EGP");
  const calls = isUsa ? USA_TECHNICAL : isSaudi ? SAUDI_TECHNICAL : TECHNICAL_CALLS;
  // Separate live (actionable) from closed (track-record) calls so a closed
  // position is never shown as an "active" call or counted as one.
  const activeCalls = (calls as any[]).filter(c => !isClosed(c));
  const closedCalls = (calls as any[]).filter(c => isClosed(c));

  // Single "Calls" section with Active/Closed tabs. Each tab shows 3 rows with a
  // "Load more" control that reveals +3 (parity request). Separate pagers so each
  // tab remembers its own expansion.
  const [callsTab, setCallsTab] = useState<"active" | "closed">("active");
  const activeView = useViewMore(activeCalls, 3);
  const closedView = useViewMore(closedCalls, 3);
  const callsList = callsTab === "active" ? activeCalls : closedCalls;
  const callsPager = callsTab === "active" ? activeView : closedView;

  // Live track record computed from the actual calls (no hard-coded numbers).
  const perf = computeOverallPerformance(calls as any[], { publishableOnly: true });
  const STATS = [
    { label: "Hit Ratio",    labelAr: "نسبة النجاح",  value: fmtPct(perf.hitRatio, 1),               hi: true },
    { label: "Avg Return",   labelAr: "متوسط العائد",  value: fmtPct(perf.avgRealizedReturn, 1, true) },
    { label: "Avg Win",      labelAr: "متوسط الربح",   value: fmtPct(perf.avgWin, 1, true) },
    { label: "Avg Loss",     labelAr: "متوسط الخسارة", value: fmtPct(perf.avgLoss, 1, true) },
    { label: "Closed Calls", labelAr: "توصيات مغلقة",  value: String(perf.closedCount) },
    { label: "Avg Duration", labelAr: "متوسط المدة",   value: perf.avgDurationDays === null ? "—" : `${Math.round(perf.avgDurationDays)} ${isAr ? "يوم" : "Days"}` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.accent.teal} />}
      >

        {/* Unified header (Profile / Bell / Search) — LIVE SIGNALS badge removed */}
        <ScreenHeader
          title="Technical" titleAr="الفني"
          subtitle="Chart-based trading calls" subtitleAr="توصيات تداول مبنية علي التحليل الفني"
          icon="trending-up"
        />

        {/* Performance banner — blue (brand) for consistency with the Fundamental tab */}
        <View style={[styles.sectionPad, { marginTop: Spacing[4] }]}>
          <View style={[styles.perfBanner, { backgroundColor: C.primaryDeep, borderColor: `${C.primary}30` }]}>
            <View style={[styles.arcDecor, { borderColor: "rgba(255,255,255,0.07)" }]} />
            <View style={[styles.perfTitle, isRTL && styles.rowRTL]}>
              <Ionicons name="stats-chart" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={[styles.perfTitleText, { fontFamily: fontFamily("700") }]}>
                {isAr ? "الأداء العام" : "Overall Performance"}
              </Text>
            </View>
            <View style={styles.statsGrid}>
              {STATS.map(s => (
                <View key={s.label} style={[styles.statItem, s.hi && { backgroundColor: `${C.primary}33`, borderColor: `${C.primary}55` }]}>
                  <Text style={[styles.statLabel, { fontFamily: fontFamily("600") }, isRTL && styles.textRight]}>
                    {isAr && (s as any).labelAr ? (s as any).labelAr : s.label}
                  </Text>
                  <Text style={[styles.statValue, isRTL && styles.textRight]}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Calls — ONE section, Active/Closed tabs, 3 rows + Load more each */}
        <View style={[styles.sectionPad, { marginTop: Spacing[5] }]}>
          <View style={[styles.filterRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }]}>
              {isAr ? "التوصيات" : "Calls"}
            </Text>
            <View style={[styles.callsTabs, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }, isRTL && styles.rowRTL]}>
              {(["active", "closed"] as const).map(tab => {
                const on = callsTab === tab;
                const count = tab === "active" ? activeCalls.length : closedCalls.length;
                const label = tab === "active" ? (isAr ? "الفعّالة" : "Active") : (isAr ? "المغلقة" : "Closed");
                return (
                  <Pressable
                    key={tab}
                    onPress={() => { Haptics.selectionAsync(); setCallsTab(tab); }}
                    style={[styles.callsTab, on && { backgroundColor: C.primary }]}
                  >
                    <Text style={[styles.callsTabText, { color: on ? "#fff" : C.text.muted, fontFamily: fontFamily("700") }]}>
                      {label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text style={[styles.sectionSub, { color: C.text.muted, marginBottom: Spacing[3], fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
            {callsTab === "active"
              ? (isAr ? "مناطق الدخول والأهداف ومستويات وقف الخسارة." : "Entry zones, targets, and stop-loss levels.")
              : (isAr ? "أداء التوصيات المغلقة وعوائدها المحققة." : "Closed calls and their realized returns.")}
          </Text>
          {callsList.length > 0 ? (
            <>
              {callsPager.items.map((call, i) => (
                <TechCallCard key={`${call.ticker}_${i}`} call={call} closed={callsTab === "closed"} currency={currency} isAr={isAr} isRTL={isRTL} fontFamily={fontFamily} />
              ))}
              <ViewMoreButton {...callsPager} />
            </>
          ) : (
            <EmptyState
              icon="trending-up-outline"
              title={callsTab === "active"
                ? (isAr ? "لا توجد توصيات فنية فعّالة بعد" : "No active technical calls yet")
                : (isAr ? "لا توجد توصيات مغلقة بعد" : "No closed calls yet")}
              subtitle={isAr ? "ستظهر التوصيات الجديدة هنا فور نشرها." : "New calls appear here as soon as they're published."}
            />
          )}
        </View>

        {/* Index Updates — analyst commentary on a market index, not a stock */}
        {indexUpdates.length > 0 && (
          <View style={{ marginTop: Spacing[6] }}>
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
                {isAr ? "تحديثات المؤشرات" : "Index Updates"}
              </Text>
              <Text style={[styles.sectionSub, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
                {isAr ? "تعليقات المحللين على المؤشرات الرئيسية للسوق" : "Analyst commentary on the major market indices"}
              </Text>
            </View>
            <FlatList
              horizontal
              inverted={isAr}
              data={indexUpdates}
              keyExtractor={i => i.id}
              renderItem={({ item }) => {
                const title = isAr && item.titleAr ? item.titleAr : item.title;
                const entry = indexCatalogEntry(item.indexSymbol);
                const overviewColor = item.overview === "Bullish" ? "#1F8F3B" : item.overview === "Bearish" ? "#E5484D" : "#7C7C7C";
                const overviewBg = item.overview === "Bullish" ? "rgba(132,223,92,0.16)" : item.overview === "Bearish" ? "rgba(229,72,77,0.12)" : "rgba(124,124,124,0.10)";
                const overviewLabel = item.overview === "Bullish" ? (isAr ? "صعودي" : "Bullish") : item.overview === "Bearish" ? (isAr ? "هبوطي" : "Bearish") : (isAr ? "محايد" : "Neutral");
                return (
                  <Pressable
                    style={[styles.watchCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
                    onPress={() => router.push({ pathname: "/index-update/[id]", params: { id: item.id } })}
                  >
                    <View style={[styles.watchThumb, { backgroundColor: C.bg.elevated }]}>
                      {item.chartImage ? (
                        <Image source={{ uri: item.chartImage }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                      ) : (
                        <View style={[styles.playCircle, { backgroundColor: `${C.accent.teal}20`, borderColor: `${C.accent.teal}40` }]}>
                          <Ionicons name="bar-chart" size={18} color={C.accent.teal} />
                        </View>
                      )}
                      <View style={[styles.timeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }, isRTL && { left: undefined, right: 8 }]}>
                        <Text style={styles.timeBadgeText}>{entry?.flag} {item.indexSymbol}</Text>
                      </View>
                      {!!item.overview && (
                        <View style={[styles.timeBadge, { backgroundColor: overviewBg, left: undefined, right: 8 }, isRTL && { right: undefined, left: 8 }]}>
                          <Text style={[styles.timeBadgeText, { color: overviewColor }]}>{overviewLabel}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.watchBody}>
                      <Text style={[styles.watchTitle, { color: C.text.primary, fontFamily: fontFamily("700") }, isRTL && styles.textRight]} numberOfLines={2}>
                        {title}
                      </Text>
                      <View style={[styles.watchMeta, isRTL && styles.rowRTL]}>
                        <Text style={[styles.watchAuthor, { color: C.accent.teal, fontFamily: fontFamily("700") }]}>{item.analyst || ""}</Text>
                        <Text style={[styles.watchDate, { color: C.text.muted }]}>{item.date}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.hList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Weekly Watchlists / Technical Reports — only Egypt */}
        {!isSaudi && !isUsa && (
          <View style={{ marginTop: Spacing[6] }}>
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
                {isAr ? "التقارير الفنية" : "Technical Reports"}
              </Text>
              <Text style={[styles.sectionSub, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
                {isAr ? "أبحاث فنية قائمة على الرسوم البيانية وأفكار أسبوعية من محللينا الفنيين" : "Chart-based research & weekly ideas from our technical analysts"}
              </Text>
            </View>
            <FlatList
              horizontal
              inverted={isAr}
              data={watchlists}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.watchCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
                  onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
                >
                  <View style={[styles.watchThumb, { backgroundColor: C.bg.elevated }]}>
                    <View style={[styles.playCircle, { backgroundColor: `${C.accent.teal}20`, borderColor: `${C.accent.teal}40` }]}>
                      <Ionicons name="play" size={18} color={C.accent.teal} />
                    </View>
                    <View style={[styles.timeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }, isRTL && { left: undefined, right: 8 }]}>
                      <Ionicons name="play" size={9} color="#fff" />
                      <Text style={styles.timeBadgeText}>{isAr ? "فيديو" : "Video"}</Text>
                    </View>
                  </View>
                  <View style={styles.watchBody}>
                    <Text style={[styles.watchTitle, { color: C.text.primary, fontFamily: fontFamily("700") }]} numberOfLines={2}>
                      {isAr && (item as any).titleAr ? (item as any).titleAr : item.title}
                    </Text>
                    <View style={[styles.watchMeta, isRTL && styles.rowRTL]}>
                      <Text style={[styles.watchAuthor, { color: C.accent.teal, fontFamily: fontFamily("700") }]}>{item.author.join(", ")}</Text>
                      <Text style={[styles.watchDate, { color: C.text.muted }]}>{item.date}</Text>
                    </View>
                  </View>
                </Pressable>
              )}
              contentContainerStyle={styles.hList}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ width: 300, paddingHorizontal: Spacing[4] }}>
                  <EmptyState compact icon="videocam-outline" title={isAr ? "لا توجد تقارير بعد" : "No reports yet"} />
                </View>
              }
            />
          </View>
        )}

        {/* Technical Articles — editorial chart-led write-ups */}
        {techArticles.length > 0 && (
          <View style={{ marginTop: Spacing[6] }}>
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
                {isAr ? "المقالات الفنية" : "Technical Articles"}
              </Text>
              <Text style={[styles.sectionSub, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
                {isAr ? "تحليلات معمّقة للرسوم البيانية ودراسات سعرية." : "In-depth chart analysis & price studies."}
              </Text>
            </View>
            <FlatList
              horizontal
              inverted={isAr}
              data={techArticles}
              keyExtractor={i => i.id}
              renderItem={({ item }) => {
                const title = isAr && item.titleAr ? item.titleAr : item.title;
                return (
                  <Pressable
                    style={[styles.watchCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
                    onPress={() => router.push({ pathname: "/technical-article/[id]", params: { id: item.id } })}
                  >
                    <View style={[styles.watchThumb, { backgroundColor: C.bg.elevated }]}>
                      {item.chartImage ? (
                        <Image source={{ uri: item.chartImage }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
                      ) : (
                        <View style={[styles.playCircle, { backgroundColor: `${C.accent.teal}20`, borderColor: `${C.accent.teal}40` }]}>
                          <Ionicons name="analytics" size={18} color={C.accent.teal} />
                        </View>
                      )}
                      {!!item.chartTimeframe && (
                        <View style={[styles.timeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }, isRTL && { left: undefined, right: 8 }]}>
                          <Ionicons name="pulse" size={9} color="#fff" />
                          <Text style={styles.timeBadgeText}>{tfLabel(item.chartTimeframe)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.watchBody}>
                      <Text style={[styles.watchTitle, { color: C.text.primary, fontFamily: fontFamily("700") }, isRTL && styles.textRight]} numberOfLines={2}>
                        {title}
                      </Text>
                      <View style={[styles.watchMeta, isRTL && styles.rowRTL]}>
                        <Text style={[styles.watchAuthor, { color: C.accent.teal, fontFamily: fontFamily("700") }]}>{item.ticker}</Text>
                        <Text style={[styles.watchDate, { color: C.text.muted }]}>{item.date}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.hList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Technical Call Card ───────────────────────────────────────────────────────
function TechCallCard({
  call, currency, isAr, isRTL, fontFamily, closed,
}: {
  call: TechnicalCall | SaudiTechnical | UsaTechnical;
  currency: string;
  isAr: boolean;
  isRTL: boolean;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
  closed?: boolean;
}) {
  const C = useColors();
  const upColor = C.primary;
  const dnColor = C.accent.red;
  const retColor = call.return >= 0 ? upColor : dnColor;
  const updates = visibleCallUpdates((call as any).updates);
  const lastUpdated = updates[0]?.date ?? (call as any).updatedDate;

  return (
    <Pressable
      style={[styles.callCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
      onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: call.ticker } })}
    >
      {/* Header row */}
      <View style={[styles.callTop, isRTL && styles.rowRTL]}>
        <TickerLogo ticker={call.ticker} size={44} />
        <View style={styles.callInfo}>
          <View style={[styles.callInfoRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.callTicker, { color: C.text.primary, fontFamily: fontFamily("800") }]}>{call.ticker}</Text>
            <SignalBadge signal={call.signal} size="sm" />
            {closed ? (
              <View style={[styles.closedBadge, { backgroundColor: C.bg.elevated, borderColor: C.border.default }]}>
                <Text style={[styles.closedBadgeText, { color: C.text.muted, fontFamily: fontFamily("700") }]}>
                  {isAr ? "مغلقة" : "CLOSED"}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.callCompany, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]} numberOfLines={1}>{call.company}</Text>
          <View style={[styles.callMeta, isRTL && styles.rowRTL]}>
            <Ionicons name="person-outline" size={10} color={C.text.muted} />
            <Text style={[styles.callMetaText, { color: C.text.muted, fontFamily: fontFamily("400") }]}>{call.analyst} · {call.date}</Text>
            {lastUpdated && updates.length > 0 ? (
              <UpdatedBadge date={lastUpdated} isAr={isAr} C={C} fontFamily={fontFamily} />
            ) : null}
          </View>
        </View>
        <View style={[styles.returnBox, isRTL && styles.alignStart]}>
          <Text style={[styles.returnLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
            {closed ? (isAr ? "محقق" : "Realized") : (isAr ? "العائد" : "Return")}
          </Text>
          <Text style={[styles.returnValue, { color: retColor }]}>
            {call.return > 0 ? "+" : ""}{call.return.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Pattern tag */}
      <View style={[styles.patternRow, { borderTopColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <View style={[styles.patternTag, { backgroundColor: `${C.accent.teal}10`, borderColor: `${C.accent.teal}25` }]}>
          <Ionicons name="analytics" size={10} color={C.accent.teal} />
          <Text style={[styles.patternText, { color: C.accent.teal, fontFamily: fontFamily("700") }]}>{call.pattern}</Text>
        </View>
        <View style={[styles.patternTag, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
          <Ionicons name="time-outline" size={10} color={C.text.muted} />
          <Text style={[styles.patternText, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{call.timeframe}</Text>
        </View>
      </View>

      {/* Trend badge */}
      {(call as any).trend ? (
        <View style={[styles.trendRow, isRTL && styles.rowRTL]}>
          <View style={[styles.trendBadge, {
            backgroundColor: (call as any).trend === "uptrend" ? "rgba(132,223,92,0.14)" : (call as any).trend === "downtrend" ? "rgba(229,72,77,0.10)" : "rgba(124,124,124,0.10)",
            borderColor: (call as any).trend === "uptrend" ? "rgba(132,223,92,0.3)" : (call as any).trend === "downtrend" ? "rgba(229,72,77,0.2)" : "rgba(124,124,124,0.2)",
          }]}>
            <Text style={[styles.trendText, {
              color: (call as any).trend === "uptrend" ? "#1F8F3B" : (call as any).trend === "downtrend" ? "#E5484D" : "#7C7C7C",
              fontFamily: fontFamily("700"),
            }]}>
              {(call as any).trend === "uptrend" ? "↑" : (call as any).trend === "downtrend" ? "↓" : "→"}{" "}
              {isAr
                ? ((call as any).trend === "uptrend" ? "صاعد" : (call as any).trend === "downtrend" ? "هابط" : "جانبي")
                : ((call as any).trend as string).charAt(0).toUpperCase() + ((call as any).trend as string).slice(1)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Price levels */}
      <View style={styles.priceGrid}>
        <PriceItem label={isAr ? "نطاق الشراء" : "Buy Range"} value={`${currency} ${call.entryMin}–${call.entryMax}`} color={C.text.primary} C={C} fontFamily={fontFamily} />
        <View style={[styles.priceDivider, { backgroundColor: C.border.subtle }]} />
        <PriceItem label={isAr ? "الهدف TP1" : "Target TP1"} value={`${currency} ${call.targetPrice.toFixed(2)}`} color={upColor} C={C} fontFamily={fontFamily} />
        {(call as any).tp2 ? (
          <>
            <View style={[styles.priceDivider, { backgroundColor: C.border.subtle }]} />
            <PriceItem label={isAr ? "الهدف TP2" : "Target TP2"} value={`${currency} ${((call as any).tp2 as number).toFixed(2)}`} color={upColor} C={C} fontFamily={fontFamily} />
          </>
        ) : null}
        {(call as any).tp3 ? (
          <>
            <View style={[styles.priceDivider, { backgroundColor: C.border.subtle }]} />
            <PriceItem label={isAr ? "الهدف TP3" : "Target TP3"} value={`${currency} ${((call as any).tp3 as number).toFixed(2)}`} color={upColor} C={C} fontFamily={fontFamily} />
          </>
        ) : null}
        <View style={[styles.priceDivider, { backgroundColor: C.border.subtle }]} />
        <PriceItem label={isAr ? "وقف الخسارة الجريء" : "Risky SL"} value={`${currency} ${call.stopLoss.toFixed(2)}`} color={dnColor} C={C} fontFamily={fontFamily} />
        <View style={[styles.priceDivider, { backgroundColor: C.border.subtle }]} />
        <PriceItem label={isAr ? "الحالي" : "Current"} value={(typeof call.currentPrice === "number" && call.currentPrice > 0) ? `${currency} ${call.currentPrice.toFixed(2)}` : (isAr ? "غير متاح" : "—")} color={C.text.secondary} C={C} fontFamily={fontFamily} />
      </View>

      {/* Progress to target */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
            {isAr ? "التقدم نحو الهدف" : "Progress to target"}
          </Text>
          <Text style={[styles.progressPct, { color: retColor }]}>
            {Math.min(Math.round(Math.abs(call.return / ((call.targetPrice / call.entryMin - 1) * 100)) * 100), 100)}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: C.bg.elevated }]}>
          <View style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(Math.round(Math.abs(call.return / ((call.targetPrice / call.entryMin - 1) * 100)) * 100), 0), 100)}%`,
              backgroundColor: retColor,
            }
          ]} />
        </View>
      </View>

      {call.notes ? (
        <View style={[styles.notesBox, { borderTopColor: C.border.subtle }]}>
          <Ionicons name="chatbubble-outline" size={10} color={C.text.muted} />
          <Text style={[styles.notesText, { color: C.text.muted, fontFamily: fontFamily("400") }]} numberOfLines={2}>
            {looksLikeHtml(call.notes)
              ? call.notes.replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim()
              : call.notes}
          </Text>
        </View>
      ) : null}

      {updates.length > 0 ? (
        <CallUpdates updates={updates} isAr={isAr} isRTL={isRTL} C={C} fontFamily={fontFamily} />
      ) : null}
    </Pressable>
  );
}

function PriceItem({ label, value, color, C, fontFamily }: {
  label: string; value: string; color: string;
  C: ReturnType<typeof useColors>;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
}) {
  return (
    <View style={styles.priceItem}>
      <Text style={[styles.priceLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{label}</Text>
      <Text style={[styles.priceValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  alignStart: { alignItems: "flex-start" },
  sectionPad: { paddingHorizontal: Spacing[4] },
  hList: { paddingHorizontal: Spacing[4], gap: Spacing[3] },

  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing[4], paddingTop: Spacing[2], borderBottomWidth: 1 },
  pageHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  pageIcon: { width: 40, height: 40, borderRadius: Radius.xl, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: Typography.xl, fontWeight: "800" },
  pageSubtitle: { fontSize: Typography.xs, marginTop: 1 },

  perfBanner: { borderRadius: Radius["2xl"], overflow: "hidden", padding: Spacing[4], borderWidth: 1 },
  arcDecor: { position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, borderWidth: 1 },
  perfTitle: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing[4] },
  perfTitleText: { color: "rgba(255,255,255,0.7)", fontSize: Typography.sm, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing[2] },
  statItem: { flex: 1, minWidth: "30%", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: Radius.lg, padding: Spacing[3], gap: 3 },
  statLabel: { color: "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  statValue: { color: "rgba(255,255,255,0.9)", fontSize: Typography.lg, fontWeight: "800", letterSpacing: -0.5 },

  howBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[2], padding: Spacing[3], borderRadius: Radius.lg, borderWidth: 1 },
  howText: { flex: 1, fontSize: 11, lineHeight: 17 },

  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: Typography.md, fontWeight: "800" },
  sectionSub: { fontSize: Typography.xs, marginTop: 2 },
  countBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  countText: { fontSize: 11, fontWeight: "600" },
  callsTabs: { flexDirection: "row", borderRadius: Radius.full, borderWidth: 1, padding: 3, gap: 3 },
  callsTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  callsTabText: { fontSize: 11, fontWeight: "700" },

  watchCard: { width: 220, borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  watchThumb: { height: 120, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  timeBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  timeBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  watchBody: { padding: Spacing[3], gap: 4 },
  watchTitle: { fontSize: Typography.sm, fontWeight: "700", lineHeight: 18 },
  watchMeta: { flexDirection: "row", justifyContent: "space-between" },
  watchAuthor: { fontSize: 10, fontWeight: "700" },
  watchDate: { fontSize: 10 },

  callCard: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[3], gap: Spacing[3] },
  callTop: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  callLogo: { width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  callLogoText: { fontSize: 11, fontWeight: "800" },
  callInfo: { flex: 1, gap: 2 },
  callInfoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  callTicker: { fontWeight: "800", fontSize: Typography.sm, letterSpacing: 0.8 },
  callCompany: { fontSize: 11 },
  callMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  callMetaText: { fontSize: 10 },
  closedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  closedBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.5 },
  returnBox: { alignItems: "flex-end", gap: 2 },
  returnLabel: { fontSize: 9, fontWeight: "600" },
  returnValue: { fontSize: Typography.md, fontWeight: "800" },

  patternRow: { flexDirection: "row", gap: Spacing[2], paddingTop: Spacing[3], borderTopWidth: 1 },
  patternTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  patternText: { fontSize: 10, fontWeight: "700" },

  trendRow: { flexDirection: "row", paddingTop: Spacing[2] },
  trendBadge: { paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  trendText: { fontSize: 10 },
  priceGrid: { flexDirection: "row", alignItems: "center" },
  priceItem: { flex: 1, gap: 2, alignItems: "center" },
  priceLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  priceValue: { fontSize: 11, fontWeight: "800" },
  priceDivider: { width: 1, height: 28, marginHorizontal: 4 },

  progressSection: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontSize: 10, fontWeight: "600" },
  progressPct: { fontSize: 10, fontWeight: "700" },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  notesBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingTop: Spacing[2], borderTopWidth: 1 },
  notesText: { flex: 1, fontSize: 10, lineHeight: 15 },
});

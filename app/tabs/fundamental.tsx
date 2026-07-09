import { ScrollView, View, StyleSheet, Pressable, FlatList, RefreshControl } from "react-native";
import { formatDate } from "@/lib/format-date";
import { Text } from "@/components/shared/AppText";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { type SaudiStock } from "@/constants/saudi-data";
import { type UsaStock } from "@/constants/usa-data";
import { type FundamentalCall } from "@/constants/data";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { ArticleCover } from "@/components/shared/ArticleCover";
import { CallUpdates, UpdatedBadge } from "@/components/shared/CallUpdates";
import { EmptyState } from "@/components/shared/EmptyState";
import { ViewMoreButton } from "@/components/shared/ViewMoreButton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { PerformanceComparison } from "@/components/fundamental/PerformanceComparison";
import { useViewMore } from "@/hooks/useViewMore";
import { visibleCallUpdates, effectiveStatus } from "@/lib/call-updates";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { getRealizedReturn } from "@/lib/performance";
import { RichText, looksLikeHtml } from "@/lib/rich-text";

export default function FundamentalScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { FUNDAMENTAL_CALLS, ARTICLES, FUNDAMENTAL_ARTICLES, SAUDI_FUNDAMENTAL, USA_FUNDAMENTAL, loading, refetch } = useData();
  const [activeFilter, setActiveFilter] = useState<"all" | "invest" | "hold">("all");

  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const isUsa = market === "usa";

  const recentContent = ARTICLES.filter(a => a.section === "fundamental");

  // Fundamental Articles (analyst research prose) — market-aware, published-only.
  const fundArticles = FUNDAMENTAL_ARTICLES.filter(a =>
    a.market === market || a.market === "both" || a.market === "commodities" || (!a.market && market === "egypt"),
  );

  const fontFamily = (weight: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, weight);

  const currency = isUsa ? "USD" : isSaudi ? (isAr ? "ر.س" : "SAR") : (isAr ? "ج.م" : "EGP");
  const benchmarkLabel = isUsa ? "S&P 500" : isSaudi ? "Tadawul" : "EGX30";

  // Market-aware data
  const fundamentalData = isUsa ? USA_FUNDAMENTAL : isSaudi ? SAUDI_FUNDAMENTAL : FUNDAMENTAL_CALLS;

  const signalFiltered = fundamentalData.filter(c =>
    activeFilter === "all" ? true : String(c.signal ?? "").toLowerCase() === activeFilter
  );
  // Active (actionable) vs closed (track-record) — a closed call must never be
  // shown as a live "Active" call with live-looking "Remaining" upside.
  // effectiveStatus() considers the latest update's status: a closed initiation with
  // a new "active" update stays in the Active section (Issue 3).
  const filtered = (signalFiltered as any[]).filter(c => effectiveStatus(c.status, c.updates) === "active");
  const closedCalls = (signalFiltered as any[]).filter(c => effectiveStatus(c.status, c.updates) === "closed");

  // One "التوصيات" section with Active/Closed tabs (3 rows + Load more each).
  const [callsTab, setCallsTab] = useState<"active" | "closed">("active");
  const activeView = useViewMore(filtered, 3);
  const closedView = useViewMore(closedCalls, 3);
  const callsList  = callsTab === "active" ? filtered : closedCalls;
  const callsPager = callsTab === "active" ? activeView : closedView;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
      >

        {/* Unified header (Profile / Bell / Search) — market badge removed */}
        <ScreenHeader
          title="Fundamental" titleAr="الأساسي"
          subtitle="Long-term investment research" subtitleAr="بحوث الاستثمار طويل الأمد"
          icon="bar-chart"
        />

        {/* Per-call performance vs benchmark — averages always visible, breakdown collapsed */}
        <View style={{ marginTop: Spacing[4] }}>
          <PerformanceComparison data={fundamentalData as any[]} benchmarkLabel={benchmarkLabel} />
        </View>

        {/* Calls — ONE "التوصيات" section, Active/Closed tabs + signal filter, 3 rows + Load more */}
        <View style={[styles.sectionPad, { marginTop: Spacing[6] }]}>
          <View style={[styles.filterRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }]}>
              {isAr ? "التوصيات" : "Calls"}
            </Text>
            <View style={[styles.callsTabs, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }, isRTL && styles.rowRTL]}>
              {(["active", "closed"] as const).map(tab => {
                const on = callsTab === tab;
                const count = tab === "active" ? filtered.length : closedCalls.length;
                const label = tab === "active" ? (isAr ? "الفعّالة" : "Active") : (isAr ? "المغلقة" : "Closed");
                return (
                  <Pressable key={tab} onPress={() => { Haptics.selectionAsync(); setCallsTab(tab); }} style={[styles.callsTab, on && { backgroundColor: C.primary }]}>
                    <Text style={[styles.callsTabText, { color: on ? "#fff" : C.text.muted, fontFamily: fontFamily("700") }]}>
                      {label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Signal filter (all / invest / hold) — applies to the selected tab */}
          <View style={[styles.filters, { marginTop: Spacing[2] }, isRTL && styles.rowRTL]}>
            {(["all", "invest", "hold"] as const).map(f => (
              <Pressable
                key={f}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter(f); }}
                style={[styles.filterChip, { borderColor: activeFilter === f ? C.primary : C.border.subtle }, activeFilter === f && { backgroundColor: `${C.primary}15` }]}
              >
                <Text style={[styles.filterText, { color: activeFilter === f ? C.primary : C.text.muted, fontFamily: fontFamily("600") }]}>
                  {f === "all" ? (isAr ? "الكل" : "All") : f === "invest" ? (isAr ? "استثمر" : "Invest") : (isAr ? "احتفظ" : "Hold")}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sectionSub, { color: C.text.muted, marginTop: Spacing[2], fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
            {isAr ? "اضغط على أي توصية لعرض الأطروحة الاستثمارية." : "Tap any call to expand the investment thesis."}
          </Text>
        </View>

        {/* Call cards */}
        <View style={[styles.sectionPad, { marginTop: Spacing[3] }]}>
          {callsList.length > 0 ? (
            <>
              {callsPager.items.map((call, i) => (
                <CallCard key={`${call.ticker}_${i}`} call={call} closed={callsTab === "closed"} currency={currency} benchmarkLabel={benchmarkLabel} isAr={isAr} isRTL={isRTL} fontFamily={fontFamily} C={C} />
              ))}
              <ViewMoreButton {...callsPager} />
            </>
          ) : (
            <EmptyState
              icon="bar-chart-outline"
              title={callsTab === "active"
                ? (isAr ? "لا توجد توصيات فعّالة في هذا السوق بعد" : "No active calls in this market yet")
                : (isAr ? "لا توجد توصيات مغلقة بعد" : "No closed calls yet")}
              subtitle={isAr ? "ستظهر توصيات المحللين الجديدة هنا فور نشرها." : "New analyst calls appear here as soon as they're published."}
            />
          )}
        </View>

        {/* Featured editorial — mirrors web/components/fundamental/featured-article.tsx.
            Renders only when there's a fundamental article for the current market. */}
        <FeaturedArticle
          articles={recentContent as any[]}
          calls={fundamentalData as any[]}
          market={market}
          currency={currency}
          isAr={isAr}
          isRTL={isRTL}
          fontFamily={fontFamily}
          C={C}
        />

        {/* Fundamental Reports — parity with web LatestContent (always shown when items exist). */}
        {recentContent.length > 0 && (
          <View style={{ marginTop: Spacing[6] }}>
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
                {isAr ? "التقارير الأساسية" : "Fundamental Reports"}
              </Text>
              <Text style={[styles.sectionSub, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
                {isAr ? "أبحاث وتحليلات معمّقة وراء توصياتنا الأساسية." : "In-depth research & analysis behind our fundamental calls."}
              </Text>
            </View>
            <FlatList
              horizontal
              inverted={isAr}
              data={recentContent}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.articleCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
                  onPress={() => router.push({ pathname: "/article/[id]", params: { id: item.id } })}
                >
                  <View style={[styles.articleThumb, { backgroundColor: C.bg.elevated }]}>
                    <ArticleCover ticker={item.ticker} signal={item.tag} />
                    {item.tag ? <View style={styles.tagBadge}><SignalBadge signal={item.tag} size="sm" /></View> : null}
                  </View>
                  <View style={styles.articleBody}>
                    <Text style={[styles.articleTitle, { color: C.text.primary, fontFamily: fontFamily("700") }]} numberOfLines={2}>
                      {isAr && (item as any).titleAr ? (item as any).titleAr : item.title}
                    </Text>
                    <View style={[styles.articleMeta, isRTL && styles.rowRTL]}>
                      <Text style={[styles.articleAuthor, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{item.author.join(", ")}</Text>
                      <Text style={[styles.articleDate, { color: C.text.muted }]}>{formatDate(item.date)}</Text>
                    </View>
                  </View>
                </Pressable>
              )}
              contentContainerStyle={styles.hList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        {/* Fundamental Articles — analyst research prose (parity with web FundamentalArticles).
            Placed BELOW Fundamental Reports per product order (mirrors web page). */}
        {fundArticles.length > 0 && (
          <View style={{ marginTop: Spacing[6] }}>
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
                {isAr ? "المقالات الأساسية" : "Fundamental Articles"}
              </Text>
              <Text style={[styles.sectionSub, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
                {isAr ? "تحليلات معمّقة للشركات والنتائج والتقييم من محللينا." : "Company deep-dives, earnings and valuation notes from our analysts."}
              </Text>
            </View>
            <FlatList
              horizontal
              inverted={isAr}
              data={fundArticles}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.articleCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
                  onPress={() => router.push({ pathname: "/fundamental-article/[id]", params: { id: item.id } })}
                >
                  <View style={[styles.articleThumb, { backgroundColor: C.bg.elevated }]}>
                    <ArticleCover ticker={item.ticker} />
                  </View>
                  <View style={styles.articleBody}>
                    <Text style={[styles.articleTitle, { color: C.text.primary, fontFamily: fontFamily("700") }]} numberOfLines={2}>
                      {isAr && item.titleAr ? item.titleAr : item.title}
                    </Text>
                    <View style={[styles.articleMeta, isRTL && styles.rowRTL]}>
                      <Text style={[styles.articleAuthor, { color: C.text.muted, fontFamily: fontFamily("600") }]} numberOfLines={1}>{item.analyst ?? ""}</Text>
                      <Text style={[styles.articleDate, { color: C.text.muted }]}>{item.date ? formatDate(item.date) : ""}</Text>
                    </View>
                  </View>
                </Pressable>
              )}
              contentContainerStyle={styles.hList}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

        <Disclaimer />
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Featured Article (editorial hero) ────────────────────────────────────────
// Mirrors web/components/fundamental/featured-article.tsx — picks the flagship
// "Invest"-tagged article for the current market (falls back to the newest
// fundamental article), enriches it with the matching call's upside + target,
// and renders an article-cover hero card that deep-links into /article/[id].
function FeaturedArticle({
  articles, calls, market, currency, isAr, isRTL, fontFamily, C,
}: {
  articles: any[];
  calls: any[];
  market: "egypt" | "saudi" | "usa";
  currency: string;
  isAr: boolean;
  isRTL: boolean;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
  C: ReturnType<typeof useColors>;
}) {
  // Same rule as web: section=fundamental, market-aware — but ticker is OPTIONAL so a
  // macro / economic report (no single stock) can be the flagship. The admin "Featured"
  // toggle wins; otherwise fall back to legacy (Invest-tagged, then newest ticker'd).
  const pool = articles.filter(a =>
    a?.section === "fundamental" &&
    (a?.market ? a.market === market || a.market === "both" : market === "egypt"),
  );
  const featured =
    pool.find(a => a.featured) ??
    pool.find(a => a.ticker && a.tag === "Invest") ??
    pool.find(a => a.ticker);
  if (!featured) return null;

  const match = calls.find(c => c?.ticker === featured.ticker);
  const upside = match?.remaining;
  const target = match?.targetPrice;
  // Data-integrity: a target/upside is only real when a real price backs it. The old
  // gate passed for target=0 (0 IS a number) → "EGP 0.00" + a fake upside. Require a
  // positive target + current price; otherwise the whole stats row is omitted.
  const matchHasPrice = typeof match?.currentPrice === "number" && match.currentPrice > 0;
  const hasTarget = typeof target === "number" && target > 0;
  const hasUpside = typeof upside === "number" && Number.isFinite(upside) && matchHasPrice && hasTarget;
  const title = isAr && featured.titleAr ? featured.titleAr : featured.title;
  const subtitle = isAr && featured.subtitleAr ? featured.subtitleAr : featured.subtitle;
  const upColor = (upside ?? 0) >= 0 ? C.primary : C.accent.red;

  return (
    <View style={[styles.sectionPad, { marginTop: Spacing[6] }]}>
      <Pressable
        style={[styles.featuredCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}
        onPress={() => router.push({ pathname: "/article/[id]", params: { id: featured.id } })}
      >
        <View style={[styles.featuredCover, { backgroundColor: C.bg.elevated }]}>
          <ArticleCover ticker={featured.ticker} signal={featured.tag} />
          <View style={styles.featuredBadgeRow} pointerEvents="none">
            <View style={[styles.featuredBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text style={[styles.featuredBadgeText, { fontFamily: fontFamily("800") }]}>
                {isAr ? "مميّز" : "FEATURED"}
              </Text>
            </View>
            {featured.ticker ? (
              <View style={[styles.featuredTickerBadge, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                <TickerLogo ticker={featured.ticker} size={20} />
                <Text style={[styles.featuredTickerText, { fontFamily: fontFamily("800") }]}>{featured.ticker}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.featuredBody}>
          {featured.tag ? (
            <View style={{ marginBottom: Spacing[2], alignSelf: isRTL ? "flex-end" : "flex-start" }}>
              <SignalBadge signal={featured.tag} size="sm" />
            </View>
          ) : null}
          <Text style={[styles.featuredTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.featuredSubtitle, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]} numberOfLines={3}>
              {subtitle}
            </Text>
          ) : null}

          {hasTarget ? (
            <View style={[styles.featuredStatsRow, isRTL && styles.rowRTL]}>
              {hasUpside ? (
                <>
                  <View style={[styles.featuredStatPill, isRTL && styles.rowRTL]}>
                    <Ionicons
                      name={(upside as number) >= 0 ? "trending-up" : "trending-down"}
                      size={14}
                      color={upColor}
                    />
                    <Text style={[styles.featuredStatValue, { color: upColor, fontFamily: fontFamily("800") }]}>
                      {(upside as number) > 0 ? "+" : ""}{(upside as number).toFixed(1)}%
                    </Text>
                    <Text style={[styles.featuredStatLabel, { color: C.text.muted, fontFamily: fontFamily("400") }]}>
                      {(upside as number) >= 0 ? (isAr ? "صعود" : "upside") : (isAr ? "هبوط" : "downside")}
                    </Text>
                  </View>
                  <View style={[styles.featuredStatDivider, { backgroundColor: C.border.subtle }]} />
                </>
              ) : null}
              <Text style={[styles.featuredStatLabel, { color: C.text.muted, fontFamily: fontFamily("400") }]}>
                {isAr ? "الهدف" : "Target"}{" "}
                <Text style={[styles.featuredTargetValue, { color: C.primary, fontFamily: fontFamily("700") }]}>
                  {currency} {(target as number).toFixed(2)}
                </Text>
              </Text>
            </View>
          ) : null}

          <View style={[styles.featuredFooter, isRTL && styles.rowRTL]}>
            <View style={[styles.featuredAuthorRow, isRTL && styles.rowRTL]}>
              <View style={[styles.featuredAuthorAvatar, { backgroundColor: `${C.primary}1A` }]}>
                <Text style={[styles.featuredAuthorInitial, { color: C.primary, fontFamily: fontFamily("800") }]}>
                  {String(featured.author?.[0] ?? "?").charAt(0)}
                </Text>
              </View>
              <Text style={[styles.featuredAuthorName, { color: C.text.secondary, fontFamily: fontFamily("600") }]} numberOfLines={1}>
                {(featured.author ?? []).join(isAr ? "، " : ", ")}
              </Text>
            </View>
            <View style={[styles.featuredCTA, isRTL && styles.rowRTL]}>
              <Text style={[styles.featuredCTAText, { color: C.primary, fontFamily: fontFamily("700") }]}>
                {isAr ? "اقرأ التحليل" : "Read analysis"}
              </Text>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={14} color={C.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// ── Call Card ─────────────────────────────────────────────────────────────────
type AnyFundCall = FundamentalCall | SaudiStock | UsaStock;

function CallCard({
  call, currency, benchmarkLabel, isAr, isRTL, fontFamily, C, closed,
}: {
  call: AnyFundCall;
  currency: string;
  benchmarkLabel: string;
  isAr: boolean;
  isRTL: boolean;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
  C: ReturnType<typeof useColors>;
  closed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // For a closed call show the REALIZED return ("محقق"), not the frozen upside
  // labelled "Remaining" — the latter implies live actionable upside on an exited position.
  const realized = closed ? (getRealizedReturn(call as any) ?? call.performance ?? 0) : null;
  // Data-integrity hardened (mirror of stock detail): a MISSING price (≤0/null/NaN)
  // must never render as "EGP 0.00" or feed a fabricated 0.00% into the metrics.
  // Treat any non-positive currentPrice as "no price" → localized dash. A CLOSED
  // call keeps its realized return (computed above), which stands on its own.
  const hasPrice = typeof call.currentPrice === "number" && call.currentPrice > 0;
  const hasTarget = typeof call.targetPrice === "number" && call.targetPrice > 0;
  const dash = isAr ? "غير متاح" : "—";
  // Headline: realized for closed; for an OPEN call only show the stored upside when
  // there's a real price to back it (else dash — never a fake +0.0%).
  const headlineValue: number | null = closed
    ? (realized as number)
    : (hasPrice ? call.remaining : null);
  const remColor = (headlineValue ?? 0) >= 0 ? C.primary : C.accent.red;
  // Performance is only meaningful for an OPEN call with a real price (mirror web).
  const perfValue: number | null = closed
    ? (realized as number)
    : (hasPrice ? call.performance : null);
  const perfColor = (perfValue ?? 0) >= 0 ? C.primary : C.accent.red;

  // Thesis: pick Arabic if available and Arabic selected
  const thesisText = isAr && "thesisAr" in call ? call.thesisAr : call.thesis;
  const companyName = isAr && "companyAr" in call ? (call as any).companyAr : call.company;
  const benchmarkValue = "egx30" in call ? (call as any).egx30 : "sp500" in call ? (call as any).sp500 : (call as any).tadawul;
  // A missing benchmark is null/undefined (the ingest explicitly forbids 0% — a fake
  // flat market inflates alpha). Render the dash, not "+0.00%", when it's absent.
  const hasBenchmark = typeof benchmarkValue === "number" && Number.isFinite(benchmarkValue);
  const benchmarkColor = hasBenchmark ? (benchmarkValue >= 0 ? C.primary : C.accent.red) : C.text.muted;
  const articleId = "articleId" in call ? call.articleId : undefined;
  const updates = visibleCallUpdates((call as any).updates);
  const lastUpdated = updates[0]?.date ?? (call as any).updatedDate;

  return (
    <Pressable
      onPress={() => setExpanded(e => !e)}
      style={[
        styles.callCard,
        { backgroundColor: C.bg.surface, borderColor: expanded ? `${C.primary}40` : C.border.subtle },
        expanded && { backgroundColor: C.bg.elevated },
      ]}
    >
      <View style={[styles.callRow, isRTL && styles.rowRTL]}>
        <TickerLogo ticker={call.ticker} size={42} />
        <View style={styles.callInfo}>
          <View style={[styles.callInfoTop, isRTL && styles.rowRTL]}>
            <Text style={[styles.callTicker, { color: C.text.primary, fontFamily: fontFamily("800") }]}>{call.ticker}</Text>
            <SignalBadge signal={call.signal} size="sm" />
            {closed ? (
              <View style={[styles.closedBadge, { backgroundColor: C.bg.elevated, borderColor: C.border.default }]}>
                <Text style={[styles.closedBadgeText, { color: C.text.muted, fontFamily: fontFamily("700") }]}>
                  {isAr ? "مغلقة" : "CLOSED"}
                </Text>
              </View>
            ) : (
              <View style={[styles.closedBadge, { backgroundColor: `${C.primary}1A`, borderColor: `${C.primary}40` }]}>
                <Text style={[styles.closedBadgeText, { color: C.primary, fontFamily: fontFamily("700") }]}>
                  {isAr ? "نشط" : "ACTIVE"}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.callCompany, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]} numberOfLines={1}>
            {companyName}
          </Text>
          <View style={[styles.callMeta, isRTL && styles.rowRTL]}>
            <Ionicons name="person-outline" size={10} color={C.text.muted} />
            <Text style={[styles.callMetaText, { color: C.text.muted, fontFamily: fontFamily("400") }]}>{call.analyst}</Text>
            <Text style={[styles.callMetaDot, { color: C.text.muted }]}>·</Text>
            <Text style={[styles.callMetaText, { color: C.text.muted }]}>{formatDate(call.initiatedDate)}</Text>
            {lastUpdated && updates.length > 0 ? (
              <UpdatedBadge date={lastUpdated} isAr={isAr} C={C} fontFamily={fontFamily} />
            ) : null}
          </View>
        </View>
        <View style={[styles.callReturn, isRTL && styles.alignStart]}>
          <Text style={[styles.callReturnLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
            {closed ? (isAr ? "محقق" : "Realized") : (isAr ? "المتبقي" : "Remaining")}
          </Text>
          <Text style={[styles.callReturnValue, { color: headlineValue == null ? C.text.muted : remColor }]}>
            {headlineValue == null ? dash : `${headlineValue > 0 ? "+" : ""}${headlineValue.toFixed(2)}%`}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={C.text.muted} />
      </View>

      {expanded && (
        <View style={[styles.callExpanded, { borderTopColor: C.border.subtle }]}>
          {/* Price targets */}
          <View style={[styles.priceTargets, isRTL && styles.rowRTL]}>
            <View style={[styles.priceTarget, { backgroundColor: C.bg.overlay }]}>
              <Text style={[styles.priceLabel, { color: C.text.muted, fontFamily: fontFamily("600") }, isRTL && styles.textRight]}>
                {isAr ? "الحالي" : "Current"}
              </Text>
              <Text style={[styles.priceValue, { color: C.text.primary }, isRTL && styles.textRight]}>
                {hasPrice ? `${currency} ${call.currentPrice.toFixed(2)}` : dash}
              </Text>
            </View>
            <Ionicons name={isAr ? "arrow-back" : "arrow-forward"} size={16} color={C.primary} />
            <View style={[styles.priceTarget, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}20`, borderWidth: 1 }]}>
              <Text style={[styles.priceLabel, { color: C.text.muted, fontFamily: fontFamily("600") }, isRTL && styles.textRight]}>
                {isAr ? "الهدف" : "Target"}
              </Text>
              <Text style={[styles.priceValue, { color: C.primary }, isRTL && styles.textRight]}>
                {hasTarget ? `${currency} ${call.targetPrice.toFixed(2)}` : dash}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.expandedStats, isRTL && styles.rowRTL]}>
            <View style={[styles.expandedStat, { backgroundColor: C.bg.overlay }]}>
              <Text style={[styles.expandedLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
                {isAr ? "عائدنا" : "Our Return"}
              </Text>
              <Text style={[styles.expandedValue, { color: perfValue == null ? C.text.muted : perfColor }]}>
                {perfValue == null ? dash : `${perfValue > 0 ? "+" : ""}${perfValue.toFixed(2)}%`}
              </Text>
            </View>
            <View style={[styles.expandedStat, { backgroundColor: C.bg.overlay }]}>
              <Text style={[styles.expandedLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
                {benchmarkLabel}
              </Text>
              <Text style={[styles.expandedValue, { color: benchmarkColor }]}>
                {hasBenchmark ? `${benchmarkValue > 0 ? "+" : ""}${benchmarkValue.toFixed(2)}%` : dash}
              </Text>
            </View>
            <View style={[styles.expandedStat, { backgroundColor: C.bg.overlay }]}>
              <Text style={[styles.expandedLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
                {isAr ? "القطاع" : "Sector"}
              </Text>
              <Text style={[styles.expandedValue, { color: C.text.secondary, fontSize: 12, fontFamily: fontFamily("400") }]}>
                {isAr && "sectorAr" in call ? call.sectorAr : call.sector}
              </Text>
            </View>
          </View>

          {thesisText ? (
            <View style={[styles.thesisBox, { backgroundColor: `${C.primary}0A`, borderColor: `${C.primary}20` }]}>
              <Text style={[styles.thesisLabel, { color: C.text.muted, fontFamily: fontFamily("700") }]}>
                {isAr ? "أطروحة المحلل" : "ANALYST THESIS"}
              </Text>
              {looksLikeHtml(thesisText)
                ? <RichText html={thesisText} colors={C} isRTL={isRTL} fontFamily={fontFamily} />
                : <Text style={[styles.thesisText, { color: C.text.secondary, fontFamily: fontFamily("400"), textAlign: isAr ? "right" : "left" }]}>{thesisText}</Text>
              }
            </View>
          ) : null}

          {updates.length > 0 ? (
            <CallUpdates updates={updates} isAr={isAr} isRTL={isRTL} C={C} fontFamily={fontFamily} />
          ) : null}

          <View style={[styles.callActions, isRTL && styles.rowRTL]}>
            {articleId ? (
              <Pressable
                style={[styles.readBtn, { backgroundColor: C.primary, flex: 1 }]}
                onPress={() => router.push({ pathname: "/article/[id]", params: { id: articleId } })}
              >
                <Ionicons name="document-text" size={14} color="#fff" />
                <Text style={[styles.readBtnText, { fontFamily: fontFamily("700") }]}>
                  {isAr ? "التقرير الكامل" : "Full Report"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.stockBtn, { borderColor: C.border.default }]}
              onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: call.ticker } })}
            >
              <Ionicons name="stats-chart-outline" size={14} color={C.text.secondary} />
              <Text style={[styles.stockBtnText, { color: C.text.secondary, fontFamily: fontFamily("600") }]}>
                {isAr ? "السهم" : "Stock"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
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
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: Typography.md, fontWeight: "800" },
  sectionSub: { fontSize: Typography.xs, marginTop: 2 },
  filters: { flexDirection: "row", gap: Spacing[2] },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: "600" },
  callsTabs: { flexDirection: "row", borderRadius: Radius.full, borderWidth: 1, padding: 3, gap: 3 },
  callsTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  callsTabText: { fontSize: 11, fontWeight: "700" },
  callCard: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[3] },
  callRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  callLogo: { width: 42, height: 42, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  callLogoText: { fontSize: 11, fontWeight: "800" },
  callInfo: { flex: 1, gap: 2 },
  callInfoTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  callTicker: { fontWeight: "800", fontSize: Typography.sm, letterSpacing: 0.8 },
  callCompany: { fontSize: 11 },
  callMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  callMetaText: { fontSize: 10 },
  callMetaDot: { fontSize: 10 },
  closedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  closedBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.5 },
  callReturn: { alignItems: "flex-end", gap: 2 },
  callReturnLabel: { fontSize: 9, fontWeight: "600" },
  callReturnValue: { fontSize: Typography.md, fontWeight: "800" },
  callExpanded: { marginTop: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1, gap: Spacing[3] },
  priceTargets: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  priceTarget: { flex: 1, padding: Spacing[3], borderRadius: Radius.lg, gap: 3 },
  priceLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  priceValue: { fontSize: Typography.md, fontWeight: "800" },
  expandedStats: { flexDirection: "row", gap: Spacing[2] },
  expandedStat: { flex: 1, borderRadius: Radius.md, padding: Spacing[2], gap: 2 },
  expandedLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  expandedValue: { fontSize: Typography.md, fontWeight: "800" },
  thesisBox: { borderRadius: Radius.lg, padding: Spacing[3], borderWidth: 1, gap: 4 },
  thesisLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  thesisText: { fontSize: 12, lineHeight: 18 },
  callActions: { flexDirection: "row", gap: Spacing[2] },
  readBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: Radius.xl },
  readBtnText: { color: "#fff", fontWeight: "700", fontSize: Typography.sm },
  stockBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: Spacing[4], borderRadius: Radius.xl, borderWidth: 1 },
  stockBtnText: { fontWeight: "600", fontSize: Typography.sm },
  articleCard: { width: 200, borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  articleThumb: { height: 110, alignItems: "center", justifyContent: "center" },
  timeBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  timeBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  tagBadge: { position: "absolute", top: 8, right: 8 },
  articleBody: { padding: Spacing[3], gap: 4 },
  articleTitle: { fontSize: Typography.sm, fontWeight: "700", lineHeight: 18 },
  articleMeta: { flexDirection: "row", justifyContent: "space-between" },
  articleAuthor: { fontSize: 10, fontWeight: "600" },
  articleDate: { fontSize: 10 },
  // ── Featured editorial card ────────────────────────────────────────────────
  featuredCard: { borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  featuredCover: { height: 160, position: "relative" },
  featuredBadgeRow: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  featuredBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  featuredBadgeText: { color: "#fff", fontSize: 9, letterSpacing: 0.5 },
  featuredTickerBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.lg },
  featuredTickerText: { color: "#fff", fontSize: 11, letterSpacing: 0.6 },
  featuredBody: { padding: Spacing[4], gap: 8 },
  featuredTitle: { fontSize: Typography.lg, fontWeight: "800", lineHeight: 24, letterSpacing: -0.3 },
  featuredSubtitle: { fontSize: 13, lineHeight: 20 },
  featuredStatsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" },
  featuredStatPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  featuredStatValue: { fontSize: Typography.md, fontWeight: "800" },
  featuredStatLabel: { fontSize: 11 },
  featuredStatDivider: { width: 1, height: 14 },
  featuredTargetValue: { fontWeight: "700" },
  featuredFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  featuredAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  featuredAuthorAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  featuredAuthorInitial: { fontSize: 10 },
  featuredAuthorName: { fontSize: 12, flexShrink: 1 },
  featuredCTA: { flexDirection: "row", alignItems: "center", gap: 5 },
  featuredCTAText: { fontSize: 12 },
});

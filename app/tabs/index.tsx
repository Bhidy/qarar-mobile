import { ScrollView, View, StyleSheet, FlatList, Pressable, Modal, TouchableOpacity, TouchableWithoutFeedback, RefreshControl, Image } from "react-native";
import { formatDate } from "@/lib/format-date";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { HomePodcastBlock } from "@/components/shared/HomePodcastBlock";
import { NewsCover } from "@/components/shared/NewsCover";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";
import { EmptyState } from "@/components/shared/EmptyState";
import { ViewMoreButton } from "@/components/shared/ViewMoreButton";
import { useViewMore } from "@/hooks/useViewMore";
import { useData } from "@/hooks/useData";
import { displaySignal } from "@/lib/under-review";
import { fontFamilyFor } from "@/lib/typography";
import { computeOverallPerformance, fmtPct } from "@/lib/performance";
import { getMarketStatus, formatAsOfLocal, type MarketKey } from "@/lib/market-status";

export default function HomeScreen() {
  const C = useColors();
  const { market, setMarket, t, language, photoUri } = useTheme();
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || null;
  const firstName = displayName ? displayName.split(' ')[0] : null;
  const avatarInitial = firstName ? firstName.charAt(0).toUpperCase() : '?';
  // Same source as the profile screen: local pick first, then the server-saved avatar.
  const avatarUri = photoUri ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const {
    ARTICLES, FUNDAMENTAL_CALLS, TECHNICAL_CALLS, NEWS, NOTIFICATIONS,
    SAUDI_FUNDAMENTAL, SAUDI_TECHNICAL, SAUDI_NEWS, SAUDI_ARTICLES,
    USA_FUNDAMENTAL, USA_TECHNICAL, USA_NEWS, USA_ARTICLES, PRICES,
    MARKET_CALENDAR, loading, refetch,
  } = useData();
  // Live EGX30/TASI from the Mubasher feed. When the feed has no index value we
  // show "—" (NOT a hard-coded number) — surfacing a fake, never-changing index %
  // as "LIVE" would be misleading financial data.
  const liveIdx = PRICES[market === "usa" ? "SPX" : market === "saudi" ? "TASI" : "EGX30"];
  const hasLiveIdx = typeof liveIdx?.changePct === "number";
  const idxPct = hasLiveIdx ? (liveIdx!.changePct as number) : 0;
  const idxValue = hasLiveIdx ? `${idxPct >= 0 ? "+" : ""}${idxPct.toFixed(2)}%` : "—";
  // Honest freshness line: a frozen index with no context reads as a bug (the
  // 2026-07-02 EGX holiday). Status is computed locally from market_calendar +
  // session times, so it's correct even between polls.
  const idxMarketKey: MarketKey = market === "usa" ? "usa" : market === "saudi" ? "saudi" : "egypt";
  const idxStatus = getMarketStatus(idxMarketKey, MARKET_CALENDAR);
  const idxAsOf = formatAsOfLocal(liveIdx?.asOf, idxMarketKey);
  const idxAr = language === "ar";
  const idxSub =
    idxStatus.state === "open"
      ? `${liveIdx?.delayed ? (idxAr ? "بتأخير ١٥ د" : "15m delayed") : (idxAr ? "مباشر" : "Live")}${idxAsOf ? ` · ${idxAsOf}` : ""}`
      : idxStatus.state === "preopen"
      ? (idxAr ? "ما قبل الافتتاح" : "Pre-open")
      : idxStatus.state === "holiday"
      ? (idxAr ? "عطلة رسمية" : "Holiday")
      : idxStatus.state === "weekend"
      ? (idxAr ? "السوق مغلق" : "Closed · weekend")
      : (idxAr ? "السوق مغلق" : "Market closed");
  const [callsTab, setCallsTab]   = useState<"fundamental" | "technical">("fundamental");
  const [callsView, setCallsView] = useState<"cards" | "list">("cards");
  const [marketModalVisible, setMarketModalVisible] = useState(false);

  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const isUsa = market === "usa";
  const isRTL = isAr;

  // Typography helper — Manrope (EN) / IBM Plex Sans Arabic (AR)
  const fontFamily = (weight: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, weight);

  const latestContent = isUsa ? USA_ARTICLES.slice(0, 5) : isSaudi ? SAUDI_ARTICLES.slice(0, 5) : ARTICLES.slice(0, 5);

  // Market-aware calls. `hasReturn` gates the return display: a fundamental upside
  // is only real when a live price AND a target back it; a technical return only when
  // target + entry back it. Otherwise the stored return is a fabricated 0 → we render
  // a dash instead of "+0.0%" (mirror of the detail/list data-integrity fix).
  const pos = (v: any): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
  const mapFund = (c: any) => ({
    ticker: c.ticker, signal: displaySignal(c), return: c.remaining, articleId: c.articleId,
    hasReturn: Number.isFinite(c.remaining) && pos(c.currentPrice) && pos(c.targetPrice),
  });
  const mapTech = (c: any) => ({
    ticker: c.ticker, signal: c.signal, return: c.return,
    hasReturn: Number.isFinite(c.return) && pos(c.targetPrice) && pos(c.entryMin) && pos(c.entryMax),
  });
  const fundCalls = (isUsa ? USA_FUNDAMENTAL : isSaudi ? SAUDI_FUNDAMENTAL : FUNDAMENTAL_CALLS).map(mapFund);
  const techCalls = (isUsa ? USA_TECHNICAL : isSaudi ? SAUDI_TECHNICAL : TECHNICAL_CALLS).map(mapTech);

  const activeCalls = callsTab === "fundamental" ? fundCalls : techCalls;
  // Cap the calls preview at 5 rows with a "View more" control (loads 5 more);
  // shared across the cards/list toggle so expansion survives a view switch.
  const callsPager = useViewMore(activeCalls);

  // Live hero metrics — computed from the actual calls (no hard-coded numbers).
  const fundPerf = computeOverallPerformance((isUsa ? USA_FUNDAMENTAL : isSaudi ? SAUDI_FUNDAMENTAL : FUNDAMENTAL_CALLS) as any[], { publishableOnly: true });
  const techPerf = computeOverallPerformance((isUsa ? USA_TECHNICAL : isSaudi ? SAUDI_TECHNICAL : TECHNICAL_CALLS) as any[], { publishableOnly: true });
  const activeCallsCount = fundPerf.activeCount + techPerf.activeCount;
  // Headline "Avg Return" spans BOTH cohorts (fundamental + technical), not only fundamental.
  const combinedPerf = computeOverallPerformance([
    ...((isUsa ? USA_FUNDAMENTAL : isSaudi ? SAUDI_FUNDAMENTAL : FUNDAMENTAL_CALLS) as any[]),
    ...((isUsa ? USA_TECHNICAL : isSaudi ? SAUDI_TECHNICAL : TECHNICAL_CALLS) as any[]),
  ], { publishableOnly: true });
  const avgReturnNum = combinedPerf.avgRealizedReturn;
  const avgReturnStr = fmtPct(avgReturnNum, 1, true);
  // Language rule (matches web): Arabic mode → Arabic news only; English mode → English only.
  const isArabicText = (s?: string | null) => !!s && /[؀-ۿ]/.test(s);
  const newsPool = (isUsa ? USA_NEWS : isSaudi ? SAUDI_NEWS : NEWS);
  const newsPrimary = newsPool.filter((n: any) => {
    const arabicNative = isArabicText(n.title);
    return isAr ? (arabicNative || !!n.titleAr?.trim()) : !arabicNative;
  });
  // Fallback: Arabic-only markets (Egypt) show their Arabic news to English users
  // instead of an empty section. Matches web filterNewsForLanguage.
  const newsData = (!isAr && newsPrimary.length === 0 && newsPool.length > 0)
    ? newsPool.filter((n: any) => isArabicText(n.title) || !!n.titleAr?.trim())
    : newsPrimary;
  const indexLabel = isUsa ? "S&P 500" : isSaudi ? (isAr ? "تداول" : "Tadawul") : (isAr ? "مؤشر EGX 30" : "EGX 30");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg.base }]} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.primary} />}
      >

        {/* ── Header ──────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: C.bg.base, borderBottomColor: C.border.subtle }]}>
          <View style={[styles.logoRow, isAr && styles.rowRTL]}>
            <View style={[styles.markWrap, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
              <SmartSignalsMark size={28} ink={C.text.primary} accent={C.primary} />
            </View>
            <View>
              <Text style={[styles.logoText, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>Smart Signals</Text>
              <Text style={[styles.logoPowered, { color: C.text.muted, fontFamily: fontFamily("600") }, isRTL && styles.textRight]}>
                {isAr ? "مدعوم من مباشر" : "Powered by Mubasher"}
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            {/* Market pill — HIDDEN: re-enable when Saudi/USA are fully ready */}
            <Pressable
              style={[styles.notifBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}
              onPress={() => router.push("/watchlist")}
              accessibilityLabel={isAr ? "قائمة المتابعة" : "Watchlist"}
            >
              <Ionicons name="bookmark-outline" size={18} color={C.text.secondary} />
            </Pressable>
            <Pressable
              style={[styles.notifBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}
              onPress={() => router.push("/search")}
              accessibilityLabel="Search"
            >
              <Ionicons name="search" size={18} color={C.text.secondary} />
            </Pressable>
            <Pressable
              style={[styles.notifBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}
              onPress={() => router.push("/tabs/inbox")}
              accessibilityLabel={isAr ? "الإشعارات" : "Inbox"}
            >
              <Ionicons name="notifications-outline" size={20} color={C.text.secondary} />
              {(() => {
                const unread = (NOTIFICATIONS || []).filter((n: any) => !n.read).length;
                if (unread === 0) return null;
                return (
                  <View style={[styles.notifBadge, { backgroundColor: C.accent.red, borderColor: C.bg.base }, isAr && { right: undefined, left: -4 }]}>
                    <Text style={styles.notifBadgeTxt}>{unread > 99 ? "99+" : String(unread)}</Text>
                  </View>
                );
              })()}
            </Pressable>
            <Pressable
              style={[styles.avatar, { backgroundColor: C.primary, borderColor: C.border.subtle }]}
              onPress={() => router.push("/profile")}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.greeting, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight, { marginTop: Spacing[2] }]}>
            {isAr ? `أهلاً، ${firstName || 'مستثمر'}!` : `Ahlan, ${firstName || 'Investor'}!`}
          </Text>
          <Text style={[styles.greetingSub, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
            {isAr
              ? (isUsa ? "تحليلاتك الاستثمارية اليومية للسوق الأمريكي" : isSaudi ? "تحليلاتك الاستثمارية اليومية لتداول" : "تحليلاتك الاستثمارية اليومية لـ EGX")
              : (isUsa ? "Your daily investment intelligence for NYSE/NASDAQ" : isSaudi ? "Your daily investment intelligence for Tadawul" : "Your daily investment intelligence for EGX")}
          </Text>

          {/* Quick stats */}
          <View style={[styles.statsRow, isRTL && styles.rowRTL]}>
            {[
              { label: indexLabel, value: idxValue, color: !hasLiveIdx ? C.text.primary : (idxPct >= 0 ? C.primary : C.accent.red), sub: idxSub },
              { label: isAr ? "التوصيات" : "Active Calls", value: String(activeCallsCount), color: C.text.primary, sub: null as string | null },
              { label: isAr ? "متوسط العائد" : "Avg Return", value: avgReturnStr, color: avgReturnNum == null ? C.text.primary : (avgReturnNum >= 0 ? C.primary : C.accent.red), sub: null as string | null },
            ].map(stat => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                <Text style={[styles.statLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{stat.label}</Text>
                <Text style={[styles.statValue, { color: stat.color, fontFamily: fontFamily("800") }]}>{stat.value}</Text>
                {stat.sub ? (
                  <Text style={{ color: C.text.muted, fontSize: 9, marginTop: 2, fontFamily: fontFamily("500") }} numberOfLines={1}>
                    {stat.sub}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* ── Spotify Podcast ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionPad}>
            <SectionHeader
              title={isAr ? "بودكاست" : "Podcast"}
              subtitle={isAr ? "إيجاز يومي للأسواق من مكتب أبحاث مباشر." : "Daily market briefings from the Mubasher research desk."}
            />
            <HomePodcastBlock />
          </View>
        </View>

        {/* ── Latest Releases ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionPad}>
            <SectionHeader
              title={isAr ? "أحدث التقارير والرؤى" : "Latest Reports & Insights"}
              subtitle={isAr ? "مقاطع فيديو وحلقات ومقالات متعمقة." : "Videos, episodes & in-depth articles."}
              onViewAll={() => router.push("/articles")}
            />
          </View>
          <FlatList
            horizontal
            inverted={isAr}
            data={latestContent}
            keyExtractor={i => i.id}
            renderItem={({ item }) => <ContentCard card={item} />}
            contentContainerStyle={styles.hList}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ width: 320, paddingHorizontal: Spacing[4] }}>
                <EmptyState compact icon="albums-outline" title={isAr ? "لا يوجد محتوى بعد" : "No reports yet"} />
              </View>
            }
          />
        </View>

        {/* ── News ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionPad}>
            <SectionHeader
              title={isAr ? "الأخبار" : "News"}
              subtitle={isAr ? "أخبار السوق اليومية لتبقى على اطلاع" : "Daily market news to stay up to date"}
              onViewAll={() => router.push("/news")}
            />
            <View style={[styles.newsList, { borderColor: C.border.subtle }]}>
              {newsData.length === 0 ? (
                <EmptyState compact icon="newspaper-outline" title={isAr ? "لا توجد أخبار بعد" : "No news yet"} />
              ) : newsData.slice(0, 5).map((item, i) => (
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
                  <NewsCover id={item.id} image={(item as any).image} ticker={(item as any).ticker} category={(item as any).category} height={40} width={56} radius={8} />
                  <Text style={[styles.newsTitle, { color: C.text.secondary, fontFamily: fontFamily("400") }, isRTL && styles.textRight]} numberOfLines={2}>
                    {(isAr && (item as any).titleAr) ? (item as any).titleAr : item.title}
                  </Text>
                  <Text style={[styles.newsDate, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>{formatDate(item.date)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Calls Summary ───────────────────────────────────── */}
        <View style={[styles.section, styles.sectionPad]}>
          <SectionHeader
            title={isAr ? "ملخص التوصيات" : "Calls Summary"}
            subtitle={isAr ? "ملخص جميع التوصيات الفعّالة." : "Summary of all active recommendations."}
          />

          {/* Tab + view toggle row */}
          <View style={[styles.callsControls, isAr && styles.rowRTL]}>
            {/* Type switcher — row-reversed in Arabic so "أساسي" (fundamental) is the FIRST (rightmost) tab */}
            <View style={[styles.tabSwitch, { backgroundColor: C.bg.surface, borderColor: C.border.subtle, flex: 1 }, isAr && styles.rowRTL]}>
              {(["fundamental", "technical"] as const).map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => setCallsTab(tab)}
                  style={[styles.tabBtn, callsTab === tab && { backgroundColor: C.primary }]}
                >
                  <Text style={[
                    styles.tabBtnText,
                    { color: callsTab === tab ? "#fff" : C.text.muted, fontFamily: fontFamily("700") },
                  ]}>
                    {tab === "fundamental" ? (isAr ? "أساسي" : "Fund.") : (isAr ? "فني" : "Tech.")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Cards/List view toggle */}
            <View style={[styles.viewToggle, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
              <Pressable
                onPress={() => setCallsView("cards")}
                style={[styles.viewBtn, callsView === "cards" && { backgroundColor: C.primary }]}
              >
                <Ionicons name="grid-outline" size={14} color={callsView === "cards" ? "#fff" : C.text.muted} />
              </Pressable>
              <Pressable
                onPress={() => setCallsView("list")}
                style={[styles.viewBtn, callsView === "list" && { backgroundColor: C.primary }]}
              >
                <Ionicons name="list-outline" size={14} color={callsView === "list" ? "#fff" : C.text.muted} />
              </Pressable>
            </View>
          </View>

          {/* ── CARDS VIEW ── */}
          {callsView === "cards" && (
            <View style={[styles.cardsGrid, isAr && styles.rowRTL]}>
              {activeCalls.length === 0 ? (
                <EmptyState
                  icon={callsTab === "fundamental" ? "bar-chart-outline" : "trending-up-outline"}
                  title={isAr ? "لا توجد توصيات فعّالة بعد" : "No active calls yet"}
                />
              ) : callsPager.items.map((item, idx) => {
                const isPos = item.return >= 0;
                // No real price behind the return ⇒ dash the value + zero (hide) the bar.
                const pct = item.hasReturn ? Math.min(Math.abs(item.return), 100) : 0;
                return (
                  <Pressable
                    key={`${item.ticker}_${idx}`}
                    style={({ pressed }) => [
                      styles.callCard,
                      { backgroundColor: C.bg.surface, borderColor: C.border.subtle },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    ]}
                    onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: item.ticker } })}
                  >
                    {/* Top accent line */}
                    <View style={[styles.callCardAccent, { backgroundColor: isPos ? C.primary : C.accent.red }]} />
                    <View style={[styles.callCardRow, isAr && styles.rowRTL]}>
                      <TickerLogo ticker={item.ticker} size={34} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ticker, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>{item.ticker}</Text>
                        <SignalBadge signal={item.signal} size="sm" />
                      </View>
                      <Text style={[styles.cardReturn, { color: item.hasReturn ? (isPos ? C.primary : C.accent.red) : C.text.muted }]}>
                        {item.hasReturn ? `${item.return > 0 ? "+" : ""}${item.return.toFixed(1)}%` : (isAr ? "غير متاح" : "—")}
                      </Text>
                    </View>
                    {/* Progress bar — hidden when there's no real return behind it. */}
                    {item.hasReturn ? (
                      <View style={[styles.progressBg, { backgroundColor: C.bg.elevated }]}>
                        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: isPos ? C.primary : C.accent.red }]} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          {callsView === "cards" && activeCalls.length > 0 && <ViewMoreButton {...callsPager} />}

          {/* ── LIST VIEW ── */}
          {callsView === "list" && (
            <>
              <View style={[styles.tableHeader, { backgroundColor: C.bg.elevated }, isAr && styles.rowRTL]}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, color: C.text.muted }]}>
                  {isAr ? "الإشارة" : "SIGNAL"}
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, color: C.text.muted }]}>
                  {isAr ? "الرمز" : "TICKER"}
                </Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: isAr ? "left" : "right", color: C.text.muted }]}>
                  {callsTab === "fundamental" ? (isAr ? "المتبقي" : "UPSIDE") : (isAr ? "العائد" : "RETURN")}
                </Text>
              </View>

              {activeCalls.length === 0 ? (
                <View style={{ marginTop: Spacing[3] }}>
                  <EmptyState
                    icon={callsTab === "fundamental" ? "bar-chart-outline" : "trending-up-outline"}
                    title={isAr ? "لا توجد توصيات فعّالة بعد" : "No active calls yet"}
                  />
                </View>
              ) : callsPager.items.map(item => (
                <Pressable
                  key={item.ticker}
                  style={[styles.tableRow, { borderBottomColor: C.border.subtle }, isAr && styles.rowRTL]}
                  onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: item.ticker } })}
                >
                  <View style={{ flex: 1.2 }}>
                    <SignalBadge signal={item.signal} size="sm" />
                  </View>
                  <View style={[styles.tickerCell, { flex: 1.5 }, isAr && styles.rowRTL]}>
                    <TickerLogo ticker={item.ticker} size={28} />
                    <Text style={[styles.ticker, { color: C.text.primary, fontFamily: fontFamily("800") }]}>{item.ticker}</Text>
                  </View>
                  <Text style={[
                    styles.returnVal,
                    { flex: 1, textAlign: isAr ? "left" : "right" },
                    { color: item.hasReturn ? (item.return >= 0 ? C.primary : C.accent.red) : C.text.muted },
                  ]}>
                    {item.hasReturn ? `${item.return > 0 ? "+" : ""}${item.return.toFixed(2)}%` : (isAr ? "غير متاح" : "—")}
                  </Text>
                </Pressable>
              ))}
              {activeCalls.length > 0 && <ViewMoreButton {...callsPager} />}
            </>
          )}
        </View>

        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>

      {/* Market Switcher Modal — HIDDEN: re-enable when Saudi/USA are fully ready */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  textRight: { textAlign: "right" },

  header: {
    padding: Spacing[4],
    paddingTop: Spacing[2],
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: "row", alignItems: "center",
    gap: Spacing[2], marginBottom: Spacing[4],
  },
  rowRTL: { flexDirection: "row-reverse" },
  markWrap: {
    width: 34, height: 34, borderRadius: Radius.md,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: Typography.md, fontWeight: "800", letterSpacing: -0.3, lineHeight: 19 },
  logoPowered: { fontSize: 8, fontWeight: "500", letterSpacing: 0.1, lineHeight: 11 },

  marketPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.md, borderWidth: 1,
  },
  marketFlag: { fontSize: 12 },
  marketLabel: { fontSize: 10, fontWeight: "600" },

  notifBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    marginRight: Spacing[1],
  },
  notifDot: {
    position: "absolute", top: 7, right: 7,
    width: 7, height: 7, borderRadius: 4, borderWidth: 1.5,
  },
  notifBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  notifBadgeTxt: { color: "#fff", fontWeight: "800", fontSize: 9.5, lineHeight: 11 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 2, overflow: "hidden",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: Typography.sm },
  avatarImg: { width: "100%", height: "100%", borderRadius: 18 },

  livePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, alignSelf: "flex-start", marginBottom: Spacing[3],
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  greeting: { fontSize: Typography["2xl"], fontWeight: "800", letterSpacing: -0.5 },
  greetingSub: { fontSize: Typography.sm, marginTop: 3, marginBottom: Spacing[4] },

  statsRow: { flexDirection: "row", gap: Spacing[2] },
  statCard: {
    flex: 1, borderWidth: 1, borderRadius: Radius.lg,
    padding: Spacing[3], alignItems: "center", gap: 3,
  },
  statLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  statValue: { fontSize: Typography.md, fontWeight: "800", letterSpacing: -0.3 },

  section: { paddingTop: Spacing[6] },
  sectionPad: { paddingHorizontal: Spacing[4] },
  hList: { paddingHorizontal: Spacing[4], gap: Spacing[3] },

  newsList: { borderRadius: Radius.xl, overflow: "hidden", borderWidth: 1 },
  newsItem: {
    flexDirection: "row", alignItems: "center", gap: Spacing[2],
    paddingHorizontal: Spacing[4], paddingVertical: 11,
  },
  newsDot: { width: 4, height: 4, borderRadius: 2, marginRight: 2, flexShrink: 0 },
  newsTitle: { flex: 1, fontSize: Typography.xs, lineHeight: 16 },
  newsDate: { fontSize: 10, flexShrink: 0 },

  callsControls: {
    flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[4],
  },
  tabSwitch: {
    flexDirection: "row", borderWidth: 1,
    borderRadius: Radius.xl, padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.lg, alignItems: "center" },
  tabBtnText: { fontSize: Typography.xs, fontWeight: "700" },
  viewToggle: {
    flexDirection: "row", borderWidth: 1,
    borderRadius: Radius.xl, padding: 3, gap: 2,
  },
  viewBtn: {
    width: 34, height: 34, borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
  },

  // Cards grid
  cardsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: Spacing[2],
  },
  callCard: {
    width: "48%", borderRadius: Radius.lg, borderWidth: 1,
    overflow: "hidden", padding: Spacing[3],
  },
  callCardAccent: { height: 2, borderRadius: 1, marginBottom: Spacing[2] },
  callCardRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginBottom: Spacing[2] },
  cardReturn: { fontSize: Typography.sm, fontWeight: "800", letterSpacing: -0.3 },
  progressBg: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },

  tableHeader: {
    flexDirection: "row", paddingVertical: 8, paddingHorizontal: Spacing[3],
    borderRadius: Radius.md, marginBottom: Spacing[1],
  },
  tableHeaderCell: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[3],
    borderBottomWidth: 1,
  },
  tickerCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  tickerIcon: {
    width: 28, height: 28, borderRadius: Radius.sm,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  tickerIconText: { fontSize: 9, fontWeight: "800" },
  ticker: { fontWeight: "800", fontSize: Typography.sm, letterSpacing: 0.8 },
  returnVal: { fontWeight: "700", fontSize: Typography.sm, letterSpacing: 0.2 },

  // Market modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  marketModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
    gap: Spacing[3],
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: Spacing[2],
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: Typography.xs,
    textAlign: "center",
    marginTop: -Spacing[2],
    marginBottom: Spacing[1],
  },
  marketOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  optFlag: { fontSize: 28 },
  optName: { fontSize: Typography.sm, fontWeight: "700", letterSpacing: -0.2 },
  optDesc: { fontSize: Typography.xs, marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  cancelBtn: {
    marginTop: Spacing[1],
    paddingVertical: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: Typography.sm, fontWeight: "600" },
});

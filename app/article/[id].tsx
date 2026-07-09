import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";
import { displayAuthors } from "@/lib/byline";
import { ScrollView, View, StyleSheet, Pressable, Image, Modal, Share } from "react-native";
import { WebView } from "react-native-webview";
import { Text } from "@/components/shared/AppText";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { useData } from "@/hooks/useData";
import { RichText, looksLikeHtml } from "@/lib/rich-text";
import { CollapsibleDisclaimer } from "@/components/shared/CollapsibleDisclaimer";
import { fontFamilyFor } from "@/lib/typography";
import { WEB_BASE } from "@/constants/site";
import { tradingViewChartHtml, TV_BASE_URL, webviewAllowRequest } from "@/lib/embeds";
import { tvSymbol, tvInterval, parseTvStudies } from "@/lib/tv-symbol";

export default function ArticleDetail() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ARTICLES, SAUDI_ARTICLES, USA_ARTICLES } = useData();
  // Search every market so a Saudi/USA report resolves too (ARTICLES is Egypt-only).
  // Without USA_ARTICLES a usa-market Technical Report hit the not-found screen.
  const all = [...ARTICLES, ...SAUDI_ARTICLES, ...USA_ARTICLES];
  // No `?? all[0]` fallback: a stale/deleted id must hit the not-found screen below,
  // not silently render an unrelated report (audit mobile-H1).
  const article = all.find(a => a.id === id);

  const { isDark } = useTheme();
  // ── Technical Report interactive chart (same as a Live Signal) ──────────────
  // Hooks must run unconditionally (before the not-found early return).
  const [showLiveChart, setShowLiveChart] = useState(false);
  const [chartAspect, setChartAspect] = useState(1.6);
  // The live chart rotates to landscape (a wide canvas reads a trading chart best),
  // restoring the app-wide portrait lock on close/unmount.
  useEffect(() => {
    if (!showLiveChart) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); };
  }, [showLiveChart]);
  // Real aspect ratio of the captured chart so it renders FULL (never cropped).
  useEffect(() => {
    const uri = article?.chartImage;
    if (!uri) return;
    Image.getSize(uri, (w, h) => { if (w > 0 && h > 0) setChartAspect(w / h); }, () => {});
  }, [article?.chartImage]);

  // Graceful not-found instead of crashing when the list is empty / id is bad
  if (!article) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: C.border.subtle }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={20} color={C.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text.primary }]} numberOfLines={1}>{isAr ? "الأبحاث" : "Research"}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 }}>
          <Ionicons name="document-text-outline" size={36} color={C.text.muted} />
          <Text style={{ color: C.text.primary, fontWeight: "700", fontSize: 16 }}>{isAr ? "التقرير غير متاح" : "Report not available"}</Text>
          <Text style={{ color: C.text.muted, textAlign: "center" }}>{isAr ? "تعذّر تحميل هذا التقرير. اسحب للتحديث أو حاول مرة أخرى." : "This report could not be loaded. Pull to refresh or try again later."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Null-safe author derivation — never crash on missing/empty author
  const authors = (article.author ?? []).filter(Boolean);
  const authorName = displayAuthors(authors, isAr) || (isAr ? "فريق أبحاث Smart Signals" : "Smart Signals Research");
  const authorInitial = (authorName.trim().charAt(0) || "S").toUpperCase();

  const related = all.filter(a => a.id !== article.id && (a.ticker === article.ticker || a.section === article.section)).slice(0, 3);

  // Technical Reports carry an analyst-drawn TradingView chart (captured image +
  // live interactive chart), exactly like a Live Signal.
  const isTechnical = article.section === "technical";
  const chartImage = article.chartImage;
  const techMarket: "egypt" | "saudi" | "usa" =
    article.market === "saudi" || article.market === "usa"
      ? article.market
      : (/^\d{3,4}$/.test(article.ticker ?? "") ? "saudi" : "egypt");
  const tvSym = isTechnical ? tvSymbol(article.ticker, techMarket, article.chartSymbol) : "";
  const tvInt = isTechnical ? tvInterval(article.chartTimeframe, article.chartInterval) : "D";
  const tvStudies = isTechnical ? parseTvStudies(article.chartStudies) : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: C.border.subtle }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]} numberOfLines={1}>
          {article.ticker ?? (isAr ? "الأبحاث" : "Research")}
        </Text>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: C.bg.elevated }]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            Share.share({
              title: article.title,
              message: `${article.title}\n\n${WEB_BASE}/article/${article.id}`,
            }).catch(() => {});
          }}
        >
          <Ionicons name="share-outline" size={18} color={C.text.secondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={[styles.hero, { backgroundColor: C.bg.surface }]}>
          {/* Category + (optional) signal — reading-time chip removed */}
          <View style={[styles.heroMeta, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.catChip, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}25` }]}>
              <Ionicons
                name={article.type === "video" ? "play" : "document-text"}
                size={10} color={C.primary}
              />
              <Text style={[styles.catChipText, { color: C.primary }]}>
                {article.type === "video" ? (isAr ? "فيديو" : "Video") : (isAr ? "تقرير" : "Report")}
              </Text>
            </View>
            {article.tag && <SignalBadge signal={article.tag} size="sm" />}
          </View>

          {/* Title — reader's language */}
          <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>
            {isAr && article.titleAr ? article.titleAr : article.title}
          </Text>

          {/* Subtitle — reader's language */}
          {(isAr && article.subtitleAr ? article.subtitleAr : article.subtitle) ? (
            <Text style={[styles.subtitle, { color: C.text.secondary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>
              {isAr && article.subtitleAr ? article.subtitleAr : article.subtitle}
            </Text>
          ) : null}

          {/* Author row */}
          <View style={[styles.authorRow, { borderTopColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.authorAvatar, { backgroundColor: C.primarySoft }]}>
              <Text style={[styles.authorAvatarText, { color: C.primary }]}>
                {authorInitial}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: C.text.primary }]}>
                {authorName}
              </Text>
              {article.authorRole ? (
                <Text style={[styles.authorRole, { color: C.text.muted }]}>{article.authorRole}</Text>
              ) : null}
            </View>
            <Text style={[styles.articleDate, { color: C.text.muted }]}>{formatDate(article.date)}</Text>
          </View>
        </View>

        {/* Ticker pill (if applicable) */}
        {article.ticker ? (
          <View style={[styles.tickerBanner, { backgroundColor: C.bg.elevated, borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.tickerPill, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}30` }]}>
              <Text style={[styles.tickerText, { color: C.primary }]}>{article.ticker}</Text>
            </View>
            <Pressable
              style={[styles.stockLink, isRTL && { flexDirection: "row-reverse" }]}
              onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: article.ticker! } })}
            >
              <Text style={[styles.stockLinkText, { color: C.primary }]}>{isAr ? "عرض تفاصيل السهم" : "View Stock Detail"}</Text>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={12} color={C.primary} />
            </Pressable>
          </View>
        ) : null}

        {/* Technical Report chart — captured analyst chart + live interactive chart */}
        {isTechnical && (chartImage || tvSym) ? (
          <View style={{ paddingHorizontal: Spacing[4], marginTop: Spacing[4], gap: Spacing[3] }}>
            {chartImage ? (
              <View style={[styles.analystChartCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                <View style={[styles.analystChartHeader, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="stats-chart-outline" size={14} color={C.primary} />
                  <Text style={[styles.analystChartTitle, { color: C.text.primary }]}>{isAr ? "رسم المحلل" : "Analyst's Chart"}</Text>
                  {article.chartCaption ? (
                    <Text style={[styles.analystChartCaption, { color: C.text.muted }]} numberOfLines={1}>· {article.chartCaption}</Text>
                  ) : null}
                </View>
                <Image source={{ uri: chartImage }} style={{ width: "100%", aspectRatio: chartAspect, backgroundColor: C.bg.base }} resizeMode="contain" />
              </View>
            ) : null}
            {tvSym ? (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowLiveChart(true); }}
                style={[styles.liveCtaCard, { backgroundColor: `${C.primary}10`, borderColor: `${C.primary}33` }, isRTL && { flexDirection: "row-reverse" }]}
              >
                <View style={[styles.liveCtaIcon, { backgroundColor: `${C.primary}22` }]}>
                  <Ionicons name="pulse" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveCtaTitle, { color: C.text.primary }, isRTL && { textAlign: "right" }]}>{isAr ? "افتح الرسم البياني المباشر" : "Open Live Interactive Chart"}</Text>
                  <Text style={[styles.liveCtaSub, { color: C.text.muted }, isRTL && { textAlign: "right" }]}>{isAr ? "رسم تفاعلي — مؤشرات وأدوات رسم" : "Real-time chart — indicators & drawing tools"}</Text>
                </View>
                <View style={[styles.liveCtaBtn, { backgroundColor: C.primary }]}>
                  <Ionicons name="eye-outline" size={14} color="#fff" />
                  <Text style={styles.liveCtaBtnText}>{isAr ? "عرض" : "View"}</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Article body — reader's language; rich HTML or plain paragraphs */}
        <View style={[styles.body, { paddingHorizontal: Spacing[4] }]}>
          {(() => {
            const body = isAr && article.bodyAr ? article.bodyAr : article.body;
            // The app is fully free: every published report is open to any signed-in
            // user. When a report has no body yet we show a neutral "not available"
            // state — never a paywall.
            if (!body) {
              return (
                <View style={[styles.lockedBox, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <Ionicons name="document-text-outline" size={32} color={C.text.muted} />
                  <Text style={[styles.lockedTitle, { color: C.text.primary }]}>{isAr ? "لا يوجد محتوى بعد" : "No content yet"}</Text>
                  <Text style={[styles.lockedSub, { color: C.text.muted }]}>
                    {isAr ? "سيظهر التقرير الكامل هنا فور نشره." : "The full report will appear here once it's published."}
                  </Text>
                </View>
              );
            }
            if (article.bodyFormat === "rich" || looksLikeHtml(body)) {
              return <RichText html={body} colors={C} isRTL={isRTL} fontFamily={ff} />;
            }
            return body.split("\n\n").map((para, i) => (
              <Text key={i} style={[styles.bodyText, { color: C.text.secondary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>{para}</Text>
            ));
          })()}
        </View>

        {/* Disclaimer (تنويه) — Fundamental Reports; collapsed, tap to expand */}
        <View style={styles.sectionPad}>
          <CollapsibleDisclaimer html={isAr ? (article.disclaimerAr || article.disclaimer) : (article.disclaimer || article.disclaimerAr)} />
        </View>

        {/* "Key Takeaways" was a generic 3-bullet template (same text on every
            article) — not real per-article data — so it's removed in favour of
            showing only the actual article body. Bring it back later as a real
            field on the Article when the admin authors per-article takeaways. */}

        {/* Related research — language-aware: shows Arabic title/byline in AR mode */}
        {related.length > 0 ? (
          <View style={[styles.sectionPad, { marginTop: Spacing[6] }]}>
            <Text style={[styles.relatedTitle, { color: C.text.primary, fontFamily: ff("800") }, isRTL && { textAlign: "right" }]}>
              {isAr ? "أبحاث ذات صلة" : "Related Research"}
            </Text>
            <View style={styles.relatedList}>
              {related.map(r => {
                const rTitle = (isAr && (r as any).titleAr) ? (r as any).titleAr : r.title;
                const arAuthors = (r as any).authorAr;
                const baseAuthors = (r.author ?? []).filter(Boolean);
                const authorStr =
                  (isAr && Array.isArray(arAuthors) && arAuthors.filter(Boolean).length > 0)
                    ? arAuthors.filter(Boolean).join("، ")
                    : (baseAuthors.length > 0
                        ? (isAr ? baseAuthors.join("، ") : baseAuthors.join(", "))
                        : (isAr ? "Smart Signals" : "Smart Signals"));
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.relatedCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}
                    onPress={() => router.replace({ pathname: "/article/[id]", params: { id: r.id } })}
                  >
                    <View style={[styles.relatedThumb, { backgroundColor: C.bg.elevated }]}>
                      {r.ticker ? (
                        <Text style={[styles.relatedTicker, { color: C.primary }]}>{r.ticker}</Text>
                      ) : (
                        <Ionicons name="document-text" size={18} color={C.text.muted} />
                      )}
                    </View>
                    <View style={styles.relatedBody}>
                      <Text style={[styles.relatedArticleTitle, { color: C.text.primary, fontFamily: ff("600") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]} numberOfLines={2}>
                        {rTitle}
                      </Text>
                      <Text style={[styles.relatedMeta, { color: C.text.muted, fontFamily: ff("400") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
                        {authorStr} · {formatDate(r.date)}
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={C.text.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ height: Spacing[8] }} />
      </ScrollView>

      {/* Live interactive chart — fullscreen TradingView WebView (landscape) */}
      <Modal
        visible={showLiveChart}
        animationType="slide"
        onRequestClose={() => setShowLiveChart(false)}
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      >
        <SafeAreaProvider>
          {showLiveChart ? <StatusBar hidden /> : null}
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top", "bottom", "left", "right"]}>
            <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable
                style={[styles.backBtn, { backgroundColor: C.bg.elevated }]}
                onPress={() => { Haptics.selectionAsync(); setShowLiveChart(false); }}
              >
                <Ionicons name="close" size={22} color={C.text.primary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: C.text.primary }]}>{tvSym || article.ticker}</Text>
              <View style={{ width: 36 }} />
            </View>
            {showLiveChart ? (
              <WebView
                source={{ html: tradingViewChartHtml(tvSym, tvInt, isDark ? "dark" : "light", isAr ? "ar" : "en", tvStudies), baseUrl: TV_BASE_URL }}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                onShouldStartLoadWithRequest={webviewAllowRequest}
                style={{ flex: 1, backgroundColor: C.bg.base }}
              />
            ) : null}
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  analystChartCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  analystChartHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderBottomWidth: 1 },
  analystChartTitle: { fontSize: Typography.sm, fontWeight: "800" },
  analystChartCaption: { fontSize: 11, flexShrink: 1 },
  liveCtaCard: { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3] },
  liveCtaIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  liveCtaTitle: { fontSize: Typography.sm, fontWeight: "800" },
  liveCtaSub: { fontSize: 11, marginTop: 2 },
  liveCtaBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
  liveCtaBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: Typography.base, fontWeight: "700", textAlign: "center" },
  shareBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  hero: { padding: Spacing[4], gap: Spacing[3] },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: Spacing[2], flexWrap: "wrap" },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  catChipText: { fontSize: 10, fontWeight: "700" },
  title: { fontSize: Typography.lg, fontWeight: "800", lineHeight: 26 },
  subtitle: { fontSize: Typography.sm, lineHeight: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  authorAvatarText: { fontSize: Typography.base, fontWeight: "800" },
  authorInfo: { flex: 1, gap: 1 },
  authorName: { fontSize: Typography.sm, fontWeight: "700" },
  authorRole: { fontSize: 11 },
  articleDate: { fontSize: 11 },

  tickerBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  tickerPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, borderWidth: 1 },
  tickerText: { fontSize: Typography.sm, fontWeight: "800", letterSpacing: 0.8 },
  stockLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  stockLinkText: { fontSize: Typography.sm, fontWeight: "600" },

  body: { marginTop: Spacing[4], gap: Spacing[4] },
  bodyText: { fontSize: Typography.base, lineHeight: 26 },

  lockedBox: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[6], alignItems: "center", gap: Spacing[3] },
  lockedTitle: { fontSize: Typography.lg, fontWeight: "800" },
  lockedSub: { fontSize: Typography.sm, textAlign: "center", lineHeight: 20 },

  sectionPad: { paddingHorizontal: Spacing[4] },
  takeawaysBox: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[3] },
  takeawaysTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  takeawayRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[2] },
  takeawayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7, flexShrink: 0 },
  takeawayText: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },

  relatedTitle: { fontSize: Typography.md, fontWeight: "800", marginBottom: Spacing[3] },
  relatedList: { gap: Spacing[2] },
  relatedCard: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1 },
  relatedThumb: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  relatedTicker: { fontSize: 11, fontWeight: "800" },
  relatedBody: { flex: 1, gap: 2 },
  relatedArticleTitle: { fontSize: Typography.sm, fontWeight: "600", lineHeight: 18 },
  relatedMeta: { fontSize: 10 },
});

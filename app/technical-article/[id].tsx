import { useMemo, useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";
import { ScrollView, View, StyleSheet, Pressable, Modal } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/shared/AppText";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { NewsCover } from "@/components/shared/NewsCover";
import { tradingViewChartHtml, TV_BASE_URL, webviewAllowRequest } from "@/lib/embeds";
import { tvSymbol, tvInterval } from "@/lib/tv-symbol";

/** Strip HTML → readable paragraphs (no WebView dependency on mobile). */
function htmlToParagraphs(html?: string | null): string[] {
  if (!html) return [];
  const text = html
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"');
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

/**
 * Analyst chart uploaded from the admin (item.chartImage). Shown in FULL via
 * contentFit="contain" at the image's own aspect ratio, so a trading chart is
 * never cropped (the old NewsCover path used contentFit="cover" at a fixed 200px
 * height, which clipped the chart's top/bottom). The ratio is read from the
 * loaded image and clamped so an extreme screenshot still renders a readable box;
 * a neutral backdrop fills any letterbox margin. Falls back to 16:9 until known.
 */
function AnalystChart({ uri, bg }: { uri: string; bg: string }) {
  const [ratio, setRatio] = useState(16 / 9);
  return (
    <View style={{ width: "100%", backgroundColor: bg }}>
      <Image
        source={{ uri }}
        style={{ width: "100%", aspectRatio: ratio }}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={220}
        onLoad={(e) => {
          const w = (e as any)?.source?.width;
          const h = (e as any)?.source?.height;
          if (w && h) setRatio(Math.min(2.2, Math.max(0.62, w / h)));
        }}
      />
    </View>
  );
}

export default function TechnicalArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useColors();
  const { language, isRTL, isDark } = useTheme();
  const { TECHNICAL_ARTICLES } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const item = useMemo(
    () => (TECHNICAL_ARTICLES as any[]).find((a) => String(a.id) === String(id)),
    [TECHNICAL_ARTICLES, id]
  );

  // ── Interactive chart (TradingView) — parity with the technical signals ──
  const [showLiveChart, setShowLiveChart] = useState(false);
  useEffect(() => {
    if (!showLiveChart) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); };
  }, [showLiveChart]);

  const primaryTicker = item ? String(item.ticker || "").split(",")[0].trim() : "";
  const chartMarket = item ? (item.market === "saudi" ? "saudi" : item.market === "usa" ? "usa" : "egypt") : "egypt";
  const tvSym = item ? tvSymbol(primaryTicker, chartMarket, item.chartSymbol) : "";
  const tvInt = item ? (tvInterval(item.chartTimeframe, item.chartInterval) || "D") : "D";

  const pick = (en?: string, ar?: string) => (isAr ? (ar || en) : (en || ar)) ?? "";
  const title = item ? pick(item.title, item.titleAr) : "";
  const subtitle = item ? pick(item.subtitle, item.subtitleAr) : "";

  const blocks = useMemo(() => {
    if (!item) return [] as { label: string; paras: string[] }[];
    return [
      { label: isAr ? "الجزء الفني" : "Technical Analysis", paras: htmlToParagraphs(pick(item.technicalBody, item.technicalBodyAr)) },
      { label: isAr ? "ملخص حركة السعر" : "Price Movement Summary", paras: htmlToParagraphs(pick(item.priceSummary, item.priceSummaryAr)) },
    ].filter((b) => b.paras.length > 0);
  }, [item, isAr]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{isAr ? "مقال فني" : "Technical Article"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {!item ? (
        <View style={styles.empty}>
          <Ionicons name="analytics-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "المقال غير متوفر" : "Article not found"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing[8] }}>
          {item.chartImage ? (
            // Real analyst chart from admin — show it fully, uncropped.
            <AnalystChart uri={item.chartImage} bg={C.bg.elevated} />
          ) : (
            // No chart uploaded — decorative editorial cover.
            <NewsCover image={null} ticker={item.ticker} category={"Market"} height={200} />
          )}
          <View style={styles.body}>
            {!!item.chartTimeframe && (
              <Text style={[styles.kicker, { color: C.accent.teal, fontFamily: ff("700") }, isRTL && styles.right]}>
                {String(item.chartTimeframe).toUpperCase()}
              </Text>
            )}
            <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: C.text.secondary, fontFamily: ff("400") }, isRTL && styles.right]}>
                {subtitle}
              </Text>
            )}
            <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
              {!!item.date && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>{formatDate(item.date)}</Text>}
              {!!item.analyst && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>· {item.analyst}</Text>}
            </View>

            {!!item.ticker && (
              <Pressable
                style={[styles.tickerPill, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}30` }]}
                onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: String(item.ticker) } })}
              >
                <Ionicons name="trending-up" size={13} color={C.primary} />
                <Text style={[styles.tickerText, { color: C.primary, fontFamily: ff("700") }]}>
                  {item.ticker}{item.company ? ` · ${item.company}` : ""}
                </Text>
              </Pressable>
            )}

            {tvSym ? (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowLiveChart(true); }}
                style={[styles.liveCtaCard, { backgroundColor: `${C.accent.teal}10`, borderColor: `${C.accent.teal}33` }, isRTL && { flexDirection: "row-reverse" }]}
              >
                <View style={[styles.liveCtaIcon, { backgroundColor: `${C.accent.teal}22` }]}>
                  <Ionicons name="pulse" size={20} color={C.accent.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.liveCtaTitle, { color: C.text.primary }, isRTL && { textAlign: "right" }]}>{isAr ? "افتح الرسم البياني المباشر" : "Open Live Interactive Chart"}</Text>
                  <Text style={[styles.liveCtaSub, { color: C.text.muted }, isRTL && { textAlign: "right" }]}>{isAr ? "رسم تفاعلي — مؤشرات وأدوات رسم" : "Real-time chart — indicators & drawing tools"}</Text>
                </View>
                <View style={[styles.liveCtaBtn, { backgroundColor: C.accent.teal }]}>
                  <Ionicons name="eye-outline" size={14} color="#fff" />
                  <Text style={styles.liveCtaBtnText}>{isAr ? "عرض" : "View"}</Text>
                </View>
              </Pressable>
            ) : null}

            {blocks.map((b, bi) => (
              <View key={bi} style={{ marginTop: Spacing[4] }}>
                <Text style={[styles.blockLabel, { color: (b as any).muted ? C.text.muted : C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
                  {b.label}
                </Text>
                {b.paras.map((p: string, i: number) => (
                  <Text
                    key={i}
                    style={[
                      (b as any).muted ? styles.disclaimerPara : styles.para,
                      { color: (b as any).muted ? C.text.muted : C.text.secondary, fontFamily: ff("400") },
                      isRTL && styles.right,
                    ]}
                  >
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Live interactive chart — fullscreen TradingView WebView (same pattern as the
          index-update + stock detail screens). */}
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
            <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
              <Pressable
                style={[styles.backBtn, { backgroundColor: C.bg.elevated }]}
                hitSlop={10}
                onPress={() => { Haptics.selectionAsync(); setShowLiveChart(false); }}
                accessibilityRole="button"
                accessibilityLabel={isAr ? "إغلاق الرسم البياني" : "Close chart"}
              >
                <Ionicons name="close" size={22} color={C.text.primary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: C.text.primary }]}>{item?.ticker}</Text>
              <View style={{ width: 36 }} />
            </View>
            {showLiveChart ? (
              <WebView
                source={{ html: tradingViewChartHtml(tvSym, tvInt, isDark ? "dark" : "light", isAr ? "ar" : "en", []), baseUrl: TV_BASE_URL }}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Typography.base, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing[2] },
  emptyText: { fontSize: Typography.sm },
  body: { padding: Spacing[4], gap: Spacing[2] },
  kicker: { fontSize: 11, letterSpacing: 1 },
  title: { fontSize: Typography.xl, fontWeight: "800", lineHeight: 30 },
  subtitle: { fontSize: Typography.sm, lineHeight: 22, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginTop: 2 },
  meta: { fontSize: Typography.xs },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  tickerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, marginTop: Spacing[1] },
  tickerText: { fontSize: Typography.xs, fontWeight: "700" },
  blockLabel: { fontSize: Typography.md, fontWeight: "800", marginBottom: Spacing[1] },
  para: { fontSize: Typography.sm, lineHeight: 23, marginTop: Spacing[2] },
  disclaimerPara: { fontSize: Typography.xs, lineHeight: 19, marginTop: Spacing[1] },
  liveCtaCard: { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3], marginTop: Spacing[4] },
  liveCtaIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  liveCtaTitle: { fontSize: Typography.sm, fontWeight: "800" },
  liveCtaSub: { fontSize: 11, marginTop: 2 },
  liveCtaBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
  liveCtaBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
});

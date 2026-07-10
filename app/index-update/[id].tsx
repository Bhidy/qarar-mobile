import { useMemo, useState, useEffect } from "react";
import { formatDate } from "@/lib/format-date";
import { liveIndexLevel, indexPerformancePct } from "@/lib/index-quote";
import { ScrollView, View, StyleSheet, Pressable, Image, Modal } from "react-native";
import { WebView } from "react-native-webview";
import { Text } from "@/components/shared/AppText";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { tradingViewChartHtml, TV_BASE_URL, webviewAllowRequest } from "@/lib/embeds";
import { tvSymbol, tvInterval } from "@/lib/tv-symbol";
import { indexCatalogEntry } from "@/constants/index-catalog";

/** Strip HTML → readable paragraphs (no WebView dependency for plain reading). */
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
    .replace(/&ldquo;|&rdquo;/gi, '"')
    // Dashes/ellipsis + numeric entities — a raw "&ndash;" was rendering as
    // literal text ("ndash; 1&") inside Arabic news bodies.
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&hellip;/gi, "\u2026")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

const CCY: Record<string, string> = { egypt: "EGP", saudi: "SAR", usa: "USD" };

export default function IndexUpdateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useColors();
  const { language, isRTL, isDark } = useTheme();
  const { INDEX_UPDATES, PRICES } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const item = useMemo(
    () => (INDEX_UPDATES as any[]).find((u) => String(u.id) === String(id)),
    [INDEX_UPDATES, id]
  );

  const entry = item ? indexCatalogEntry(item.indexSymbol) : undefined;

  // ── Interactive chart (TradingView) — mirrors the customer web index-update page ──
  const [showLiveChart, setShowLiveChart] = useState(false);
  useEffect(() => {
    if (!showLiveChart) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [showLiveChart]);

  const tvSym = item ? tvSymbol(item.indexSymbol, item.market, item.chartSymbol) : "";
  const tvInt = item ? (tvInterval(undefined, item.chartInterval) || "D") : "D";

  const pick = (en?: string, ar?: string) => (isAr ? (ar || en) : (en || ar)) ?? "";
  const title = item ? pick(item.title, item.titleAr) : "";
  const body = item ? pick(item.body, item.bodyAr) : "";
  const paras = useMemo(() => htmlToParagraphs(body), [body]);

  const overviewColor = item?.overview === "Bullish" ? "#1F8F3B" : item?.overview === "Bearish" ? "#E5484D" : "#7C7C7C";
  const overviewBg = item?.overview === "Bullish" ? "rgba(132,223,92,0.16)" : item?.overview === "Bearish" ? "rgba(229,72,77,0.12)" : "rgba(124,124,124,0.10)";
  const overviewLabel = item?.overview === "Bullish" ? (isAr ? "▲ صعودي" : "▲ Bullish") : item?.overview === "Bearish" ? (isAr ? "▼ هبوطي" : "▼ Bearish") : (isAr ? "→ محايد" : "→ Neutral");
  const ccy = CCY[item?.market ?? "egypt"] ?? "EGP";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{isAr ? "تحديث مؤشر" : "Index Update"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {!item ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "التحديث غير متوفر" : "Update not found"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing[8] }}>
          <View style={styles.body}>
            <View style={[styles.badgeRow, isRTL && styles.rowRTL]}>
              <View style={[styles.indexPill, { backgroundColor: C.bg.elevated }]}>
                <Text style={[styles.indexPillText, { color: C.text.primary, fontFamily: ff("700") }]}>
                  {entry?.flag} {item.indexSymbol}
                </Text>
              </View>
              {!!item.overview && (
                <View style={[styles.overviewPill, { backgroundColor: overviewBg }]}>
                  <Text style={[styles.overviewPillText, { color: overviewColor, fontFamily: ff("700") }]}>{overviewLabel}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
              {title}
            </Text>

            <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
              <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>
                {entry ? pick(entry.countryEn, entry.countryAr) : ""} · {entry ? pick(entry.fullNameEn, entry.fullNameAr) : ""}
              </Text>
            </View>
            <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
              {!!item.date && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>{formatDate(item.date)}</Text>}
              {!!item.analyst && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>· {item.analyst}</Text>}
              {typeof item.currentPrice === "number" && item.currentPrice > 0 && (
                <Text style={[styles.meta, { color: C.text.secondary, fontFamily: ff("700") }]}>
                  · {isAr ? "السعر عند بدء التوصية" : "Price at initiation"}: {ccy} {Number(item.currentPrice).toLocaleString()}
                </Text>
              )}
            </View>
            {/* LIVE level + performance since the note (parity with web, 2026-07-10).
                Auto-updates from the ingested index feed; hidden (never fabricated)
                for indices we don't ingest (EGX70/NDX). */}
            {(() => {
              const liveLevel = liveIndexLevel(PRICES as any, item.indexSymbol);
              const perf = indexPerformancePct(item.currentPrice, liveLevel);
              if (liveLevel == null) return null;
              return (
                <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.meta, { color: C.text.primary, fontFamily: ff("700") }]}>
                    {isAr ? "الآن" : "Now"}: {ccy} {liveLevel.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Text>
                  {perf != null && (
                    <Text style={[styles.meta, { color: perf >= 0 ? "#1F8F3B" : "#E5484D", fontFamily: ff("800") }]}>
                      {"  "}{perf > 0 ? "+" : ""}{perf.toFixed(2)}% {isAr ? "منذ التوصية" : "since note"}
                    </Text>
                  )}
                </View>
              );
            })()}

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

            {item.chartImage ? (
              <Image source={{ uri: item.chartImage }} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: Radius.lg, marginTop: Spacing[4], backgroundColor: C.bg.elevated }} resizeMode="cover" />
            ) : null}

            {paras.length > 0 && (
              <View style={{ marginTop: Spacing[5] }}>
                {paras.map((p, i) => (
                  <Text key={i} style={[styles.para, { color: C.text.secondary, fontFamily: ff("400") }, isRTL && styles.right]}>
                    {p}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Live interactive chart — fullscreen TradingView WebView, opened by the CTA.
          Same landscape-modal pattern as the stock detail screen (see app/stock/[ticker].tsx). */}
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
                hitSlop={10}
                onPress={() => { Haptics.selectionAsync(); setShowLiveChart(false); }}
                accessibilityRole="button"
                accessibilityLabel={isAr ? "إغلاق الرسم البياني" : "Close chart"}
              >
                <Ionicons name="close" size={22} color={C.text.primary} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: C.text.primary }]}>{entry?.flag} {item?.indexSymbol}</Text>
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
  badgeRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  indexPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  indexPillText: { fontSize: Typography.xs },
  overviewPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  overviewPillText: { fontSize: Typography.xs },
  title: { fontSize: Typography.xl, fontWeight: "800", lineHeight: 30, marginTop: Spacing[2] },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: Spacing[2], marginTop: 2 },
  meta: { fontSize: Typography.xs },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  liveCtaCard: { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3], marginTop: Spacing[4] },
  liveCtaIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  liveCtaTitle: { fontSize: Typography.sm, fontWeight: "800" },
  liveCtaSub: { fontSize: 11, marginTop: 2 },
  liveCtaBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
  liveCtaBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  para: { fontSize: Typography.sm, lineHeight: 23, marginTop: Spacing[2] },
});

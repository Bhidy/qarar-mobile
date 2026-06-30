import { useState, useEffect } from "react";
import { ScrollView, View, StyleSheet, Pressable, Image, Linking, Modal } from "react-native";
import { WebView } from "react-native-webview";
import Svg, { Path, Defs, LinearGradient as SvgLinear, Stop, Circle, Line as SvgLine } from "react-native-svg";
import { Text } from "@/components/shared/AppText";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { router, useLocalSearchParams } from "expo-router";
import { supabasePublic } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { useData } from "@/hooks/useData";
import { RichText, looksLikeHtml, htmlHasTable } from "@/lib/rich-text";
import { CallUpdates } from "@/components/shared/CallUpdates";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { ConvictionMark } from "@/components/shared/ConvictionMark";
import { WEB_BASE } from "@/constants/site";
import { tradingViewChartHtml, TV_BASE_URL, webviewAllowRequest } from "@/lib/embeds";
import { tvSymbol, tvInterval, parseTvStudies } from "@/lib/tv-symbol";

/** Rich body (HTML) or plain text + a "view full report" link for complex tables. */
function RichBody({ html, label, accent, C, isRTL, ff, ticker }: {
  html: string; label: string; accent: string; C: any; isRTL: boolean;
  ff: (w: "400" | "600" | "700" | "800") => string | undefined; ticker: string;
}) {
  if (!html) return null;
  const rich = looksLikeHtml(html);
  return (
    <View style={[bodyStyles.box, { backgroundColor: `${accent}08`, borderColor: `${accent}20` }]}>
      <Text style={[bodyStyles.label, { color: C.text.muted }]}>{label}</Text>
      {rich ? (
        <RichText html={html} colors={C} isRTL={isRTL} fontFamily={ff} />
      ) : (
        <Text style={[bodyStyles.text, { color: C.text.secondary }, isRTL && { textAlign: "right" }]}>{html}</Text>
      )}
      {htmlHasTable(html) && (
        <Pressable
          onPress={() => Linking.openURL(`${WEB_BASE}/stock/${encodeURIComponent(ticker)}`)}
          style={[bodyStyles.link, { borderColor: C.border.default }]}
        >
          <Text style={[bodyStyles.linkText, { color: C.text.secondary }]}>{isRTL ? "عرض التقرير الكامل" : "View full formatted report"}</Text>
          <Ionicons name="open-outline" size={14} color={C.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}
const bodyStyles = StyleSheet.create({
  box: { borderRadius: 14, padding: 12, borderWidth: 1, gap: 8, marginTop: 4 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  text: { fontSize: 13.5, lineHeight: 21 },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  linkText: { fontSize: 12.5, fontWeight: "600" },
});

export default function StockDetail() {
  const C = useColors();
  const { language, isRTL, isDark } = useTheme();
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(language === "ar", w);
  const isAr = language === "ar";
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { FUNDAMENTAL_CALLS, TECHNICAL_CALLS, SAUDI_FUNDAMENTAL, SAUDI_TECHNICAL, ARTICLES, PRICES, COMPANIES } = useData();

  // Market-aware lookup: a ticker may belong to the Egypt OR the Saudi (Tadawul)
  // cohort, so search both arrays. (Previously only the EGX arrays were read, so
  // every Saudi ticker fell through to "No Active Coverage" with a 0.00 price.)
  const fundCall: any = FUNDAMENTAL_CALLS.find(c => c.ticker === ticker)
    ?? (SAUDI_FUNDAMENTAL as any[]).find(c => c.ticker === ticker);
  const techCall: any = TECHNICAL_CALLS.find(c => c.ticker === ticker)
    ?? (SAUDI_TECHNICAL as any[]).find(c => c.ticker === ticker);

  const isFund = !!fundCall;

  // ── Interactive chart (TradingView) — mirrors the customer web signal page ──
  const [showLiveChart, setShowLiveChart] = useState(false);
  // The live chart is the ONE surface that rotates to landscape: a wide canvas is
  // the correct way to read a trading chart. Lock LANDSCAPE while open, restore the
  // app-wide PORTRAIT_UP on close/unmount. lockAsync is awaited-then-ignored so a
  // device that can't rotate (e.g. orientation-locked) simply stays portrait.
  useEffect(() => {
    if (!showLiveChart) return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [showLiveChart]);
  const techMarket = /^\d{3,4}$/.test(ticker ?? "") ? "saudi" : "egypt";
  const tvSym = techCall ? tvSymbol(ticker, techMarket, (techCall as any).chartSymbol) : "";
  const tvInt = techCall ? tvInterval(techCall.timeframe, (techCall as any).chartInterval) : "D";
  const tvStudies = techCall ? parseTvStudies((techCall as any).chartStudies) : [];
  // Real aspect ratio of the captured chart so it renders FULL (never cropped).
  const [chartAspect, setChartAspect] = useState(1.6);
  useEffect(() => {
    const uri = (techCall as any)?.chartImage;
    if (!uri) return;
    Image.getSize(uri, (w, h) => { if (w > 0 && h > 0) setChartAspect(w / h); }, () => {});
  }, [(techCall as any)?.chartImage]);
  // Signature ConvictionMark value = the call's REAL upside (fundamental) or
  // return (technical). Null when there's no call → the mark is not shown.
  const convictionValue: number | null = isFund
    ? (typeof fundCall?.remaining === "number" ? fundCall.remaining : null)
    : (typeof techCall?.return === "number" ? techCall.return : null);
  const markUp = isDark ? "#5FCF6A" : "#1E8C3C";
  const markDown = isDark ? "#E4615A" : "#C53030";
  const callPrice = isFund ? (fundCall.currentPrice ?? 0) : (techCall?.currentPrice ?? 0);
  const live = PRICES[(ticker ?? "").toUpperCase()];        // real Mubasher snapshot, if synced
  const profile = COMPANIES[(ticker ?? "").toUpperCase()];  // real company profile (RT=30), if synced
  const currentPrice = live?.lastPrice ?? callPrice;        // prefer live price
  const hasPrice = typeof currentPrice === "number" && currentPrice > 0;
  // Currency follows the market: Saudi/Tadawul tickers are 4-digit numerics → SAR.
  const ccy = (profile as any)?.currency ?? (/^\d{3,4}$/.test(ticker ?? "") ? "SAR" : "EGP");
  // Real daily closes from the Mubasher feed (price_bars 1d). We NEVER synthesize a
  // chart: with no real bars the sparkline + change row are hidden entirely (no fake data).
  const [realCloses, setRealCloses] = useState<number[]>([]);
  useEffect(() => {
    const t = (ticker ?? "").toUpperCase();
    if (!t || !supabasePublic) { setRealCloses([]); return; }
    let cancel = false;
    (supabasePublic.from("price_bars").select("closeP").eq("ticker", t).eq("interval", "1d").order("ts", { ascending: true }).limit(120) as any)
      .then(({ data }: any) => { if (!cancel) setRealCloses((data ?? []).map((r: any) => Number(r.closeP)).filter((n: number) => Number.isFinite(n))); }, () => {});
    return () => { cancel = true; };
  }, [ticker]);
  const hasHistory = realCloses.length > 3;
  const history = hasHistory ? realCloses : [];
  const maxH = hasHistory ? Math.max(...history) : 0;
  const minH = hasHistory ? Math.min(...history) : 0;

  const articles = ARTICLES.filter(a => a.ticker === ticker);
  const upColor = C.primary;
  const dnColor = C.accent.red;
  const liveChange = typeof live?.changePct === "number" ? live.changePct : null;
  // Change % is shown ONLY from real data (live snapshot, else derived from real
  // bars). Never synthesized — if neither exists, the change row is omitted.
  const histChange = hasHistory && history[0]
    ? +(((history[history.length - 1] - history[0]) / history[0]) * 100).toFixed(2)
    : null;
  const change = liveChange ?? histChange;
  const hasChange = change != null && Number.isFinite(change);
  const changeColor = (change ?? 0) >= 0 ? upColor : dnColor;
  const changeSuffix = liveChange != null ? (live?.delayed ? "today · 15m delayed" : "today") : "(30d)";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{ticker}</Text>
        <Pressable style={[styles.watchBtn, { borderColor: C.border.default }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Ionicons name="bookmark-outline" size={16} color={C.text.secondary} />
          <Text style={[styles.watchBtnText, { color: C.text.secondary }]}>{isAr ? "متابعة" : "Watch"}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Price hero */}
        <View style={[styles.priceHero, { backgroundColor: C.bg.surface, borderBottomColor: C.border.subtle }]}>
          {/* Logo + company name row */}
          <View style={[styles.heroLogoRow, isRTL && { flexDirection: "row-reverse" }]}>
            <TickerLogo ticker={ticker ?? ""} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroCompany, { color: C.text.primary }, isRTL && { textAlign: "right" }]}>
                {profile?.name
                  ?? (isAr ? (fundCall?.companyAr || fundCall?.company) : fundCall?.company)
                  ?? (isAr ? ((techCall as any)?.companyAr || techCall?.company) : techCall?.company)
                  ?? ticker}
              </Text>
              <Text style={[styles.heroSector, { color: C.text.muted }, isRTL && { textAlign: "right" }]}>
                {profile?.sector ?? fundCall?.sector ?? (isAr ? "مدرج في السوق" : "EGX Listed")}
              </Text>
            </View>
          </View>
          <View style={[styles.priceRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View>
              <Text style={[styles.companyName, { color: C.text.muted }, isRTL && { textAlign: "right" }]}>{hasPrice ? (isAr ? "السعر الحالي" : "Current Price") : (isAr ? "السعر" : "Price")}</Text>
              <Text style={[styles.priceMain, { color: C.text.primary, fontFamily: displayFontFor(isAr, "800") }, isRTL && { textAlign: "right" }]}>
                {hasPrice ? `${currentPrice.toFixed(2)}` : "—"}
              </Text>
              {hasChange ? (
                <View style={[styles.changeRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons
                    name={(change as number) >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={changeColor}
                  />
                  <Text style={[styles.changeText, { color: changeColor }]}>
                    {(change as number) > 0 ? "+" : ""}{(change as number).toFixed(2)}% {changeSuffix}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.signalStack}>
              {convictionValue !== null ? (
                <ConvictionMark
                  value={convictionValue}
                  size={76}
                  label={isFund ? (isAr ? "الصعود" : "UPSIDE") : (isAr ? "العائد" : "RETURN")}
                  colorUp={markUp}
                  colorDown={markDown}
                  track={C.border.subtle}
                  textColor={C.text.primary}
                />
              ) : null}
              {fundCall && <SignalBadge signal={fundCall.signal} size="md" />}
              {techCall && <SignalBadge signal={techCall.signal} size="md" />}
            </View>
          </View>

          {/* Mini price-history chart — shown only for fundamental/uncovered tickers.
              Technical calls promote the analyst's captured chart below instead. */}
          {!techCall && (hasHistory ? (
            <View style={[styles.sparkContainer, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
              {(() => {
                const W = 320, H = 80, PAD_T = 6, PAD_B = 6;
                const n = history.length;
                const range = (maxH - minH) || 1;
                const xs = history.map((_, i) => (i / Math.max(1, n - 1)) * W);
                const ys = history.map(v => PAD_T + (1 - (v - minH) / range) * (H - PAD_T - PAD_B));
                // Smooth catmull-rom-ish curve via cubic Bezier from midpoints — same
                // shape language as the editorial covers, so the app feels coherent.
                let line = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
                for (let i = 1; i < n; i++) {
                  const cx = (xs[i - 1] + xs[i]) / 2;
                  line += ` C ${cx.toFixed(1)} ${ys[i - 1].toFixed(1)}, ${cx.toFixed(1)} ${ys[i].toFixed(1)}, ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`;
                }
                const area = `${line} L ${W.toFixed(1)} ${H.toFixed(1)} L 0 ${H.toFixed(1)} Z`;
                const lastX = xs[n - 1], lastY = ys[n - 1];
                return (
                  <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                    <Defs>
                      <SvgLinear id="sparkArea" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%"   stopColor={changeColor} stopOpacity={0.32} />
                        <Stop offset="100%" stopColor={changeColor} stopOpacity={0}    />
                      </SvgLinear>
                    </Defs>
                    {/* Zero-baseline (the very first close) — soft reference line */}
                    {(() => {
                      const baselineY = PAD_T + (1 - (history[0] - minH) / range) * (H - PAD_T - PAD_B);
                      return <SvgLine x1={0} y1={baselineY} x2={W} y2={baselineY} stroke={C.text.muted} strokeOpacity={0.18} strokeDasharray="2 4" />;
                    })()}
                    <Path d={area} fill="url(#sparkArea)" />
                    <Path d={line} stroke={changeColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx={lastX} cy={lastY} r={5.5} fill={changeColor} fillOpacity={0.18} />
                    <Circle cx={lastX} cy={lastY} r={3}   fill={changeColor} />
                  </Svg>
                );
              })()}
              <View style={[styles.sparkLabels, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.sparkLabel, { color: C.text.muted }]}>
                  {isAr ? `قبل ${history.length} جلسة` : `${history.length} sessions ago`}
                </Text>
                <Text style={[styles.sparkLabel, { color: C.text.muted }]}>{isAr ? "اليوم" : "Today"}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.sparkContainer, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle, alignItems: "center", paddingVertical: Spacing[4] }]}>
              <Ionicons name="analytics-outline" size={18} color={C.text.muted} />
              <Text style={[styles.sparkLabel, { color: C.text.muted, marginTop: 4 }]}>
                {isAr ? "لا يوجد رسم بياني تاريخي بعد" : "No historical chart yet"}
              </Text>
            </View>
          ))}
        </View>

        {/* Analyst's captured chart (promoted) + Live Chart CTA — technical calls only */}
        {techCall ? (
          <View style={[styles.section, { borderBottomColor: C.border.subtle }]}>
            <View style={[styles.sectionBody, { gap: Spacing[3] }]}>
              {(techCall as any).chartImage ? (
                <View style={[styles.analystChartCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <View style={[styles.analystChartHeader, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="stats-chart-outline" size={14} color={C.accent.teal} />
                    <Text style={[styles.analystChartTitle, { color: C.text.primary }]}>{isAr ? "الرسم البياني" : "Chart"}</Text>
                    {(techCall as any).chartCaption ? (
                      <Text style={[styles.analystChartCaption, { color: C.text.muted }]} numberOfLines={1}>· {(techCall as any).chartCaption}</Text>
                    ) : null}
                  </View>
                  {/* contain (never cover): the captured chart renders FULL — never cropped —
                      even before Image.getSize resolves the true aspect ratio. */}
                  <Image source={{ uri: (techCall as any).chartImage }} style={{ width: "100%", aspectRatio: chartAspect, backgroundColor: C.bg.base }} resizeMode="contain" />
                </View>
              ) : null}

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
            </View>
          </View>
        ) : null}

        {/* Fundamental call section */}
        {fundCall ? (
          <View style={[styles.section, { borderBottomColor: C.border.subtle }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={[styles.sectionIcon, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name="bar-chart" size={14} color={C.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: C.text.primary }]}>{isAr ? "التوصية الأساسية" : "Fundamental Call"}</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={[styles.targetRow, isRTL && { flexDirection: "row-reverse" }]}>
                <TargetBox label={isAr ? "الحالي" : "Current"} value={`${ccy} ${fundCall.currentPrice.toFixed(2)}`} color={C.text.primary} bg={C.bg.elevated} C={C} />
                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={16} color={C.primary} />
                <TargetBox label={isAr ? "الهدف" : "Target"} value={`${ccy} ${fundCall.targetPrice.toFixed(2)}`} color={C.primary} bg={`${C.primary}15`} C={C} highlight />
              </View>
              <View style={styles.metricsGrid}>
                <MetricItem label={isAr ? "الصعود المتبقي" : "Remaining Upside"} value={`+${fundCall.remaining.toFixed(1)}%`} color={upColor} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "أداؤنا" : "Our Performance"} value={`${fundCall.performance > 0 ? "+" : ""}${fundCall.performance.toFixed(1)}%`} color={fundCall.performance >= 0 ? upColor : dnColor} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "المحلل" : "Analyst"} value={fundCall.analyst} color={C.text.secondary} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "تاريخ الإصدار" : "Initiated"} value={fundCall.initiatedDate} color={C.text.secondary} C={C} isRTL={isRTL} />
              </View>
              <RichBody
                html={(isAr && (fundCall as any).thesisAr) ? (fundCall as any).thesisAr : (fundCall.thesis ?? "")}
                label={isAr ? "الأطروحة" : "THESIS"} accent={C.primary} C={C} isRTL={isRTL} ff={ff} ticker={ticker ?? ""}
              />
              {(fundCall as any).updates ? (
                <View style={{ marginTop: Spacing[3] }}>
                  <CallUpdates updates={(fundCall as any).updates} isAr={isAr} isRTL={isRTL} C={C} fontFamily={ff} defaultOpen />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Technical call section */}
        {techCall ? (
          <View style={[styles.section, { borderBottomColor: C.border.subtle }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={[styles.sectionIcon, { backgroundColor: `${C.accent.teal}15` }]}>
                <Ionicons name="trending-up" size={14} color={C.accent.teal} />
              </View>
              <Text style={[styles.sectionTitle, { color: C.text.primary }]}>
                {isAr ? "التوصية الفنية" : "Technical Call"}
              </Text>
            </View>
            <View style={styles.sectionBody}>
              {/* Trend badge */}
              {(techCall as any).trend ? (
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", marginBottom: Spacing[2] }}>
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
                    backgroundColor: (techCall as any).trend === "uptrend" ? "rgba(132,223,92,0.14)" : (techCall as any).trend === "downtrend" ? "rgba(229,72,77,0.10)" : "rgba(124,124,124,0.10)",
                    borderColor: (techCall as any).trend === "uptrend" ? "rgba(132,223,92,0.3)" : (techCall as any).trend === "downtrend" ? "rgba(229,72,77,0.2)" : "rgba(124,124,124,0.2)",
                  }}>
                    <Text style={{
                      fontSize: 11, fontFamily: ff("700"),
                      color: (techCall as any).trend === "uptrend" ? "#1F8F3B" : (techCall as any).trend === "downtrend" ? "#E5484D" : "#7C7C7C",
                    }}>
                      {(techCall as any).trend === "uptrend" ? "↑" : (techCall as any).trend === "downtrend" ? "↓" : "→"}{" "}
                      {isAr
                        ? ((techCall as any).trend === "uptrend" ? "صاعد" : (techCall as any).trend === "downtrend" ? "هابط" : "جانبي")
                        : ((techCall as any).trend as string).charAt(0).toUpperCase() + ((techCall as any).trend as string).slice(1)}
                    </Text>
                  </View>
                </View>
              ) : null}
              <View style={styles.techLevels}>
                <TechLevel label={isAr ? "نطاق الشراء" : "Buy Range"} value={`${ccy} ${techCall.entryMin}–${techCall.entryMax}`} color={C.text.primary} C={C} isRTL={isRTL} />
                <TechLevel label={isAr ? "الهدف TP1" : "Target TP1"} value={`${ccy} ${techCall.targetPrice.toFixed(2)}`} color={upColor} C={C} isRTL={isRTL} />
                {(techCall as any).tp2 ? (
                  <TechLevel label={isAr ? "الهدف TP2" : "Target TP2"} value={`${ccy} ${((techCall as any).tp2 as number).toFixed(2)}`} color={upColor} C={C} isRTL={isRTL} />
                ) : null}
                {(techCall as any).tp3 ? (
                  <TechLevel label={isAr ? "الهدف TP3" : "Target TP3"} value={`${ccy} ${((techCall as any).tp3 as number).toFixed(2)}`} color={upColor} C={C} isRTL={isRTL} />
                ) : null}
                <TechLevel label={isAr ? "وقف الخسارة الجريء" : "Risky Stop Loss"} value={`${ccy} ${techCall.stopLoss.toFixed(2)}`} color={dnColor} C={C} isRTL={isRTL} />
                {(techCall as any).conservativeSL ? (
                  <TechLevel label={isAr ? "وقف محافظ" : "Conservative SL"} value={`${ccy} ${((techCall as any).conservativeSL as number).toFixed(2)}`} color={dnColor} C={C} isRTL={isRTL} />
                ) : null}
                {(techCall as any).aggressiveSL ? (
                  <TechLevel label={isAr ? "وقف هجومي" : "Aggressive SL"} value={`${ccy} ${((techCall as any).aggressiveSL as number).toFixed(2)}`} color={dnColor} C={C} isRTL={isRTL} />
                ) : null}
                {/* Trailing Stop Loss — live pre-calculated */}
                {(() => {
                  const trailingPct = techCall.entryMin > 0 && techCall.stopLoss > 0 && techCall.entryMin > techCall.stopLoss
                    ? ((techCall.entryMin - techCall.stopLoss) / techCall.entryMin) * 100 : 0;
                  const trailPrice = currentPrice > 0 && trailingPct > 0
                    ? +(currentPrice * (1 - trailingPct / 100)).toFixed(2) : null;
                  return trailPrice !== null ? (
                    <TechLevel
                      label={isAr ? "وقف متحرك (مباشر)" : "Trailing SL (live)"}
                      value={`↻ ${ccy} ${trailPrice.toFixed(2)}`}
                      color={dnColor} C={C} isRTL={isRTL}
                    />
                  ) : null;
                })()}
              </View>
              <View style={styles.metricsGrid}>
                <MetricItem label={isAr ? "النمط" : "Pattern"} value={techCall.pattern} color={C.accent.teal} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "الإطار الزمني" : "Timeframe"} value={techCall.timeframe} color={C.text.secondary} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "المحلل" : "Analyst"} value={techCall.analyst} color={C.text.secondary} C={C} isRTL={isRTL} />
                <MetricItem label={isAr ? "التاريخ" : "Date"} value={techCall.date} color={C.text.secondary} C={C} isRTL={isRTL} />
                {(techCall as any).movingAverages ? (
                  <MetricItem label={isAr ? "المتوسطات" : "Moving Avg"} value={(techCall as any).movingAverages} color={C.text.secondary} C={C} isRTL={isRTL} />
                ) : null}
                {(techCall as any).riskReward ? (
                  <MetricItem label="R:R" value={`1:${(techCall as any).riskReward}`} color={C.text.primary} C={C} isRTL={isRTL} />
                ) : null}
              </View>
              <RichBody
                html={(isAr && (techCall as any).notesAr) ? (techCall as any).notesAr : (techCall.notes ?? "")}
                label={isAr ? "ملاحظات" : "NOTES"} accent={C.accent.teal} C={C} isRTL={isRTL} ff={ff} ticker={ticker ?? ""}
              />
              {(techCall as any).updates ? (
                <View style={{ marginTop: Spacing[3] }}>
                  <CallUpdates updates={(techCall as any).updates} isAr={isAr} isRTL={isRTL} C={C} fontFamily={ff} defaultOpen />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Related research — language-aware: shows Arabic title/byline in AR mode */}
        {articles.length > 0 ? (
          <View style={[styles.section, styles.sectionPad, { borderBottomColor: C.border.subtle }]}>
            <Text style={[styles.sectionTitle, { color: C.text.primary, marginBottom: Spacing[3] }, isRTL && { textAlign: "right" }]}>
              {isAr ? "أبحاث ذات صلة" : "Related Research"}
            </Text>
            {articles.map(a => {
              const aTitle = (isAr && (a as any).titleAr) ? (a as any).titleAr : a.title;
              const arAuthors = (a as any).authorAr;
              const authorStr = (isAr && Array.isArray(arAuthors) && arAuthors.filter(Boolean).length > 0)
                ? arAuthors.filter(Boolean).join("، ")
                : (Array.isArray(a.author) && a.author.filter(Boolean).length > 0
                    ? (isAr ? a.author.filter(Boolean).join("، ") : a.author.join(", "))
                    : (isAr ? "أبحاث Smart Signals" : "Smart Signals Research"));
              return (
                <Pressable
                  key={a.id}
                  style={[styles.articleRow, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}
                  onPress={() => router.push({ pathname: "/article/[id]", params: { id: a.id } })}
                >
                  <View style={[styles.articleIconBox, { backgroundColor: `${C.primary}15` }]}>
                    <Ionicons name={a.type === "video" ? "play" : "document-text"} size={16} color={C.primary} />
                  </View>
                  <View style={styles.articleInfo}>
                    <Text style={[styles.articleTitle, { color: C.text.primary, fontFamily: ff("600") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]} numberOfLines={2}>{aTitle}</Text>
                    <Text style={[styles.articleMeta, { color: C.text.muted, fontFamily: ff("400") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{authorStr} · {a.date}</Text>
                  </View>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={C.text.muted} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* No call fallback */}
        {!fundCall && !techCall && (
          <View style={[styles.sectionPad, styles.noCoverageBox]}>
            <Ionicons name="search-outline" size={40} color={C.text.muted} />
            <Text style={[styles.noCoverageTitle, { color: C.text.primary }]}>
              {isAr ? "لا توجد تغطية فعّالة" : "No Active Coverage"}
            </Text>
            <Text style={[styles.noCoverageSub, { color: C.text.muted }]}>
              {isAr ? `ليس لدينا توصية فعّالة على ${ticker} في الوقت الحالي.` : `We don't have an active call on ${ticker} at this time.`}
            </Text>
          </View>
        )}

        <View style={{ height: Spacing[8] }} />
      </ScrollView>

      {/* Live interactive chart — fullscreen TradingView WebView, opened by the CTA.
          Opens in LANDSCAPE (wide) for proper chart reading. A React Native <Modal>
          renders in its OWN native window outside the root SafeAreaProvider, so it
          needs its own provider for safe-area insets to resolve — without it the top
          inset is 0 and the close button collides with the status bar / notch. We
          inset all four edges so the ✕ also clears the Dynamic Island in landscape,
          and hide the status bar for a clean full-width canvas. */}
      <Modal
        visible={showLiveChart}
        animationType="slide"
        onRequestClose={() => setShowLiveChart(false)}
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape-left", "landscape-right"]}
      >
        <SafeAreaProvider>
          {/* Guarded: a RN <Modal> keeps its children mounted even while hidden, so an
              unguarded StatusBar would hide the bar app-wide. Only hide it while open. */}
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
              <Text style={[styles.headerTitle, { color: C.text.primary }]}>{tvSym || ticker}</Text>
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

function TargetBox({ label, value, color, bg, C, highlight }: any) {
  return (
    <View style={[styles.targetBox, { backgroundColor: bg, borderColor: highlight ? `${C.primary}25` : "transparent", borderWidth: 1 }]}>
      <Text style={[styles.targetLabel, { color: C.text.muted }]}>{label}</Text>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
    </View>
  );
}

function MetricItem({ label, value, color, C, isRTL }: any) {
  return (
    <View style={[styles.metricItem, { backgroundColor: C.bg.elevated }]}>
      <Text style={[styles.metricLabel, { color: C.text.muted }, isRTL && { textAlign: "right" }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }, isRTL && { textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

function TechLevel({ label, value, color, C, isRTL }: any) {
  return (
    <View style={[styles.techLevelItem, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
      <Text style={[styles.techLevelLabel, { color: C.text.muted }]}>{label}</Text>
      <Text style={[styles.techLevelValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: Typography.lg, fontWeight: "800", textAlign: "center", letterSpacing: 0.8 },
  watchBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  watchBtnText: { fontSize: 11, fontWeight: "600" },

  priceHero: { padding: Spacing[4], gap: Spacing[3], borderBottomWidth: 1 },
  heroLogoRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3], marginBottom: Spacing[1] },
  heroCompany: { fontSize: Typography.base, fontWeight: "800" },
  heroSector: { fontSize: Typography.xs, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  companyName: { fontSize: Typography.xs, fontWeight: "600", marginBottom: 2 },
  priceMain: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  changeText: { fontSize: Typography.sm, fontWeight: "700" },
  signalStack: { gap: Spacing[2], alignItems: "flex-end" },

  sparkContainer: { borderRadius: Radius.lg, overflow: "hidden", padding: Spacing[3], borderWidth: 1 },
  sparkLine: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 44, marginBottom: 4 },
  sparkBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  sparkLabels: { flexDirection: "row", justifyContent: "space-between" },
  sparkLabel: { fontSize: 9 },

  section: { borderBottomWidth: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing[2], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  sectionIcon: { width: 28, height: 28, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: Typography.base, fontWeight: "800" },
  sectionBody: { padding: Spacing[4], gap: Spacing[3] },
  sectionPad: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[4] },

  targetRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  targetBox: { flex: 1, borderRadius: Radius.lg, padding: Spacing[3], gap: 3 },
  targetLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  targetValue: { fontSize: Typography.md, fontWeight: "800" },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing[2] },
  metricItem: { flex: 1, minWidth: "45%", borderRadius: Radius.lg, padding: Spacing[3], gap: 2 },
  metricLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  metricValue: { fontSize: Typography.sm, fontWeight: "700" },

  thesisBox: { borderRadius: Radius.lg, padding: Spacing[3], borderWidth: 1, gap: 4 },
  thesisLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  thesisText: { fontSize: 12, lineHeight: 18 },

  techLevels: { gap: 0 },
  techLevelItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing[3], borderBottomWidth: 1 },
  techLevelLabel: { fontSize: Typography.sm, fontWeight: "600" },
  techLevelValue: { fontSize: Typography.sm, fontWeight: "800" },

  articleRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing[2] },
  articleIconBox: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  articleInfo: { flex: 1, gap: 2 },
  articleTitle: { fontSize: Typography.sm, fontWeight: "600", lineHeight: 18 },
  articleMeta: { fontSize: 10 },

  noCoverageBox: { alignItems: "center", paddingVertical: Spacing[10], gap: Spacing[3] },
  noCoverageTitle: { fontSize: Typography.lg, fontWeight: "800" },
  noCoverageSub: { fontSize: Typography.sm, textAlign: "center", lineHeight: 20 },

  // Promoted analyst chart + live-chart CTA (mirrors customer web signal page)
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
});

import { View, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/shared/AppText";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, deltaColor } from "@/constants/theme";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { fontFamilyFor } from "@/lib/typography";
import { computeCallComparison, fmtPct, type CallComparisonRow } from "@/lib/performance";

/**
 * Per-Call Performance vs Benchmark — MOBILE (parity with web).
 *
 * Every signal is compared against the index over ITS OWN holding period
 * (Stock Return vs matched Benchmark Return); the headline numbers are the
 * equal-weighted AVERAGES across calls — never a single "oldest → now" spread.
 * The averages are always visible; the per-call breakdown is COLLAPSED by default
 * and revealed on demand. Open calls use their live (unrealized) return.
 */
export function PerformanceComparison({
  data, benchmarkLabel,
}: { data: any[]; benchmarkLabel: string }) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const [expanded, setExpanded] = useState(false);
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  // publishableOnly gates unverified CLOSED calls; open calls stay in (shown live).
  const cmp = computeCallComparison(data as any[], { publishableOnly: true, sort: "initiatedAsc" });

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    setExpanded(v => !v);
  };

  const averages = [
    { label: t("Recommendations", "التوصيات"), value: String(cmp.count), hi: false, plain: true },
    { label: t("Avg Stock Return", "متوسط عائد السهم"), value: fmtPct(cmp.avgStockReturn, 1, true), hi: true },
    { label: `${t("Avg Benchmark", "متوسط المؤشر")} · ${benchmarkLabel}`, value: fmtPct(cmp.avgBenchmarkReturn, 1, true), hi: false },
    { label: t("Avg Alpha", "متوسط ألفا"), value: fmtPct(cmp.avgAlpha, 1, true), hi: true },
  ];

  return (
    <View style={[styles.card, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.titleWrap, isRTL && styles.rowRTL]}>
          <Ionicons name="stats-chart-outline" size={14} color={C.primary} />
          <Text style={[styles.title, { color: C.text.secondary, fontFamily: ff("700") }]} numberOfLines={1}>
            {t("Per-Call vs Benchmark", "الأداء لكل توصية مقابل المؤشر")}
          </Text>
          {cmp.count > 0 && (
            <View style={[styles.countPill, { backgroundColor: C.primarySoft, borderColor: `${C.primary}30` }]}>
              <Text style={[styles.countPillText, { color: C.text.secondary, fontFamily: ff("700") }]}>
                {cmp.count}
              </Text>
            </View>
          )}
        </View>
      </View>

      {cmp.count === 0 ? (
        <Text style={[styles.empty, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.textRight]}>
          {t("No calls with a comparable benchmark yet.", "لا توجد توصيات لها مؤشر مقارن بعد.")}
        </Text>
      ) : (
        <>
          {/* Averages — always visible */}
          <View style={styles.statsGrid}>
            {averages.map(s => (
              <View key={s.label} style={[styles.statItem, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, s.hi && { borderColor: `${C.primary}40` }]}>
                <Text style={[styles.statLabel, { color: C.text.muted, fontFamily: ff("600") }, isRTL && styles.textRight]} numberOfLines={2}>{s.label}</Text>
                <Text style={[styles.statValue, { color: s.plain ? C.text.primary : deltaColor(parseFloat(s.value) || 0), fontFamily: ff("800") }, isRTL && styles.textRight]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Expand / collapse the per-call breakdown (collapsed by default) */}
          <Pressable onPress={toggle} style={[styles.toggle, { borderColor: C.border.subtle }, isRTL && styles.rowRTL]} accessibilityRole="button" accessibilityState={{ expanded }}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={C.text.secondary} />
            <Text style={[styles.toggleText, { color: C.text.secondary, fontFamily: ff("600") }]}>
              {expanded ? t("Hide breakdown", "إخفاء التفاصيل") : t("Show breakdown", "عرض التفاصيل")}
            </Text>
          </Pressable>

          {expanded && (
            <View style={styles.breakdown}>
              {cmp.rows.map((r, i) => (
                <CallRow key={`${r.id ?? r.ticker}-${i}`} row={r} C={C} isAr={isAr} isRTL={isRTL} ff={ff}
                  maxAbsAlpha={Math.max(1, ...cmp.rows.map(x => Math.abs(x.alpha)))} />
              ))}
              <Text style={[styles.footnote, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.textRight]}>
                {t(
                  // One methodology, stated identically on web, admin and mobile.
                  // The compounding sentence matters: it is the difference between
                  // a benchmark of 73% and one of 33% on a call that spans an
                  // update, and a reader who works it out period by period is
                  // entitled to know which of the two they are looking at.
                  "Each signal is measured against the index over its own holding period, with both the stock and the index priced on the same two trading sessions. Where a call spans an update, the periods compound — they are not averaged. Averages are equal-weighted per call.",
                  "كل توصية تُقاس مقابل المؤشر خلال فترة احتفاظها، مع تسعير السهم والمؤشر على نفس جلستي التداول. وعندما تمتد التوصية عبر تحديث، تتراكم الفترات ولا يُؤخذ متوسطها. المتوسطات مرجّحة بالتساوي لكل توصية.",
                )}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function CallRow({
  row, C, isAr, isRTL, ff, maxAbsAlpha,
}: {
  row: CallComparisonRow; C: any; isAr: boolean; isRTL: boolean;
  ff: (w: "400" | "500" | "600" | "700" | "800") => string; maxAbsAlpha: number;
}) {
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const barPct = Math.min(100, (Math.abs(row.alpha) / maxAbsAlpha) * 100);
  const pos = row.alpha >= 0;
  return (
    <View style={[styles.row, { borderTopColor: C.border.subtle }, isRTL && styles.rowRTL]}>
      <TickerLogo ticker={row.ticker} size={30} />
      <View style={styles.rowMain}>
        <View style={[styles.rowTop, isRTL && styles.rowRTL]}>
          <Text style={[styles.rowTicker, { color: C.text.primary, fontFamily: ff("700") }]}>{row.ticker}</Text>
          {row.signal ? <SignalBadge signal={row.signal} size="sm" /> : null}
          <View style={[styles.statusPill, row.realized
            ? { backgroundColor: C.bg.surface, borderColor: C.border.strong }
            : { backgroundColor: C.primarySoft, borderColor: `${C.primary}40` }]}>
            <Text style={[styles.statusText, { color: row.realized ? C.text.muted : C.primary, fontFamily: ff("700") }]}>
              {row.realized ? t("CLOSED", "مغلقة") : t("OPEN", "نشطة")}
            </Text>
          </View>
        </View>
        {/* Alpha bar */}
        <View style={[styles.barTrack, { backgroundColor: C.bg.surface }]}>
          <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: deltaColor(row.alpha), alignSelf: isRTL ? "flex-end" : "flex-start" }]} />
        </View>
      </View>
      <View style={[styles.rowNums, isRTL && { alignItems: "flex-start" }]}>
        <Text style={[styles.rowAlpha, { color: deltaColor(row.alpha), fontFamily: ff("800") }]}>{fmtPct(row.alpha, 1, true)}</Text>
        <Text style={[styles.rowSub, { color: C.text.muted, fontFamily: ff("500") }]} numberOfLines={1}>
          {fmtPct(row.stockReturn, 1, true)} {pos ? "▸" : "▸"} {fmtPct(row.benchmarkReturn, 1, true)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: Spacing[4], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing[3] },
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: Spacing[2], flexShrink: 1 },
  title: { fontSize: Typography.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  countPill: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999, borderWidth: 1 },
  countPillText: { fontSize: 10 },
  empty: { fontSize: Typography.sm, paddingVertical: Spacing[6], textAlign: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing[2] },
  statItem: { flexBasis: "47%", flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3] },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  statValue: { fontSize: Typography.lg },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[2], marginTop: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.lg, borderWidth: 1 },
  toggleText: { fontSize: Typography.xs },
  breakdown: { marginTop: Spacing[3] },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingVertical: Spacing[3], borderTopWidth: 1 },
  rowMain: { flex: 1, gap: 6 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing[2], flexWrap: "wrap" },
  rowTicker: { fontSize: Typography.sm },
  statusPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 9, letterSpacing: 0.4 },
  barTrack: { height: 5, borderRadius: 999, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 999 },
  rowNums: { alignItems: "flex-end", gap: 2, minWidth: 92 },
  rowAlpha: { fontSize: Typography.sm },
  rowSub: { fontSize: 10 },
  footnote: { fontSize: 10, lineHeight: 15, marginTop: Spacing[3] },
});

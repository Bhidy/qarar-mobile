import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/shared/AppText";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { useData } from "@/hooks/useData";
import { computeOverallPerformance } from "@/lib/performance";

/**
 * OnboardingHero — three bespoke "product moment" cards for the light onboarding.
 *
 * Built with React-Native layout (NOT one big SVG) so every label shapes and
 * mirrors correctly in Arabic/RTL via flexbox — only the chart curve is SVG
 * (language-agnostic). Each card is a real, premium white surface; the floating
 * shadow + entrance/parallax motion live on the wrapper in onboarding.tsx.
 *
 *   0 — REAL track record card (fund + tech avg realized return, live)  → "your edge"
 *   1 — a live BUY signal card (ticker, target, conviction)              → "real signals"
 *   2 — a live analyst alert (app mark + notification)                   → "never miss a move"
 *
 * Slide 0 reads from useData() (DataProvider wraps the WHOLE app at root, so it
 * is available pre-auth) and shows the SAME computation the customer will see
 * on the Fundamental/Technical tabs: `computeOverallPerformance`. No mock
 * numbers — falls back to the static demo dataset only when Supabase isn't
 * configured, exactly like the rest of the app.
 */

export type HeroInk = {
  primary: string;
  secondary: string;
  muted: string;
  hairline: string;
  soft: string;
  track: string;
  accent: string;
};

interface Props {
  index: number;
  isAr: boolean;
  ink: HeroInk;
  width: number;
}

export function OnboardingHero({ index, isAr, ink, width }: Props) {
  if (index === 0) return <PerfCard isAr={isAr} ink={ink} width={width} />;
  if (index === 1) return <SignalCard isAr={isAr} ink={ink} width={width} />;
  return <AlertCard isAr={isAr} ink={ink} width={width} />;
}

// ── Sparkline (area + line + glowing endpoint) ──────────────────────────────
function Sparkline({
  w, h, accent, uid,
}: { w: number; h: number; accent: string; uid: string }) {
  // Normalised rising series (y: 0 = top). A clean, confident climb.
  const pts: [number, number][] = [
    [0, 0.74], [0.17, 0.62], [0.33, 0.67], [0.5, 0.43],
    [0.67, 0.5], [0.83, 0.26], [1, 0.16],
  ];
  const X = (n: number) => 3 + n * (w - 6);
  const Y = (n: number) => 6 + n * (h - 12);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(" ");
  const area = `${line} L${X(1).toFixed(1)} ${h} L${X(0).toFixed(1)} ${h} Z`;
  const ex = X(1), ey = Y(0.16);
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="0.20" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#area-${uid})`} />
      <Path d={line} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={ex} cy={ey} r={7} fill={accent} opacity={0.16} />
      <Circle cx={ex} cy={ey} r={3.6} fill={accent} />
      <Circle cx={ex} cy={ey} r={1.5} fill="#FFFFFF" />
    </Svg>
  );
}

// ── Slide 0 — Track Record (REAL fundamental + technical performance) ──────
// Mirrors the SAME computation the customer sees on tabs/fundamental.tsx and
// tabs/technical.tsx ("Overall Performance" banner). No mock numbers — the
// `+X.X%` comes from computeOverallPerformance() over the real call sets,
// with graceful empty-state when there are no closed calls yet.
function PerfCard({ isAr, ink, width }: { isAr: boolean; ink: HeroInk; width: number }) {
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const row = isAr ? "row-reverse" : "row";
  const chartW = width - 44;

  // Onboarding is shown before the user picks a market → default to Egypt
  // (the app's default market). The numbers will refresh as the dataset loads.
  const { FUNDAMENTAL_CALLS, TECHNICAL_CALLS } = useData();
  const perfFund = computeOverallPerformance(FUNDAMENTAL_CALLS as any[], { publishableOnly: true });
  const perfTech = computeOverallPerformance(TECHNICAL_CALLS as any[], { publishableOnly: true });

  // Headline = combined avg of the two desks (only the non-null sides count).
  const parts = [perfFund.avgRealizedReturn, perfTech.avgRealizedReturn].filter(
    (n): n is number => typeof n === "number",
  );
  const combined = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
  const combinedColor = combined === null ? ink.muted : combined >= 0 ? ink.accent : "#D14343";
  const combinedSign = combined === null ? "" : combined >= 0 ? "+" : "";
  const combinedText = combined === null ? "—" : `${combinedSign}${combined.toFixed(1)}%`;

  return (
    <View style={[styles.card, { borderColor: ink.hairline }]}>
      {/* Header row */}
      <View style={[styles.between, { flexDirection: row }]}>
        <View style={[styles.kv, { flexDirection: row }]}>
          <View style={[styles.iconChip, { backgroundColor: ink.soft }]}>
            <Ionicons name="trophy-outline" size={14} color={ink.accent} />
          </View>
          <Text style={{ color: ink.muted, fontFamily: ff("700"), fontSize: 11, letterSpacing: 0.4 }}>
            {isAr ? "السجل الحقيقي" : "TRACK RECORD"}
          </Text>
        </View>
        <View style={[styles.pillSolid, { backgroundColor: combinedColor, flexDirection: row }]}>
          {combined !== null ? (
            <Ionicons name={combined >= 0 ? "caret-up" : "caret-down"} size={11} color="#FFFFFF" />
          ) : null}
          <Text style={{ color: "#FFFFFF", fontFamily: ff("800"), fontSize: 13 }}>{combinedText}</Text>
        </View>
      </View>

      {/* Sparkline — decorative trend visual (real per-call sparkline needs
          time-series data not available pre-login). Stays as a brand cue. */}
      <View style={styles.chartWrap}>
        <Sparkline w={chartW} h={62} accent={ink.accent} uid="perf" />
      </View>

      {/* Two REAL rows — one per desk, identical computation to the tab banners. */}
      <PerfRow
        labelEn="Fundamental"
        labelAr="الأساسي"
        value={perfFund.avgRealizedReturn}
        countLabelEn={`${perfFund.closedCount} closed`}
        countLabelAr={`${perfFund.closedCount} مغلقة`}
        ink={ink} isAr={isAr} ff={ff} row={row}
      />
      <PerfRow
        labelEn="Technical"
        labelAr="الفني"
        value={perfTech.avgRealizedReturn}
        countLabelEn={`${perfTech.closedCount} closed`}
        countLabelAr={`${perfTech.closedCount} مغلقة`}
        ink={ink} isAr={isAr} ff={ff} row={row}
      />
    </View>
  );
}

// One row of the Track Record card. Shows REAL avgRealizedReturn per desk.
function PerfRow({
  labelEn, labelAr, value, countLabelEn, countLabelAr, ink, isAr, ff, row,
}: {
  labelEn: string; labelAr: string;
  value: number | null;
  countLabelEn: string; countLabelAr: string;
  ink: HeroInk; isAr: boolean;
  ff: (w: "400" | "600" | "700" | "800") => string | undefined;
  row: "row" | "row-reverse";
}) {
  const color = value === null ? ink.muted : value >= 0 ? ink.accent : "#D14343";
  const sign = value === null ? "" : value >= 0 ? "+" : "";
  const text = value === null ? "—" : `${sign}${value.toFixed(1)}%`;
  return (
    <View style={[styles.between, { flexDirection: row }]}>
      <View style={{ alignItems: isAr ? "flex-end" : "flex-start" }}>
        <Text style={{ color: ink.primary, fontFamily: ff("700"), fontSize: 12.5 }}>
          {isAr ? labelAr : labelEn}
        </Text>
        <Text style={{ color: ink.muted, fontFamily: ff("400"), fontSize: 10.5, marginTop: 1 }}>
          {isAr ? countLabelAr : countLabelEn}
        </Text>
      </View>
      <Text style={{ color, fontFamily: ff("800"), fontSize: 15 }}>{text}</Text>
    </View>
  );
}

// ── Slide 1 — BUY signal ────────────────────────────────────────────────────
function SignalCard({ isAr, ink, width }: { isAr: boolean; ink: HeroInk; width: number }) {
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const df = (w: "400" | "600" | "700" | "800") => displayFontFor(isAr, w);
  const row = isAr ? "row-reverse" : "row";
  const align = isAr ? "flex-end" : "flex-start";
  const chartW = width - 44;
  return (
    <View style={[styles.card, { borderColor: ink.hairline }]}>
      <View style={[styles.between, { flexDirection: row }]}>
        <View style={{ alignItems: align }}>
          <Text style={{ color: ink.primary, fontFamily: df("800"), fontSize: 22, letterSpacing: isAr ? 0 : 0.3 }}>
            COMI
          </Text>
          <Text style={{ color: ink.muted, fontFamily: ff("400"), fontSize: 11.5, marginTop: 2 }}>
            {isAr ? "البورصة المصرية · توصية محلل" : "EGX · Analyst call"}
          </Text>
        </View>
        <View style={[styles.pillSolid, { backgroundColor: ink.accent }]}>
          <Text style={{ color: "#FFFFFF", fontFamily: ff("800"), fontSize: 13, letterSpacing: 0.5 }}>
            {isAr ? "شراء" : "BUY"}
          </Text>
        </View>
      </View>

      <View style={styles.chartWrap}>
        <Sparkline w={chartW} h={86} accent={ink.accent} uid="signal" />
      </View>

      <View style={[styles.between, { flexDirection: row }]}>
        <View style={[styles.kv, { flexDirection: row }]}>
          <Text style={{ color: ink.muted, fontFamily: ff("400"), fontSize: 12 }}>
            {isAr ? "الهدف" : "Target"}
          </Text>
          <Text style={{ color: ink.primary, fontFamily: ff("700"), fontSize: 14 }}>64.00</Text>
        </View>
        <Text style={{ color: ink.accent, fontFamily: ff("800"), fontSize: 14 }}>+18.2%</Text>
      </View>
    </View>
  );
}

// ── Slide 2 — Live alert ────────────────────────────────────────────────────
function AlertCard({ isAr, ink, width }: { isAr: boolean; ink: HeroInk; width: number }) {
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const row = isAr ? "row-reverse" : "row";
  const align = isAr ? "right" : "left";
  return (
    <View style={[styles.card, styles.cardCenter, { borderColor: ink.hairline }]}>
      {/* primary notification */}
      <View style={[styles.notifRow, { flexDirection: row }]}>
        <View style={[styles.appIcon, { backgroundColor: ink.soft, borderColor: ink.hairline }]}>
          <SmartSignalsMark size={24} ink={ink.primary} accent={ink.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={[styles.between, { flexDirection: row }]}>
            <Text style={{ color: ink.primary, fontFamily: ff("700"), fontSize: 14 }}>
              {isAr ? "إشارة محلل جديدة" : "New analyst signal"}
            </Text>
            <Text style={{ color: ink.muted, fontFamily: ff("400"), fontSize: 11 }}>
              {isAr ? "الآن" : "now"}
            </Text>
          </View>
          <Text style={{ color: ink.secondary, fontFamily: ff("400"), fontSize: 12, textAlign: align, marginTop: 3 }}>
            {isAr ? "COMI · شراء · الهدف ٦٤٫٠٠" : "COMI · Buy · Target 64.00"}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: ink.hairline }]} />

      {/* live footer */}
      <View style={[styles.kv, { flexDirection: row, alignSelf: isAr ? "flex-end" : "flex-start" }]}>
        <View style={[styles.liveDot, { backgroundColor: ink.accent }]} />
        <Text style={{ color: ink.accent, fontFamily: ff("700"), fontSize: 11.5, letterSpacing: 0.3 }}>
          {isAr ? "تنبيه مباشر" : "Live alert"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Chrome (bg / border / radius / shadow / clip) is owned by the animated
  // wrapper in onboarding.tsx — this is content-only.
  card: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  cardCenter: { justifyContent: "center", gap: 14 },
  between: { alignItems: "center", justifyContent: "space-between" },
  kv: { alignItems: "center", gap: 7 },
  iconChip: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  pillSolid: {
    alignItems: "center", gap: 3,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9,
  },
  chartWrap: { alignItems: "center", justifyContent: "center", marginVertical: 6 },
  notifRow: { alignItems: "center", gap: 12 },
  appIcon: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  divider: { height: 1, width: "100%" },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});

/**
 * Analyst Marketplace (mobile) — shared UI primitives. Built on the app's theme
 * system (useColors / fontFamilyFor / Ionicons) since the app has no generic
 * Button. RTL-aware.
 */
import { View, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { bundleById, isUnlimited, slotCountOf, type BundleId } from "@/lib/marketplace/bundles";
import { bundleAccent, initialsOf, type ResolvedAccent } from "@/lib/marketplace/format";
import { ANNUAL_SAVINGS_PCT, type BillingPeriod } from "@/lib/marketplace/billing";
import type { AnalystProfile } from "@/lib/marketplace/types";

type IconName = keyof typeof Ionicons.glyphMap;

// ── Button ───────────────────────────────────────────────────────────────────
export function MButton({
  label, onPress, variant = "primary", icon, color, disabled, style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "subtle";
  icon?: IconName;
  color?: string; // override fill for primary
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const ff = fontFamilyFor(language === "ar", "700");
  const fill = color ?? C.primary;

  const bg = variant === "primary" ? fill : variant === "subtle" ? C.bg.elevated : "transparent";
  const fg = variant === "primary" ? "#fff" : C.text.primary;
  const border = variant === "outline" ? C.border.strong : "transparent";

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "outline" ? 1 : 0, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, flexDirection: isRTL ? "row-reverse" : "row" },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: ff, fontSize: Typography.sm }}>{label}</Text>
    </Pressable>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
export function AnalystAvatar({ analyst, size = 48, bg }: { analyst: AnalystProfile; size?: number; bg: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.38, fontFamily: fontFamilyFor(false, "800") }}>
        {initialsOf(analyst.name)}
      </Text>
    </View>
  );
}

// ── Plan pill ────────────────────────────────────────────────────────────────
export function PlanPill({ planId, small }: { planId: BundleId | null | undefined; small?: boolean }) {
  const C = useColors();
  const { language } = useTheme();
  const isAr = language === "ar";
  const bundle = bundleById(planId);
  if (!bundle) return null;
  const acc = bundleAccent(C, bundle.accent);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: acc.soft, borderRadius: Radius.full, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 3 : 4 }}>
      <Ionicons name={bundle.icon} size={small ? 11 : 12} color={acc.ink} />
      <Text style={{ color: acc.ink, fontWeight: "800", fontSize: small ? 11 : 12, fontFamily: fontFamilyFor(isAr, "800") }}>
        {isAr ? bundle.nameAr : bundle.nameEn}
      </Text>
    </View>
  );
}

// ── Slot meter ───────────────────────────────────────────────────────────────
export function SlotMeter({ planId, used, showLabel = true }: { planId: BundleId | null | undefined; used: number; showLabel?: boolean }) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const bundle = bundleById(planId);
  if (!bundle) return null;
  const acc = bundleAccent(C, bundle.accent);
  const unlimited = isUnlimited(bundle);
  const total = slotCountOf(bundle);
  const pct = unlimited ? Math.max(8, Math.min(100, (used / Math.max(1, total)) * 100)) : Math.min(100, (used / total) * 100);
  return (
    <View>
      {showLabel ? (
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ color: C.text.secondary, fontSize: 12, fontFamily: fontFamilyFor(isAr, "600") }}>{isAr ? "مقاعد المحللين" : "Analyst slots"}</Text>
          <Text style={{ color: C.text.primary, fontSize: 12, fontFamily: fontFamilyFor(isAr, "700") }}>{used} / {unlimited ? "∞" : total}</Text>
        </View>
      ) : null}
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.bg.elevated, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, borderRadius: 4, backgroundColor: acc.main }} />
      </View>
    </View>
  );
}

// ── Feature row (check / dash / value) ───────────────────────────────────────
export function PerkRow({ icon, label, value, accentInk }: { icon?: IconName; label: string; value?: string; accentInk: string }) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  return (
    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${accentInk}22`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon ?? "checkmark"} size={12} color={accentInk} />
      </View>
      <Text style={{ flex: 1, color: C.text.secondary, fontSize: 13, fontFamily: fontFamilyFor(isAr, "500"), textAlign: isRTL ? "right" : "left" }}>
        {label}
        {value ? <Text style={{ color: C.text.primary, fontFamily: fontFamilyFor(isAr, "800") }}>{"  ·  " + value}</Text> : null}
      </Text>
    </View>
  );
}

export function accentFor(C: ReturnType<typeof useColors>, key: Parameters<typeof bundleAccent>[1]): ResolvedAccent {
  return bundleAccent(C, key);
}

// ── Billing cadence toggle (Monthly / Yearly · Save X%) ──────────────────────
export function BillingToggle({
  period, onChange, full,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
  full?: boolean;
}) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = fontFamilyFor(isAr, "800");

  const Seg = ({ value, label, badge }: { value: BillingPeriod; label: string; badge?: boolean }) => {
    const on = period === value;
    return (
      <Pressable
        onPress={() => onChange(value)}
        style={{ flex: full ? 1 : undefined, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: on ? C.primary : "transparent" }}
      >
        <Text style={{ color: on ? "#fff" : C.text.secondary, fontFamily: ff, fontSize: 13 }}>{label}</Text>
        {badge ? (
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full, backgroundColor: on ? "rgba(255,255,255,0.22)" : `${C.accent.teal}22` }}>
            <Text style={{ color: on ? "#fff" : C.accent.teal, fontFamily: ff, fontSize: 9.5 }}>
              {isAr ? `وفّر ${ANNUAL_SAVINGS_PCT}%` : `Save ${ANNUAL_SAVINGS_PCT}%`}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 2, padding: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border.subtle, backgroundColor: C.bg.elevated, alignSelf: full ? "stretch" : "center" }}>
      <Seg value="monthly" label={isAr ? "شهري" : "Monthly"} />
      <Seg value="annual" label={isAr ? "سنوي" : "Yearly"} badge />
    </View>
  );
}

// ── Stack-screen header (back arrow + title + optional right slot) ────────────
export function MarketHeader({
  title, onBack, right, backTo,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  backTo?: string;
}) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const ff = fontFamilyFor(language === "ar", "800");
  const back = () => {
    if (onBack) onBack();
    else if (backTo) router.replace(backTo as any);
    else if (router.canGoBack()) router.back();
    else router.replace("/marketplace" as any);
  };
  return (
    <View style={[hdr.row, { borderBottomColor: C.border.subtle, flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <Pressable onPress={back} style={[hdr.iconBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]} accessibilityLabel="Back">
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
      </Pressable>
      <Text style={{ flex: 1, color: C.text.primary, fontSize: Typography.lg, fontFamily: ff, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

const hdr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingHorizontal: Spacing[4], paddingTop: Spacing[2], paddingBottom: Spacing[3], borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  btn: {
    alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: Radius.full, paddingHorizontal: Spacing[4], paddingVertical: 11,
  },
});

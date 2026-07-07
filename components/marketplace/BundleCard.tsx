/**
 * Analyst Marketplace (mobile) — a single subscription-tier pricing card. Perks
 * derive from the shared FEATURE_MATRIX (bundlePerks) so cards and any comparison
 * stay in sync. Highlighted tier gets an accent ring.
 */
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Radius, Spacing } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { bundlePerks, slotLabel, isUnlimited, type Bundle, type BundleId } from "@/lib/marketplace/bundles";
import { bundleAccent, formatUSD } from "@/lib/marketplace/format";
import { MButton, PerkRow } from "./ui";

export function BundleCard({
  bundle, activePlanId, onChoose, ctaLabel,
}: {
  bundle: Bundle;
  activePlanId?: BundleId | null;
  onChoose: (id: BundleId) => void;
  ctaLabel?: string;
}) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const acc = bundleAccent(C, bundle.accent);
  const perks = bundlePerks(bundle.id);
  const isActive = activePlanId === bundle.id;
  const name = isAr ? bundle.nameAr : bundle.nameEn;
  const tagline = isAr ? bundle.taglineAr : bundle.taglineEn;
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const rtl = isRTL;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: C.bg.surface, borderColor: bundle.highlighted ? acc.main : C.border.subtle, borderWidth: bundle.highlighted ? 2 : 1 },
      ]}
    >
      {bundle.highlighted ? (
        <View style={[styles.ribbon, { backgroundColor: acc.main }]}>
          <Ionicons name="sparkles" size={11} color="#fff" />
          <Text style={styles.ribbonTxt}>{isAr ? "الأكثر شيوعًا" : "Most Popular"}</Text>
        </View>
      ) : null}

      {/* Identity */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: acc.main, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={bundle.icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text.primary, fontSize: 17, fontFamily: ff("800"), textAlign: rtl ? "right" : "left" }}>{name}</Text>
          <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("400"), textAlign: rtl ? "right" : "left" }}>{tagline}</Text>
        </View>
      </View>

      {/* Price */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-end", gap: 4, marginTop: 14 }}>
        <Text style={{ color: C.text.primary, fontSize: 34, fontFamily: ff("800") }}>{formatUSD(bundle.priceUSD)}</Text>
        <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("500"), marginBottom: 4 }}>/ {isAr ? "شهر" : "month"}</Text>
      </View>

      {/* Capacity headline */}
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: acc.soft, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 }}>
        <Ionicons name="checkmark-circle" size={16} color={acc.ink} />
        <Text style={{ color: acc.ink, fontSize: 13, fontFamily: ff("800") }}>
          {isAr ? `اختر ${slotLabel(bundle, true)}` : `Choose ${slotLabel(bundle, false)}`}
        </Text>
      </View>

      {/* Perks */}
      <View style={{ marginTop: 14, gap: 2 }}>
        {perks.map((p) => (
          <PerkRow key={p.key} accentInk={acc.ink} label={isAr ? p.ar : p.en} value={p.value ? (isAr ? p.value.ar : p.value.en) : undefined} />
        ))}
      </View>

      {/* CTA */}
      <View style={{ marginTop: 16 }}>
        {isActive ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: `${C.signal.takeProfit}22`, borderRadius: Radius.full, paddingVertical: 12 }}>
            <Ionicons name="checkmark-circle" size={16} color={C.signal.takeProfit} />
            <Text style={{ color: C.signal.takeProfit, fontSize: 13, fontFamily: ff("800") }}>{isAr ? "خطتك الحالية" : "Your current plan"}</Text>
          </View>
        ) : (
          <MButton
            label={ctaLabel ?? (isAr ? `اختر ${name}` : `Choose ${name}`)}
            variant={bundle.highlighted ? "primary" : "outline"}
            color={acc.main}
            icon={rtl ? "arrow-back" : "arrow-forward"}
            onPress={() => onChoose(bundle.id)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing[5], marginBottom: Spacing[4] },
  ribbon: { position: "absolute", top: -12, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  ribbonTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

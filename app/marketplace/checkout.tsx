/**
 * Analyst Marketplace (mobile) — checkout review + simulated subscribe.
 */
import { useState } from "react";
import { ScrollView, View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useMarketplace } from "@/context/MarketplaceContext";
import { getAnalysts } from "@/lib/marketplace/data";
import { bundlePerks } from "@/lib/marketplace/bundles";
import { annualFrom, chargedAmount, ANNUAL_MONTHS_FREE } from "@/lib/marketplace/billing";
import { formatUSD, analystName, analystRole, avatarColor, bundleAccent } from "@/lib/marketplace/format";
import { MarketHeader, PlanPill, SlotMeter, MButton, AnalystAvatar, PerkRow, BillingToggle } from "@/components/marketplace/ui";

export default function CheckoutScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const mp = useMarketplace();
  const [processing, setProcessing] = useState(false);

  const analysts = getAnalysts(mp.selectedIds);
  const plan = mp.selPlan;

  if (!plan || analysts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
        <MarketHeader title={isAr ? "الدفع" : "Checkout"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing[6], gap: 12 }}>
          <Ionicons name="bag-outline" size={40} color={C.text.muted} />
          <Text style={{ color: C.text.primary, fontSize: 16, fontFamily: ff("800") }}>{!plan ? (isAr ? "اختر باقة أولًا" : "Choose a plan first") : (isAr ? "أضف محللًا" : "Add an analyst")}</Text>
          <MButton label={isAr ? "عرض الباقات" : "View plans"} onPress={() => router.replace("/marketplace")} />
        </View>
      </SafeAreaView>
    );
  }

  const perks = bundlePerks(plan.id);
  const acc = bundleAccent(C, plan.accent);
  const period = mp.selPeriod;
  const isAnnual = period === "annual";
  const total = chargedAmount(plan.priceUSD, period);
  const annual = annualFrom(plan.priceUSD);

  const pay = () => {
    if (processing) return;
    setProcessing(true);
    setTimeout(() => {
      mp.subscribe(plan.id, mp.selectedIds, plan.priceUSD, period);
      mp.clearSelection();
      router.replace("/marketplace/subscription");
    }, 900);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <MarketHeader title={isAr ? "مراجعة الباقة" : "Review your plan"} />
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Plan summary */}
        <View style={{ backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4] }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: acc.main, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text.primary, fontSize: 16, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }}>{isAr ? plan.nameAr : plan.nameEn}</Text>
              <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("500"), textAlign: isRTL ? "right" : "left" }}>{formatUSD(plan.priceUSD)} / {isAr ? "شهر" : "month"}</Text>
            </View>
            <Pressable onPress={() => router.replace("/marketplace")}>
              <Text style={{ color: C.primary, fontSize: 13, fontFamily: ff("700") }}>{isAr ? "تغيير" : "Change"}</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 12 }}><SlotMeter planId={plan.id} used={analysts.length} /></View>
          <View style={{ marginTop: 8 }}>
            {perks.slice(0, 6).map((p) => (
              <PerkRow key={p.key} accentInk={acc.ink} label={isAr ? p.ar : p.en} value={p.value ? (isAr ? p.value.ar : p.value.en) : undefined} />
            ))}
          </View>
        </View>

        {/* Cadence */}
        <View style={{ marginTop: Spacing[4] }}>
          <BillingToggle period={period} onChange={mp.setSelPeriod} full />
        </View>

        {/* Analysts */}
        <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800"), marginTop: Spacing[5], marginBottom: Spacing[3], textAlign: isRTL ? "right" : "left" }}>
          {isAr ? `${analysts.length} محللين مختارين` : `${analysts.length} analysts selected`}
        </Text>
        <View style={{ gap: Spacing[2] }}>
          {analysts.map((a) => (
            <View key={a.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.md, padding: Spacing[3] }}>
              <AnalystAvatar analyst={a} size={40} bg={avatarColor(C, a.id)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text.primary, fontSize: 14, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{analystName(a, isAr)}</Text>
                <Text style={{ color: C.text.muted, fontSize: 11.5, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{a.countryFlag} {analystRole(a, isAr)}</Text>
              </View>
              <Pressable onPress={() => mp.removeFromSelection(a.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.text.muted} />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Total */}
        {isAnnual ? (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing[4] }}>
            <Text style={{ color: C.accent.teal, fontSize: 12.5, fontFamily: ff("700") }}>{isAr ? `${ANNUAL_MONTHS_FREE} شهر مجانًا` : `${ANNUAL_MONTHS_FREE} months free`}</Text>
            <Text style={{ color: C.accent.teal, fontSize: 12.5, fontFamily: ff("700") }}>−{formatUSD(plan.priceUSD * ANNUAL_MONTHS_FREE)}</Text>
          </View>
        ) : null}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1, borderTopColor: C.border.subtle }}>
          <View>
            <Text style={{ color: C.text.primary, fontSize: 14, fontFamily: ff("800") }}>{isAnnual ? (isAr ? "الإجمالي/سنة" : "Total / yr") : (isAr ? "الإجمالي/شهر" : "Total / mo")}</Text>
            {isAnnual ? <Text style={{ color: C.text.muted, fontSize: 11, fontFamily: ff("400"), marginTop: 2 }}>≈ {formatUSD(annual.effectiveMonthly)}/{isAr ? "شهر" : "mo"}</Text> : null}
          </View>
          <Text style={{ color: C.text.primary, fontSize: 24, fontFamily: ff("800") }}>{formatUSD(total)}</Text>
        </View>

        <MButton label={processing ? (isAr ? "جارٍ التفعيل…" : "Activating…") : (isAr ? `اشترك · ${formatUSD(total)}` : `Subscribe · ${formatUSD(total)}`)} icon="lock-closed" onPress={pay} disabled={processing} style={{ marginTop: Spacing[4] }} />
        {processing ? <ActivityIndicator color={C.primary} style={{ marginTop: 12 }} /> : null}
        <Text style={{ color: C.text.muted, fontSize: 11, fontFamily: ff("400"), textAlign: "center", marginTop: Spacing[3] }}>
          {isAr ? "دفع آمن · محاكاة في هذا العرض" : "Secure checkout · simulated in this demo"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

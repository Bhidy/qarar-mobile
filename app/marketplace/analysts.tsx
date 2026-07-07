/**
 * Analyst Marketplace (mobile) — pick analysts to fill your plan's slots.
 * Slot-aware: a subscriber adds directly to their live plan; a prospect builds
 * an in-progress selection and continues to checkout.
 */
import { ScrollView, View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, deltaColor } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useMarketplace } from "@/context/MarketplaceContext";
import { getAllAnalysts } from "@/lib/marketplace/data";
import { formatUSD, formatCompact, marketExchange, coverageLabel, analystName, analystRole, avatarColor } from "@/lib/marketplace/format";
import { annualFrom } from "@/lib/marketplace/billing";
import type { AnalystProfile } from "@/lib/marketplace/types";
import { MarketHeader, PlanPill, SlotMeter, MButton, AnalystAvatar } from "@/components/marketplace/ui";

export default function AnalystsScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const mp = useMarketplace();
  const analysts = getAllAnalysts();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <MarketHeader title={isAr ? "المحللون" : "Analysts"} />
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Plan bar */}
        {mp.isActive && mp.subPlanId ? (
          <View style={[bar.box, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
              <PlanPill planId={mp.subPlanId} small />
              <Text style={{ flex: 1, color: C.text.primary, fontSize: 13, fontFamily: ff("700"), textAlign: isRTL ? "right" : "left" }}>
                {isAr ? `${mp.analystIds.length} محللين نشطين` : `${mp.analystIds.length} analysts active`}
              </Text>
              <Pressable onPress={() => router.push("/marketplace/subscription")}>
                <Text style={{ color: C.primary, fontSize: 13, fontFamily: ff("700") }}>{isAr ? "إدارة" : "Manage"}</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 10 }}><SlotMeter planId={mp.subPlanId} used={mp.analystIds.length} showLabel={false} /></View>
          </View>
        ) : mp.selPlanId ? (
          <View style={[bar.box, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
              <PlanPill planId={mp.selPlanId} small />
              <Text style={{ flex: 1, color: C.text.primary, fontSize: 13, fontFamily: ff("700"), textAlign: isRTL ? "right" : "left" }}>
                {mp.selUnlimited ? (isAr ? `${mp.selCount} مُضاف` : `${mp.selCount} added`) : (isAr ? `${mp.selCount} من ${mp.selSlotLimit}` : `${mp.selCount} of ${mp.selSlotLimit}`)}
              </Text>
              <Pressable onPress={() => router.push("/marketplace")}>
                <Text style={{ color: C.primary, fontSize: 13, fontFamily: ff("700") }}>{isAr ? "تغيير الباقة" : "Change plan"}</Text>
              </Pressable>
            </View>
            <View style={{ marginTop: 10 }}><SlotMeter planId={mp.selPlanId} used={mp.selCount} showLabel={false} /></View>
          </View>
        ) : (
          <Pressable onPress={() => router.push("/marketplace")} style={[bar.box, { backgroundColor: C.primarySofter, borderColor: C.border.subtle, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }]}>
            <Ionicons name="pricetags-outline" size={18} color={C.primaryInk} />
            <Text style={{ flex: 1, color: C.text.primary, fontSize: 13, fontFamily: ff("700"), textAlign: isRTL ? "right" : "left" }}>{isAr ? "اختر باقة للبدء" : "Choose a plan to start"}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={C.text.muted} />
          </Pressable>
        )}

        {/* Analyst list */}
        <View style={{ gap: Spacing[3], marginTop: Spacing[3] }}>
          {analysts.map((a) => (
            <AnalystRow key={a.id} analyst={a} />
          ))}
        </View>
      </ScrollView>

      {/* Continue bar (in-progress selection only) */}
      {!mp.isActive && mp.selCount > 0 && mp.selPlan ? (
        <View style={[bar.tray, { backgroundColor: C.bg.surface, borderTopColor: C.border.subtle, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
              <PlanPill planId={mp.selPlanId} small />
              <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("600") }}>
                {mp.selUnlimited ? `${mp.selCount}` : `${mp.selCount}/${mp.selSlotLimit}`}
              </Text>
            </View>
            <Text style={{ color: C.text.primary, fontSize: 13, fontFamily: ff("800"), marginTop: 2 }}>
              {mp.selPeriod === "annual" ? formatUSD(annualFrom(mp.selPlan.priceUSD).effectiveMonthly) : formatUSD(mp.selPlan.priceUSD)}
              <Text style={{ color: C.text.muted, fontFamily: ff("500") }}> / {isAr ? "شهر" : "mo"}</Text>
              {mp.selPeriod === "annual" ? <Text style={{ color: C.accent.teal, fontFamily: ff("700") }}> · {isAr ? "سنوي" : "yearly"}</Text> : null}
            </Text>
          </View>
          <MButton label={isAr ? "متابعة" : "Continue"} icon={isRTL ? "arrow-back" : "arrow-forward"} onPress={() => router.push("/marketplace/checkout")} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function AnalystRow({ analyst: a }: { analyst: AnalystProfile }) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const mp = useMarketplace();

  const inPlan = mp.isSubscribedToAnalyst(a.id);
  const selected = mp.isSelected(a.id);
  const canAddActive = mp.isActive && !inPlan && mp.subSlotsLeft > 0;
  const activeFull = mp.isActive && !inPlan && mp.subSlotsLeft <= 0;
  const selDisabled = !mp.isActive && !selected && !mp.canAdd(a.id);

  const onToggle = () => {
    if (inPlan) { router.push(`/marketplace/${a.slug}`); return; }
    if (canAddActive) { mp.addAnalyst(a.id); return; }
    if (activeFull) { router.push("/marketplace/subscription"); return; }
    mp.toggleSelection(a.id);
  };

  const ret = a.metrics.avgReturn;
  return (
    <View style={{ backgroundColor: C.bg.surface, borderColor: inPlan ? C.signal.takeProfit : selected ? C.primary : C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4] }}>
      <Pressable onPress={() => router.push(`/marketplace/${a.slug}`)} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
        <AnalystAvatar analyst={a} size={46} bg={avatarColor(C, a.id)} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{analystName(a, isAr)}</Text>
          <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{a.countryFlag} {analystRole(a, isAr)}</Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 12 }}>
        <Metric C={C} label={isAr ? "العائد" : "Return"} value={`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`} color={deltaColor(ret)} ff={ff} />
        <Metric C={C} label={isAr ? "النجاح" : "Success"} value={`${a.metrics.successRate}%`} ff={ff} />
        <Metric C={C} label={isAr ? "المشتركون" : "Subs"} value={formatCompact(a.metrics.subscribers)} ff={ff} />
      </View>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 12 }}>
        <Text style={{ flex: 1, color: C.text.secondary, fontSize: 12, fontFamily: ff("600"), textAlign: isRTL ? "right" : "left" }}>
          {marketExchange(a.market)} · {coverageLabel(a.coverage, isAr)}
        </Text>
        {inPlan ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${C.signal.takeProfit}22`, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Ionicons name="checkmark-circle" size={14} color={C.signal.takeProfit} />
            <Text style={{ color: C.signal.takeProfit, fontSize: 12, fontFamily: ff("800") }}>{isAr ? "ضمن باقتك" : "In your plan"}</Text>
          </View>
        ) : activeFull ? (
          <MButton label={isAr ? "الباقة ممتلئة" : "Plan full"} variant="outline" icon="lock-closed-outline" onPress={onToggle} />
        ) : (
          <MButton
            label={selected ? (isAr ? "تمت الإضافة" : "Added") : canAddActive ? (isAr ? "أضف للباقة" : "Add to plan") : (isAr ? "أضف" : "Add")}
            variant={selected ? "subtle" : "primary"}
            icon={selected ? "checkmark" : "add"}
            onPress={onToggle}
            disabled={selDisabled}
          />
        )}
      </View>
    </View>
  );
}

function Metric({ C, label, value, color, ff }: { C: any; label: string; value: string; color?: string; ff: (w: any) => string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg.elevated, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 10 }}>
      <Text style={{ color: C.text.muted, fontSize: 10, fontFamily: ff("600") }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: color ?? C.text.primary, fontSize: 14, fontFamily: ff("800"), marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4] },
  tray: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", gap: 12, paddingHorizontal: Spacing[4], paddingTop: Spacing[3], paddingBottom: Spacing[6], borderTopWidth: 1 },
});

/**
 * Analyst Marketplace (mobile) — My Subscription. Manage the active plan: roster
 * (add via the analyst list / remove here), change tier, cancel.
 */
import { useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useMarketplace } from "@/context/MarketplaceContext";
import { getAnalysts } from "@/lib/marketplace/data";
import { BUNDLES, bundlePerks, isUnlimited, type BundleId } from "@/lib/marketplace/bundles";
import { formatUSD, analystName, analystRole, avatarColor, bundleAccent, marketExchange, coverageLabel } from "@/lib/marketplace/format";
import { MarketHeader, PlanPill, SlotMeter, MButton, AnalystAvatar } from "@/components/marketplace/ui";
import { BundleCard } from "@/components/marketplace/BundleCard";

export default function SubscriptionScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const mp = useMarketplace();
  const [showChange, setShowChange] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const plan = mp.subPlan;

  if (!mp.isActive || !plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
        <MarketHeader title={isAr ? "اشتراكي" : "My Subscription"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing[6], gap: 12 }}>
          <Ionicons name="compass-outline" size={40} color={C.text.muted} />
          <Text style={{ color: C.text.primary, fontSize: 16, fontFamily: ff("800") }}>{isAr ? "لا يوجد اشتراك نشط" : "No active subscription"}</Text>
          <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("400"), textAlign: "center" }}>{isAr ? "اختر باقة واختر محلليك." : "Choose a plan and pick your analysts."}</Text>
          <MButton label={isAr ? "عرض الباقات" : "View plans"} onPress={() => router.replace("/marketplace")} />
        </View>
      </SafeAreaView>
    );
  }

  const analysts = getAnalysts(mp.analystIds);
  const perks = bundlePerks(plan.id);
  const acc = bundleAccent(C, plan.accent);
  const unlimited = isUnlimited(plan);
  const canAddMore = unlimited || mp.subSlotsLeft > 0;
  const renew = mp.nextBilling();
  const renewStr = renew ? new Date(renew).toLocaleDateString(isAr ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const handleChange = (id: BundleId) => {
    const target = BUNDLES.find((b) => b.id === id);
    if (target) mp.changePlan(id, target.priceUSD);
    setShowChange(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <MarketHeader title={isAr ? "اشتراكي" : "My Subscription"} />
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        {/* Plan summary */}
        <View style={{ backgroundColor: C.bg.surface, borderColor: acc.soft, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing[4] }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: acc.main, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={unlimited ? "ribbon" : "checkmark-circle"} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: C.text.primary, fontSize: 20, fontFamily: ff("800") }}>{isAr ? plan.nameAr : plan.nameEn}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${C.signal.takeProfit}22`, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Ionicons name="checkmark-circle" size={12} color={C.signal.takeProfit} />
                  <Text style={{ color: C.signal.takeProfit, fontSize: 10.5, fontFamily: ff("800") }}>{isAr ? "نشط" : "Active"}</Text>
                </View>
              </View>
              <Text style={{ color: C.text.muted, fontSize: 12.5, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }}>{isAr ? plan.taglineAr : plan.taglineEn}</Text>
              <Text style={{ color: C.text.primary, fontSize: 24, fontFamily: ff("800"), marginTop: 4 }}>{formatUSD(plan.priceUSD)}<Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("500") }}> / {isAr ? "شهر" : "month"}</Text></Text>
            </View>
          </View>

          <View style={{ marginTop: 14 }}><SlotMeter planId={plan.id} used={analysts.length} /></View>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Ionicons name="calendar-outline" size={14} color={C.text.muted} />
            <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("500") }}>{isAr ? "يتجدد" : "Renews"} <Text style={{ color: C.text.secondary, fontFamily: ff("700") }}>{renewStr}</Text></Text>
          </View>

          {/* Feature chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {perks.map((p) => (
              <View key={p.key} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: acc.soft, borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Ionicons name="checkmark" size={11} color={acc.ink} />
                <Text style={{ color: acc.ink, fontSize: 11, fontFamily: ff("700") }}>{isAr ? p.ar : p.en}</Text>
              </View>
            ))}
          </View>

          <MButton label={isAr ? "تغيير الباقة" : "Change plan"} variant="outline" icon="swap-horizontal-outline" onPress={() => setShowChange((v) => !v)} style={{ marginTop: 14 }} />
        </View>

        {/* Change-plan panel */}
        {showChange ? (
          <View style={{ marginTop: Spacing[4] }}>
            <Text style={{ color: C.text.muted, fontSize: 12.5, fontFamily: ff("400"), marginBottom: Spacing[3], textAlign: isRTL ? "right" : "left" }}>
              {isAr ? "يسري التغيير فورًا (محاكاة). عند التقليل يُحتفظ بالمحللين الأوائل." : "Switching takes effect immediately (simulated). Downgrading keeps your earliest analysts."}
            </Text>
            {BUNDLES.map((b) => (
              <BundleCard key={b.id} bundle={b} activePlanId={mp.subPlanId} onChoose={handleChange} ctaLabel={isAr ? `التبديل إلى ${b.nameAr}` : `Switch to ${b.nameEn}`} />
            ))}
          </View>
        ) : null}

        {/* Roster */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing[5], marginBottom: Spacing[3] }}>
          <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800") }}>
            {isAr ? "محللوك" : "Your analysts"} <Text style={{ color: C.text.muted, fontFamily: ff("500") }}>· {analysts.length}{unlimited ? "" : `/${plan.slots}`}</Text>
          </Text>
          {canAddMore ? (
            <Pressable onPress={() => router.push("/marketplace/analysts")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="person-add-outline" size={16} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: 13, fontFamily: ff("700") }}>{isAr ? "أضف" : "Add"}</Text>
            </Pressable>
          ) : null}
        </View>

        {analysts.length === 0 ? (
          <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: C.border.strong, borderRadius: Radius.md, padding: Spacing[5], alignItems: "center", gap: 10 }}>
            <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("400") }}>{isAr ? "لم تُضِف أي محللين بعد." : "You haven't added any analysts yet."}</Text>
            <MButton label={isAr ? "تصفح المحللين" : "Browse analysts"} onPress={() => router.push("/marketplace/analysts")} />
          </View>
        ) : (
          <View style={{ gap: Spacing[2] }}>
            {analysts.map((a) => (
              <View key={a.id} style={{ backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.md, padding: Spacing[3] }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <AnalystAvatar analyst={a} size={42} bg={avatarColor(C, a.id)} />
                  <Pressable style={{ flex: 1 }} onPress={() => router.push(`/marketplace/${a.slug}`)}>
                    <Text style={{ color: C.text.primary, fontSize: 14, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{analystName(a, isAr)}</Text>
                    <Text style={{ color: C.text.muted, fontSize: 11.5, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>{a.countryFlag} {marketExchange(a.market)} · {coverageLabel(a.coverage, isAr)}</Text>
                  </Pressable>
                  {confirmRemove === a.id ? (
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <Pressable onPress={() => { mp.removeAnalyst(a.id); setConfirmRemove(null); }} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: C.accent.red }}>
                        <Text style={{ color: C.accent.red, fontSize: 12, fontFamily: ff("800") }}>{isAr ? "إزالة" : "Remove"}</Text>
                      </Pressable>
                      <Pressable onPress={() => setConfirmRemove(null)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border.strong }}>
                        <Text style={{ color: C.text.secondary, fontSize: 12, fontFamily: ff("800") }}>{isAr ? "إبقاء" : "Keep"}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => setConfirmRemove(a.id)} hitSlop={8} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.border.subtle, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="trash-outline" size={16} color={C.text.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Cancel */}
        <View style={{ marginTop: Spacing[5], alignItems: "center" }}>
          {confirmCancel ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => { mp.cancel(); setConfirmCancel(false); router.replace("/marketplace"); }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: C.accent.red }}>
                <Text style={{ color: "#fff", fontSize: 12.5, fontFamily: ff("800") }}>{isAr ? "تأكيد الإلغاء" : "Confirm cancel"}</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmCancel(false)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border.strong }}>
                <Text style={{ color: C.text.secondary, fontSize: 12.5, fontFamily: ff("800") }}>{isAr ? "إبقاء الباقة" : "Keep plan"}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmCancel(true)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border.strong }}>
              <Text style={{ color: C.text.secondary, fontSize: 12.5, fontFamily: ff("800") }}>{isAr ? "إلغاء الاشتراك" : "Cancel subscription"}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

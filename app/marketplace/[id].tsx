/**
 * Analyst Marketplace (mobile) — analyst profile. Identity + metrics, a state-
 * aware unlock rail, latest signals, and a plan gate. Scope: Fundamental &
 * Technical signals only (no research).
 */
import { ScrollView, View, Pressable } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, deltaColor } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useMarketplace } from "@/context/MarketplaceContext";
import { getAnalyst } from "@/lib/marketplace/data";
import { BUNDLES } from "@/lib/marketplace/bundles";
import {
  formatUSD, formatCompact, marketExchange, coverageLabel, languageLabel, analystTypeLabel,
  analystName, analystRole, analystBio, analystCountry, analystSpecialties, avatarColor,
} from "@/lib/marketplace/format";
import { MarketHeader, PlanPill, MButton, AnalystAvatar } from "@/components/marketplace/ui";

export default function AnalystProfileScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = id ? getAnalyst(id) : undefined;
  const mp = useMarketplace();

  if (!a) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
        <MarketHeader title={isAr ? "المحلل" : "Analyst"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Ionicons name="search-outline" size={40} color={C.text.muted} />
          <Text style={{ color: C.text.primary, fontSize: 16, fontFamily: ff("800") }}>{isAr ? "المحلل غير موجود" : "Analyst not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const inPlan = mp.isSubscribedToAnalyst(a.id);
  const canAddActive = mp.isActive && !inPlan && mp.subSlotsLeft > 0;
  const activeFull = mp.isActive && !inPlan && mp.subSlotsLeft <= 0;
  const selected = mp.isSelected(a.id);
  const minPrice = Math.min(...BUNDLES.map((b) => b.priceUSD));
  const ret = a.metrics.avgReturn;

  const onPrimary = () => {
    if (canAddActive) { mp.addAnalyst(a.id); return; }
    if (activeFull) { router.push("/marketplace/subscription"); return; }
    if (mp.canAdd(a.id)) { mp.addToSelection(a.id); router.push("/marketplace/checkout"); }
    else router.push("/marketplace");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <MarketHeader title={isAr ? "المحلل" : "Analyst"} />
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={{ backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4] }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 14 }}>
            <AnalystAvatar analyst={a} size={64} bg={avatarColor(C, a.id)} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={{ color: C.text.primary, fontSize: 20, fontFamily: ff("800") }}>{analystName(a, isAr)}</Text>
                {inPlan ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: `${C.signal.takeProfit}22`, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Ionicons name="checkmark-circle" size={11} color={C.signal.takeProfit} />
                    <Text style={{ color: C.signal.takeProfit, fontSize: 10, fontFamily: ff("800") }}>{isAr ? "ضمن باقتك" : "In plan"}</Text>
                  </View>
                ) : a.verified ? (
                  <Ionicons name="checkmark-circle" size={16} color={C.primary} />
                ) : null}
              </View>
              <Text style={{ color: C.text.secondary, fontSize: 13, fontFamily: ff("500"), textAlign: isRTL ? "right" : "left" }}>{analystRole(a, isAr)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {[`${a.countryFlag} ${analystCountry(a, isAr)}`, marketExchange(a.market), languageLabel(a.languages, isAr), coverageLabel(a.coverage, isAr), analystTypeLabel(a.analystType, isAr)].map((chip, i) => (
              <View key={i} style={{ backgroundColor: C.bg.elevated, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: C.text.secondary, fontSize: 11, fontFamily: ff("600") }}>{chip}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: C.text.secondary, fontSize: 13.5, fontFamily: ff("400"), lineHeight: 20, marginTop: 12, textAlign: isRTL ? "right" : "left" }}>{analystBio(a, isAr)}</Text>

          {/* Metrics */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 14 }}>
            <Tile C={C} ff={ff} label={isAr ? "العائد" : "Avg Return"} value={`${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`} color={deltaColor(ret)} />
            <Tile C={C} ff={ff} label={isAr ? "النجاح" : "Success"} value={`${a.metrics.successRate}%`} />
            <Tile C={C} ff={ff} label={isAr ? "الإشارات" : "Signals"} value={`${a.metrics.publishedSignals}`} />
            <Tile C={C} ff={ff} label={isAr ? "المشتركون" : "Subs"} value={formatCompact(a.metrics.subscribers)} />
          </View>
        </View>

        {/* Unlock rail */}
        <View style={{ backgroundColor: C.bg.surface, borderColor: inPlan ? C.signal.takeProfit : C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4], marginTop: Spacing[4] }}>
          {inPlan ? (
            <>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                <PlanPill planId={mp.subPlanId} small />
                <Text style={{ color: C.text.secondary, fontSize: 13, fontFamily: ff("700") }}>{isAr ? "وصول كامل" : "Full access"}</Text>
              </View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: `${C.signal.takeProfit}22`, borderRadius: Radius.md, padding: 10, marginTop: 12 }}>
                <Ionicons name="lock-open-outline" size={16} color={C.signal.takeProfit} />
                <Text style={{ color: C.signal.takeProfit, fontSize: 12.5, fontFamily: ff("700") }}>{isAr ? "الإشارات مفتوحة بالأسفل" : "Signals unlocked below"}</Text>
              </View>
              <MButton label={isAr ? "إدارة الاشتراك" : "Manage subscription"} variant="outline" icon="settings-outline" onPress={() => router.push("/marketplace/subscription")} style={{ marginTop: 12 }} />
            </>
          ) : (
            <>
              <Text style={{ color: C.text.muted, fontSize: 11, fontFamily: ff("700"), textTransform: "uppercase", textAlign: isRTL ? "right" : "left" }}>{isAr ? "افتح الوصول" : "Unlock access"}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-end", gap: 4, marginTop: 4 }}>
                <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("500"), marginBottom: 3 }}>{isAr ? "من" : "from"}</Text>
                <Text style={{ color: C.text.primary, fontSize: 30, fontFamily: ff("800") }}>{formatUSD(minPrice)}</Text>
                <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("500"), marginBottom: 3 }}>/ {isAr ? "شهر" : "mo"}</Text>
              </View>
              <Text style={{ color: C.text.muted, fontSize: 12, fontFamily: ff("400"), marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                {isAr ? "أضف هذا المحلل إلى باقة لفتح إشاراته." : "Add this analyst to a plan to unlock their signals."}
              </Text>
              <MButton
                label={canAddActive ? (isAr ? "أضف إلى باقتك" : "Add to your plan") : activeFull ? (isAr ? "ترقية للإضافة" : "Upgrade to add") : selected ? (isAr ? "المتابعة للدفع" : "Continue to checkout") : (isAr ? "اختر باقة" : "Choose a plan")}
                icon={isRTL ? "arrow-back" : "arrow-forward"}
                onPress={onPrimary}
                style={{ marginTop: 12 }}
              />
              {!mp.isActive ? (
                <Pressable onPress={() => (selected ? mp.removeFromSelection(a.id) : mp.canAdd(a.id) && mp.addToSelection(a.id))} style={{ marginTop: 10, alignItems: "center" }}>
                  <Text style={{ color: C.primary, fontSize: 12.5, fontFamily: ff("700") }}>
                    {selected ? (isAr ? "إزالة من الاختيار" : "Remove from selection") : (isAr ? "أضف إلى الاختيار" : "Add to selection")}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        {/* Latest signals */}
        <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800"), marginTop: Spacing[5], marginBottom: Spacing[3], textAlign: isRTL ? "right" : "left" }}>{isAr ? "أحدث الإشارات" : "Latest signals"}</Text>
        <View style={{ backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing[4] }}>
          {a.latestSignals.map((s, i) => {
            const closed = s.status === "closed";
            return (
              <View key={s.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border.subtle }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text.primary, fontSize: 14, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }}>{s.ticker} · {s.signal}</Text>
                  <Text style={{ color: C.text.muted, fontSize: 11.5, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }}>{isAr && s.companyAr ? s.companyAr : s.company} · {s.kind === "fundamental" ? (isAr ? "أساسي" : "Fundamental") : (isAr ? "فني" : "Technical")}</Text>
                </View>
                <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                  <Text style={{ color: s.returnPct != null ? deltaColor(s.returnPct) : C.text.muted, fontSize: 13, fontFamily: ff("800") }}>
                    {s.returnPct != null ? `${s.returnPct >= 0 ? "+" : ""}${s.returnPct.toFixed(1)}%` : "—"}
                  </Text>
                  <Text style={{ color: C.text.muted, fontSize: 10, fontFamily: ff("600") }}>{closed ? (isAr ? "مغلقة" : "Closed") : (isAr ? "نشطة" : "Active")}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Locked gate */}
        {!inPlan ? (
          <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: C.border.strong, borderRadius: Radius.lg, padding: Spacing[5], alignItems: "center", marginTop: Spacing[4], gap: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="lock-closed" size={20} color={C.primaryInk} />
            </View>
            <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800"), textAlign: "center" }}>
              {Math.max(0, a.metrics.publishedSignals - a.latestSignals.length)}+ {isAr ? "إشارة إضافية بالباقة" : "more signals with a plan"}
            </Text>
            <Text style={{ color: C.text.muted, fontSize: 12.5, fontFamily: ff("400"), textAlign: "center", lineHeight: 18 }}>
              {isAr ? "أضف هذا المحلل إلى باقة لفتح كل إشاراته الأساسية والفنية." : "Add this analyst to a plan to unlock every Fundamental & Technical signal."}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ C, ff, label, value, color }: { C: any; ff: (w: any) => string; label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg.elevated, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 8, alignItems: "center" }}>
      <Text style={{ color: color ?? C.text.primary, fontSize: 14, fontFamily: ff("800") }}>{value}</Text>
      <Text style={{ color: C.text.muted, fontSize: 9.5, fontFamily: ff("600"), marginTop: 2 }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

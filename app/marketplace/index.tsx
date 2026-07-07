/**
 * Analyst Marketplace (mobile) — Plans screen (entry point). Presents the three
 * bundles; choosing one sets the in-progress plan and routes to analyst picking.
 */
import { ScrollView, View } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useMarketplace } from "@/context/MarketplaceContext";
import { BUNDLES, type BundleId } from "@/lib/marketplace/bundles";
import { BundleCard } from "@/components/marketplace/BundleCard";
import { MarketHeader, PlanPill, MButton } from "@/components/marketplace/ui";

export default function PlansScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { setPlan, selPlanId, isActive, subPlanId } = useMarketplace();
  const current: BundleId | null = subPlanId ?? selPlanId;

  const choose = (id: BundleId) => {
    setPlan(id);
    router.push("/marketplace/analysts");
  };

  const steps = [
    { icon: "hand-left-outline", en: "Pick a plan", ar: "اختر باقة", d_en: "Choose the tier that fits how many analysts you follow.", d_ar: "اختر الباقة التي تناسب عدد المحللين الذين تتابعهم." },
    { icon: "person-add-outline", en: "Choose your analysts", ar: "اختر محلليك", d_en: "Fill your slots with any analysts across every market.", d_ar: "املأ مقاعدك بأي محللين في كل الأسواق." },
    { icon: "notifications-outline", en: "Get live signals", ar: "استقبل الإشارات", d_en: "Their Fundamental & Technical signals unlock instantly.", d_ar: "تُفتح إشاراتهم الأساسية والفنية فورًا." },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <MarketHeader title={isAr ? "الباقات" : "Plans"} />
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={{ backgroundColor: C.primarySofter, borderRadius: Radius.lg, padding: Spacing[4], marginBottom: Spacing[4] }}>
          <Text style={{ color: C.text.primary, fontSize: 22, fontFamily: ff("800"), textAlign: isRTL ? "right" : "left" }}>
            {isAr ? "باقة واحدة. المحللون الذين تختارهم." : "One plan. The analysts you choose."}
          </Text>
          <Text style={{ color: C.text.muted, fontSize: 13, fontFamily: ff("400"), marginTop: 6, lineHeight: 20, textAlign: isRTL ? "right" : "left" }}>
            {isAr
              ? "اشترك في باقة، ثم اختر محلليك لفتح إشاراتهم الأساسية والفنية — بالإضافة إلى تنبيهات المنصة والأخبار، تلقائيًا."
              : "Subscribe to a bundle, then pick your analysts to unlock their Fundamental & Technical signals — plus platform alerts and news, all automated."}
          </Text>
        </View>

        {/* Active-plan banner */}
        {isActive && subPlanId ? (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[4] }}>
            <PlanPill planId={subPlanId} small />
            <Text style={{ flex: 1, color: C.text.secondary, fontSize: 12.5, fontFamily: ff("500"), textAlign: isRTL ? "right" : "left" }}>
              {isAr ? "أنت مشترك — أدِر اشتراكك في أي وقت." : "You're subscribed — manage it anytime."}
            </Text>
            <MButton label={isAr ? "إدارة" : "Manage"} variant="subtle" onPress={() => router.push("/marketplace/subscription")} />
          </View>
        ) : null}

        {/* Bundle cards */}
        {BUNDLES.map((b) => (
          <BundleCard key={b.id} bundle={b} activePlanId={current} onChoose={choose} />
        ))}

        {/* Scope note */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, backgroundColor: C.bg.elevated, borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[5] }}>
          <Ionicons name="information-circle-outline" size={16} color={C.text.muted} />
          <Text style={{ flex: 1, color: C.text.secondary, fontSize: 12, fontFamily: ff("400"), lineHeight: 18, textAlign: isRTL ? "right" : "left" }}>
            {isAr
              ? "تغطي كل باقة الإشارات الأساسية والفنية لمحلليك فقط. وكل ما تضيفه الباقة تقدّمه المنصة تلقائيًا."
              : "Every plan covers your analysts' Fundamental & Technical signals only. Everything else is delivered automatically by the platform."}
          </Text>
        </View>

        {/* How it works */}
        <Text style={{ color: C.text.primary, fontSize: 18, fontFamily: ff("800"), marginBottom: Spacing[3], textAlign: isRTL ? "right" : "left" }}>
          {isAr ? "كيف تعمل" : "How it works"}
        </Text>
        {steps.map((s, i) => (
          <View key={s.en} style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, backgroundColor: C.bg.surface, borderColor: C.border.subtle, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4], marginBottom: Spacing[3] }}>
            <View style={{ width: 38, height: 38, borderRadius: Radius.md, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={s.icon} size={18} color={C.primaryInk} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text.muted, fontSize: 11, fontFamily: ff("700"), textAlign: isRTL ? "right" : "left" }}>{isAr ? `الخطوة ${i + 1}` : `Step ${i + 1}`}</Text>
              <Text style={{ color: C.text.primary, fontSize: 15, fontFamily: ff("800"), marginTop: 2, textAlign: isRTL ? "right" : "left" }}>{isAr ? s.ar : s.en}</Text>
              <Text style={{ color: C.text.muted, fontSize: 12.5, fontFamily: ff("400"), marginTop: 2, lineHeight: 18, textAlign: isRTL ? "right" : "left" }}>{isAr ? s.d_ar : s.d_en}</Text>
            </View>
          </View>
        ))}

        <Text style={{ color: C.text.muted, fontSize: 11.5, fontFamily: ff("400"), textAlign: "center", marginTop: Spacing[3] }}>
          {isAr ? "إلغاء في أي وقت · الدفع محاكاة في هذا العرض." : "Cancel anytime · checkout is simulated in this demo."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

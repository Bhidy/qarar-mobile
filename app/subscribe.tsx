/**
 * Smart Signals — mobile subscribe screen. Hosts the in-app purchase (RevenueCat)
 * once wired. Until then, the Subscribe button reports that IAP is being enabled.
 * A user already subscribed (web/Paymob or store) shows as premium here.
 */
import { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useAuth } from "@/context/AuthContext";
import { purchasePremium } from "@/lib/iap";

const FEATURES: Array<[string, string]> = [
  ["Conviction-grade fundamental & technical signals", "إشارات أساسية وفنية عالية الثقة"],
  ["Full reports, price targets & entry/exit zones", "تقارير كاملة وأهداف سعرية ومناطق دخول/خروج"],
  ["Smart personalized alerts", "تنبيهات ذكية مخصصة"],
  ["Real-time market news & analyst announcements", "أخبار السوق الفورية وإفصاحات المحللين"],
];

export default function SubscribeScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { premium, user, refreshStatus, subscriptionsEnabled } = useAuth();
  const [period, setPeriod] = useState<"premium_monthly" | "premium_annual">("premium_monthly");
  const [busy, setBusy] = useState(false);
  const T = (en: string, ar: string) => (isAr ? ar : en);

  // Defensive: while the paid model is off, this screen must never be seen. Nothing in
  // the UI links here, but if it's ever reached (deep link / stale nav) bounce home.
  useEffect(() => {
    if (!subscriptionsEnabled) router.replace("/tabs");
  }, [subscriptionsEnabled]);
  if (!subscriptionsEnabled) return null;

  async function subscribe() {
    if (!user) { router.push("/login"); return; }
    setBusy(true);
    try {
      const r = await purchasePremium(period);
      if (!r.available) {
        Alert.alert(T("Almost there", "قريبًا"), T("In-app subscription is being enabled. Please update to the latest version soon.", "جارٍ تفعيل الاشتراك داخل التطبيق. يرجى التحديث لأحدث إصدار قريبًا."));
      } else if (r.ok) {
        await refreshStatus();
        Alert.alert(T("Welcome to Premium", "مرحبًا بك في بريميوم"), T("Your subscription is active.", "اشتراكك نشط الآن."));
        router.back();
      }
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }}>
      <ScrollView contentContainerStyle={{ padding: Spacing[5] }}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
          <Ionicons name="close" size={26} color={C.text.muted} />
        </Pressable>

        <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }]}>
          {premium ? T("You're Premium", "أنت مشترك") : T("Start your free month", "ابدأ شهرك المجاني")}
        </Text>
        <Text style={[styles.sub, { color: C.text.muted, fontFamily: ff("400") }]}>
          {premium ? T("Full access is unlocked.", "تم فتح الوصول الكامل.") : T("1 month free, then EGP 150/mo or 1,500/yr. Cancel anytime.", "شهر مجاني ثم 150ج/شهر أو 1500ج/سنة. ألغِ في أي وقت.")}
        </Text>

        {!premium && <>
          <View style={{ marginTop: Spacing[5], gap: Spacing[3] }}>
            {FEATURES.map(([en, ar], i) => (
              <View key={i} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: Spacing[2] }}>
                <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                <Text style={{ color: C.text.secondary, fontSize: 15, fontFamily: ff("400"), flex: 1, textAlign: isAr ? "right" : "left" }}>{T(en, ar)}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: Spacing[3], marginTop: Spacing[5] }}>
            {([["premium_monthly", T("Monthly", "شهري"), "EGP 150"], ["premium_annual", T("Annual", "سنوي"), "EGP 1,500"]] as const).map(([id, label, price]) => (
              <Pressable key={id} onPress={() => setPeriod(id)} style={[styles.planCard, { borderColor: period === id ? C.primary : C.border.subtle, backgroundColor: period === id ? `${C.primary}10` : C.bg.surface }]}>
                <Text style={{ color: C.text.primary, fontFamily: ff("700"), fontSize: 15 }}>{label}</Text>
                <Text style={{ color: C.text.muted, fontFamily: ff("400"), fontSize: 13, marginTop: 2 }}>{price}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={subscribe} disabled={busy} style={[styles.cta, { backgroundColor: busy ? C.text.muted : C.primary }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[styles.ctaText, { fontFamily: ff("700") }]}>{T("Start free month", "ابدأ الشهر المجاني")}</Text>}
          </Pressable>
        </>}

        {premium && (
          <Pressable onPress={() => router.back()} style={[styles.cta, { backgroundColor: C.primary, marginTop: Spacing[6] }]}>
            <Text style={[styles.ctaText, { fontFamily: ff("700") }]}>{T("Continue", "متابعة")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: "flex-end", marginBottom: Spacing[2] },
  title: { fontSize: Typography.xl, textAlign: "center" },
  sub: { fontSize: Typography.sm, textAlign: "center", marginTop: 6, lineHeight: 20 },
  planCard: { flex: 1, borderWidth: 1.5, borderRadius: Radius.lg, padding: 14, alignItems: "center" },
  cta: { borderRadius: Radius.lg, paddingVertical: 16, alignItems: "center", marginTop: Spacing[5] },
  ctaText: { color: "#fff", fontSize: 16 },
});

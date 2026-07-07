import { View, Pressable, StyleSheet, Linking } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";

const TERMS_URL = "https://mubashersignals.com/terms";

/**
 * Always-visible financial disclaimer for signal/recommendation surfaces
 * (Fundamental, Technical, stock, home). Smart Signals is an information service
 * only — showing calls, targets and performance without a nearby "not advice"
 * notice risks Apple 2.3 (misleading) / 5.0 (legal) and is a regulatory best
 * practice for a signals app. Tap opens the full Terms (which carry the complete
 * legal disclaimer). Bilingual + RTL.
 */
export function Disclaimer() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "700") => fontFamilyFor(isAr, w);

  return (
    <View style={[styles.wrap, { borderTopColor: C.border.subtle, flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <Ionicons name="information-circle-outline" size={14} color={C.text.muted} style={{ marginTop: 1 }} />
      <Text style={[styles.text, { color: C.text.muted, fontFamily: ff("400"), textAlign: isRTL ? "right" : "left" }]}>
        {isAr
          ? "لأغراض إعلامية فقط وليست توصية أو نصيحة استثمارية. الأداء السابق لا يضمن النتائج المستقبلية. الاستثمار ينطوي على مخاطر — استثمر على مسؤوليتك واستشر مستشارًا مرخّصًا. "
          : "For information only — not investment advice or a recommendation. Past performance does not guarantee future results. Investing involves risk; invest at your own responsibility and consult a licensed advisor. "}
        <Text onPress={() => Linking.openURL(TERMS_URL)} style={{ color: C.primary, fontFamily: ff("700") }}>
          {isAr ? "الشروط الكاملة" : "Full terms"}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    alignItems: "flex-start",
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    marginTop: Spacing[4],
    borderTopWidth: 1,
  },
  text: { flex: 1, fontSize: 11, lineHeight: 16 },
});

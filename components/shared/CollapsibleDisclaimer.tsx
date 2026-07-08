import { useState } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { RichText } from "@/lib/rich-text";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Collapsed-by-default legal disclaimer (تنويه) for signal/report detail views on
 * mobile — mirrors the web CollapsibleDisclaimer. `html` is the already-picked EN/AR
 * rich disclaimer (Analyst Certification / Head of Research / Copyright…). Renders
 * nothing when empty. Tap the header to expand/collapse (LayoutAnimation).
 */
export function CollapsibleDisclaimer({ html }: { html?: string }) {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const [open, setOpen] = useState(false);

  if (!html || !html.trim()) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  };

  return (
    <View style={[styles.card, { backgroundColor: C.bg.surface, borderColor: open ? C.border.strong : C.border.subtle }]}>
      <Pressable onPress={toggle} style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.iconChip, { backgroundColor: `${C.primary}14` }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
            {isAr ? "تنويه" : "Disclaimer"}
          </Text>
          <Text numberOfLines={1} style={[styles.sub, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.right]}>
            {isAr ? "توثيق المحلل والإشعار القانوني" : "Analyst certification & legal notice"}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={open ? C.primary : C.text.muted} />
      </Pressable>

      {open && (
        <View style={[styles.body, { borderTopColor: C.border.subtle }]}>
          <RichText html={html} colors={C} isRTL={isAr || isRTL} fontFamily={ff} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.xl ?? 20, overflow: "hidden", marginTop: Spacing[3] },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  iconChip: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontWeight: "800" },
  sub: { fontSize: 11, marginTop: 1 },
  body: { borderTopWidth: 1, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
});

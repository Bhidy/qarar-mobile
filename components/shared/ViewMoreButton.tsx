import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";

/**
 * Companion control for useViewMore(). Renders "View N more" while rows remain,
 * "Show less" once everything is revealed, and nothing when the list fits in one
 * page. Theme- and language-aware so it drops into any screen unchanged.
 */
export function ViewMoreButton({
  canExpand,
  expanded,
  nextCount,
  expand,
  collapse,
}: {
  canExpand: boolean;
  expanded: boolean;
  nextCount: number;
  expand: () => void;
  collapse: () => void;
}) {
  const C = useColors();
  const { language } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  if (!canExpand && !expanded) return null;
  const isExpand = canExpand;
  const tint = isExpand ? C.primary : C.text.muted;

  return (
    <Pressable
      onPress={isExpand ? expand : collapse}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: C.bg.surface, borderColor: C.border.default },
        pressed && { opacity: 0.7 },
      ]}
      hitSlop={6}
    >
      <Text style={[styles.txt, { color: tint, fontFamily: ff("700") }]}>
        {isExpand
          ? isAr
            ? "تحميل المزيد"
            : "Load more"
          : isAr
            ? "عرض أقل"
            : "Show less"}
      </Text>
      <Ionicons name={isExpand ? "chevron-down" : "chevron-up"} size={16} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing[3],
  },
  txt: { fontSize: Typography.sm, letterSpacing: 0.2 },
});

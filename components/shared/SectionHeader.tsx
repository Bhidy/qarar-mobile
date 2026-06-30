import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Typography, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export function SectionHeader({ title, subtitle, onViewAll, viewAllLabel }: SectionHeaderProps) {
  const C = useColors();
  const { isRTL, t } = useTheme();

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.textBlock, isRTL && styles.textBlockRTL]}>
        <Text style={[styles.title, { color: C.text.primary }, isRTL && styles.textRight]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: C.text.muted }, isRTL && styles.textRight]}>{subtitle}</Text>
        )}
      </View>
      {onViewAll && (
        <Pressable
          onPress={onViewAll}
          style={[styles.viewAll, isRTL && styles.viewAllRTL]}
        >
          <Text style={[styles.viewAllText, { color: C.primary }]}>
            {viewAllLabel ?? t("common.viewAll")}
          </Text>
          <Ionicons
            name={isRTL ? "chevron-back" : "chevron-forward"}
            size={12}
            color={C.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing[4],
  },
  containerRTL: { flexDirection: "row-reverse" },

  textBlock: { flex: 1, marginRight: Spacing[2] },
  textBlockRTL: { marginRight: 0, marginLeft: Spacing[2] },

  title: {
    fontSize: Typography.lg,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.xs,
    marginTop: 2,
    lineHeight: 15,
  },
  textRight: { textAlign: "right" },

  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  viewAllRTL: { flexDirection: "row-reverse" },
  viewAllText: {
    fontSize: Typography.xs,
    fontWeight: "600",
  },
});

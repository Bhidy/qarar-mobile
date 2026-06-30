import { View, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";

/**
 * Shared empty-state card. Used wherever a list can legitimately be empty (no
 * published content yet, language-filtered to zero, etc.) so a section never
 * renders a header over blank space. NEVER show fabricated sample data instead.
 */
export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
  compact,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const C = useColors();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: C.bg.surface, borderColor: C.border.subtle },
        compact && styles.compact,
      ]}
    >
      <Ionicons name={icon} size={compact ? 24 : 32} color={C.text.muted} />
      <Text style={[styles.title, { color: C.text.secondary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { color: C.text.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  compact: { paddingVertical: 20, gap: 6 },
  title: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});

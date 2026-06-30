import { View, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { getSignalConfig, Radius, Typography } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

interface SignalBadgeProps {
  signal: string;
  size?: "sm" | "md";
}

// Arabic labels so signal chips localize in AR mode (parity with web; audit H2).
const AR_SIGNAL: Record<string, string> = {
  invest: "استثمار", buy: "شراء", hold: "احتفاظ",
  "take profit": "جني أرباح", "take-profit": "جني أرباح", sell: "بيع", live: "مباشر",
};

/**
 * Signal pill — SmartSignals brand identity component.
 * Border-radius is 4px (pill/rectangle), never rounded.
 * font-weight 800. Matches signal system in BRAND.md.
 */
export function SignalBadge({ signal, size = "md" }: SignalBadgeProps) {
  const config = getSignalConfig(signal);
  const { language } = useTheme();
  const isSm = size === "sm";
  const en = signal.toUpperCase().replace("-", " ");
  const key = signal.toLowerCase();
  const label = language === "ar" ? (AR_SIGNAL[key] ?? AR_SIGNAL[key.replace("-", " ")] ?? en) : en;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        isSm ? styles.sm : styles.md,
      ]}
    >
      {/* Live pulse dot */}
      {signal.toLowerCase() === "live" && (
        <View style={styles.liveDot} />
      )}
      <Text
        style={[
          styles.label,
          { color: config.color },
          isSm && styles.labelSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    // 4px radius is identity-critical per SmartSignals brand guidelines
    borderRadius: Radius.pill,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: "800",
    letterSpacing: 0.1 * 10, // 0.1em approximation
  },
  labelSm: {
    fontSize: 9.5,
    letterSpacing: 0.8,
  },
});

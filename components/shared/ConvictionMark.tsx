import { useEffect, useState } from "react";
import { View, StyleSheet, AccessibilityInfo } from "react-native";
import { Text } from "@/components/shared/AppText";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Signature motif: a conviction ring whose arc sweep ENCODES A REAL NUMBER
 * (remaining upside, return, or realized Alpha) and whose color is the
 * financial-truth green/red by sign. Animates a stroke-draw on mount (the same
 * technique as the splash mark), respecting reduce-motion. The number in the
 * centre is the source of truth — the arc is a faithful visual of it, never a
 * decorative or fabricated value.
 */
export function ConvictionMark({
  value,
  size = 72,
  stroke = 6,
  label,
  maxMagnitude = 40,
  colorUp,
  colorDown,
  track,
  textColor,
}: {
  value: number;            // signed percent (upside / return / realized)
  size?: number;
  stroke?: number;
  label?: string;           // small caption under the number, e.g. "UPSIDE"
  maxMagnitude?: number;    // |value| that maps to a full ring
  colorUp: string;
  colorDown: string;
  track: string;
  textColor: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const mag = Math.min(Math.abs(value) / maxMagnitude, 1); // 0..1 of the ring
  const targetOffset = circumference * (1 - mag);
  const color = value >= 0 ? colorUp : colorDown;

  const dash = useSharedValue(circumference); // start empty
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (live) setReduce(v); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (reduce) { dash.value = targetOffset; return; }
    dash.value = circumference;
    dash.value = withTiming(targetOffset, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [targetOffset, reduce]);

  const animProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color: textColor, fontSize: size * 0.24 }]}>
          {value > 0 ? "+" : ""}{value.toFixed(1)}%
        </Text>
        {label ? (
          <Text style={[styles.label, { color: textColor, fontSize: Math.max(size * 0.12, 8) }]}>{label}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  value: { fontWeight: "800", letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  label: { fontWeight: "700", letterSpacing: 0.6, opacity: 0.55, marginTop: 1 },
});

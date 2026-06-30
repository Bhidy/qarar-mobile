import { useEffect } from "react";
import { View, StyleSheet, Platform, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

/**
 * OnboardingBackdrop — the premium LIGHT backdrop for the onboarding flow.
 *
 * Deliberately separate from the shared dark `AuroraBackground` (used by
 * login / biometric / app-lock): onboarding is a controlled, airy, brand-blue
 * light moment. A near-white canvas carries two large, softly-blurred royal-blue
 * glows that breathe slowly, a faint top wash for status-bar/brand contrast, and
 * a hairline base line. Restrained alphas keep dark ink crisp and AA-legible.
 *
 * iOS (Fabric) renders the CSS-style `filter: blur()` natively; Android falls
 * back to lower-opacity soft circles, which still read as a gentle aurora.
 */
export function OnboardingBackdrop({ animated = true }: { animated?: boolean }) {
  const blurOK = Platform.OS === "ios";
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 7000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [animated]);

  const glowA = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.06 }, { translateY: breathe.value * -18 }],
    opacity: 0.55 + breathe.value * 0.12,
  }));
  const glowB = useAnimatedStyle(() => ({
    transform: [{ scale: 1.06 - breathe.value * 0.05 }, { translateX: breathe.value * 22 }],
    opacity: 0.45 + breathe.value * 0.12,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FBFCFF" }]} pointerEvents="none">
      {/* Base vertical wash — white at top, faint brand-blue tint at the base */}
      <LinearGradient
        colors={["#FFFFFF", "#F4F7FF", "#E9F0FF"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glow A — upper-right, dominant royal-blue */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: W * 1.2,
            height: W * 1.2,
            top: -H * 0.12,
            right: -W * 0.3,
            backgroundColor: "rgba(11,77,212,0.16)",
            ...(blurOK ? { filter: "blur(120px)" } : { opacity: 0.16 }),
          },
          glowA,
        ]}
      />
      {/* Glow B — lower-left, lighter companion */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: W * 1.1,
            height: W * 1.1,
            bottom: -H * 0.08,
            left: -W * 0.3,
            backgroundColor: "rgba(58,110,240,0.12)",
            ...(blurOK ? { filter: "blur(120px)" } : { opacity: 0.12 }),
          },
          glowB,
        ]}
      />

      {/* Top wash — keeps the status bar + brand lockup crisp over the glow */}
      <LinearGradient
        colors={["rgba(255,255,255,0.92)", "rgba(255,255,255,0)"]}
        style={styles.topWash}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", borderRadius: 9999 },
  topWash: { position: "absolute", top: 0, left: 0, right: 0, height: H * 0.2 },
});

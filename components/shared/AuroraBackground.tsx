import { useEffect } from "react";
import { View, StyleSheet, Platform, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/**
 * AuroraBackground — the premium dark backdrop shared by onboarding + auth.
 *
 * Three large, organically-placed colour blobs softened into an aurora with a
 * heavy blur (the same Delta-by-eToro / App-Store-screenshot aesthetic the brand
 * approved). The blobs breathe slowly for a living, high-end feel. A vertical
 * gradient scrim on top guarantees text contrast at the headline and CTA zones.
 *
 * iOS (New Architecture / Fabric) renders the CSS-style `filter: blur()` natively;
 * Android falls back to lower-opacity soft circles, which still reads as an aurora.
 */

type Variant = "blue" | "plum" | "teal" | "gold" | "crimson";

// Brand-aligned palette: the blue aurora now keys off the canonical Smart Signals
// royal-blue token (#0B4DD4) and its deep companion (#062373) — the same gradient
// the web hero uses — instead of the previous near-black field. Result: the
// onboarding and login backdrop now reads as "premium brand blue", not "neutral
// dark". Alphas remain restrained so white text stays crisp.
const PALETTES: Record<Variant, { base: string; a: string; b: string; c: string }> = {
  blue:    { base: "#0A1A45", a: "rgba(11,77,212,0.68)",   b: "rgba(8,55,155,0.52)",  c: "rgba(157,182,255,0.36)" },
  plum:    { base: "#08050E", a: "rgba(167,116,224,0.28)", b: "rgba(108,72,220,0.22)", c: "rgba(77,142,248,0.16)" },
  teal:    { base: "#040B0F", a: "rgba(45,168,168,0.28)",  b: "rgba(77,142,248,0.20)", c: "rgba(217,181,96,0.12)" },
  gold:    { base: "#090703", a: "rgba(217,181,96,0.24)",  b: "rgba(226,121,88,0.18)", c: "rgba(77,142,248,0.14)" },
  crimson: { base: "#0B0508", a: "rgba(228,97,90,0.26)",   b: "rgba(167,116,224,0.20)", c: "rgba(77,142,248,0.14)" },
};

interface Props {
  variant?: Variant;
  /** Subtle breathing motion on the blobs. Default true. */
  animated?: boolean;
}

export function AuroraBackground({ variant = "blue", animated = true }: Props) {
  const p = PALETTES[variant];
  const blurOK = Platform.OS === "ios"; // Fabric supports the filter style natively

  // Slow "breathing" — a long, eased loop on scale + opacity. Cheap: 3 transforms.
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

  const blobA = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.08 }, { translateY: breathe.value * -22 }],
    opacity: 0.9 + breathe.value * 0.1,
  }));
  const blobB = useAnimatedStyle(() => ({
    transform: [{ scale: 1.05 - breathe.value * 0.07 }, { translateX: breathe.value * 26 }],
    opacity: 0.82 + breathe.value * 0.12,
  }));
  const blobC = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.05 }, { translateY: breathe.value * 18 }],
    opacity: 0.7 + breathe.value * 0.12,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.base }]} pointerEvents="none">
      {/* Blob A — large, top-left, the dominant hue */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: SCREEN_W * 1.25,
            height: SCREEN_W * 1.05,
            top: -SCREEN_H * 0.16,
            left: -SCREEN_W * 0.34,
            backgroundColor: p.a,
            ...(blurOK ? { filter: "blur(120px)" } : { opacity: 0.5 }),
          },
          blobA,
        ]}
      />
      {/* Blob B — secondary, upper-right */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: SCREEN_W * 1.0,
            height: SCREEN_W * 0.95,
            top: SCREEN_H * 0.02,
            right: -SCREEN_W * 0.32,
            backgroundColor: p.b,
            ...(blurOK ? { filter: "blur(120px)" } : { opacity: 0.42 }),
          },
          blobB,
        ]}
      />
      {/* Blob C — tertiary, lower band, ties the composition together */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: SCREEN_W * 1.15,
            height: SCREEN_W * 0.9,
            bottom: -SCREEN_H * 0.1,
            left: -SCREEN_W * 0.15,
            backgroundColor: p.c,
            ...(blurOK ? { filter: "blur(130px)" } : { opacity: 0.34 }),
          },
          blobC,
        ]}
      />

      {/* Flat scrim — restrained tone-down so the brand-blue glow stays visible
          but white text contrast clears AA at every vertical position. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,22,68,0.22)" }]} />

      {/* Vertical depth — deepest at top (status bar + brand lockup) and bottom
          (CTA + legal), lighter through the middle so the blue glow reads. */}
      <LinearGradient
        colors={[
          "rgba(6,18,55,0.55)",
          "rgba(11,40,110,0.05)",
          "rgba(8,22,68,0.30)",
          p.base,
        ]}
        locations={[0, 0.28, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
});

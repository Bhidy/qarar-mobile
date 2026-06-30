/**
 * Smart Signals — Animated Splash Screen
 *
 * Three ultra-premium splash directions, rotated each app launch:
 *   1. The Decisive Draw  — mark draws itself, wordmark rises
 *   2. Aurora              — light blooms into the mark
 *   3. Ticker Coalesce     — EGX tape collapses into the mark
 *
 * Ported pixel-perfectly from Claude Design prototype (splash-variants.jsx).
 * Uses react-native-reanimated for smooth 60fps animations + react-native-svg.
 */

import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, Dimensions, StatusBar } from "react-native";
import { Text } from "@/components/shared/AppText";
import Animated, {
  useSharedValue,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  FadeOut,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Path,
  Line,
  Rect,
  Defs,
  Pattern,
  G,
} from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW, height: SH } = Dimensions.get("window");

/* ═══════════════════════════════════════════════════════════════════════
   Brand constants — matching Claude Design prototype exactly
   ═══════════════════════════════════════════════════════════════════════ */
const INK = "#FFFFFF";
const DOT = "#4D8EF8";
const MUTED = "rgba(255,255,255,0.55)";
const BG_DARK = "#0A0E1F";
const BG_DEEP = "#062373";

const SERIF = "Sora_700Bold";
const SANS = "Manrope_600SemiBold";
const MONO = "Manrope_500Medium";
const AR = "IBMPlexSansArabic_700Bold";

const SPLASH_KEY = "@smartsignals_splash_variant";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ═══════════════════════════════════════════════════════════════════════
   Common easing
   ═══════════════════════════════════════════════════════════════════════ */
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SMOOTH = Easing.bezier(0.22, 0.61, 0.36, 1);

/* ═══════════════════════════════════════════════════════════════════════
   Variant 1 · The Decisive Draw
   Mark draws itself, wordmark rises, arabic fades in
   ═══════════════════════════════════════════════════════════════════════ */
function SplashDecisiveDraw({ onFinish }: { onFinish: () => void }) {
  // Animation progress: 0 → 1 over ~4 seconds (showing portion of the 7s cycle)
  const bowlDash = useSharedValue(113);
  const vectorDash = useSharedValue(30);
  const dotScale = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.4);
  const glowOpacity = useSharedValue(0);
  const wordY = useSharedValue(14);
  const wordOpacity = useSharedValue(0);
  const arY = useSharedValue(8);
  const arOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const tagLetterSpacing = useSharedValue(8);
  const starsY = useSharedValue(0);

  useEffect(() => {
    // Stars gentle drift (continuous)
    starsY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Bowl circle draws: 0ms delay → 1800ms
    bowlDash.value = withDelay(
      200,
      withTiming(0, { duration: 1400, easing: EASE_OUT })
    );

    // Vector line draws: 400ms delay → 800ms
    vectorDash.value = withDelay(
      600,
      withTiming(0, { duration: 800, easing: EASE_OUT })
    );

    // Dot lands: bounce at 900ms
    dotOpacity.value = withDelay(900, withTiming(1, { duration: 200 }));
    dotScale.value = withDelay(
      900,
      withSequence(
        withTiming(1.4, { duration: 200, easing: EASE_OUT }),
        withTiming(1, { duration: 200, easing: EASE_OUT })
      )
    );

    // Glow behind dot
    glowOpacity.value = withDelay(
      900,
      withSequence(
        withTiming(0.35, { duration: 200, easing: EASE_OUT }),
        withTiming(0, { duration: 600, easing: EASE_OUT })
      )
    );
    glowScale.value = withDelay(
      900,
      withSequence(
        withTiming(2.4, { duration: 200, easing: EASE_OUT }),
        withTiming(3.2, { duration: 600, easing: EASE_OUT })
      )
    );

    // Wordmark rises: 1400ms
    wordOpacity.value = withDelay(1400, withTiming(1, { duration: 500, easing: EASE_OUT }));
    wordY.value = withDelay(1400, withTiming(0, { duration: 600, easing: EASE_OUT }));

    // Arabic: 1800ms
    arOpacity.value = withDelay(1800, withTiming(0.55, { duration: 500, easing: EASE_OUT }));
    arY.value = withDelay(1800, withTiming(0, { duration: 500, easing: EASE_OUT }));

    // Tag: 2200ms
    tagOpacity.value = withDelay(2200, withTiming(1, { duration: 500, easing: EASE_OUT }));
    tagLetterSpacing.value = withDelay(
      2200,
      withTiming(3.5, { duration: 600, easing: EASE_OUT })
    );

    // Finish after full animation plays
    const timer = setTimeout(() => onFinish(), 4000);
    return () => clearTimeout(timer);
  }, []);

  const bowlProps = useAnimatedProps(() => ({
    strokeDashoffset: bowlDash.value,
  }));

  const vectorProps = useAnimatedProps(() => ({
    strokeDashoffset: vectorDash.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wordY.value }],
    opacity: wordOpacity.value,
  }));

  const arStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: arY.value }],
    opacity: arOpacity.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
  }));

  const starsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: starsY.value }],
  }));

  // Generate constellation star positions
  const stars = Array.from({ length: 28 }).map((_, i) => ({
    x: (i * 73 + 17) % Math.round(SW),
    y: (i * 137 + 41) % Math.round(SH),
    r: i % 5 === 0 ? 1.6 : i % 3 === 0 ? 1.1 : 0.7,
    o: 0.25 + (i % 4) * 0.08,
  }));

  return (
    <View style={[s.container, { backgroundColor: BG_DARK }]}>
      {/* Background deep blue overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: BG_DEEP, opacity: 0.3 },
        ]}
      />

      {/* Constellation stars */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.9 }, starsStyle]}>
        <Svg width={SW} height={SH}>
          {stars.map((st, i) => (
            <Circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#fff" opacity={st.o} />
          ))}
        </Svg>
      </Animated.View>

      {/* Hairline reticle behind mark */}
      <View style={s.reticle}>
        <Svg width={300} height={300} viewBox="0 0 400 400">
          <Line x1={0} x2={400} y1={200} y2={200} stroke="#fff" strokeWidth={0.5} />
          <Line x1={200} x2={200} y1={0} y2={400} stroke="#fff" strokeWidth={0.5} />
          <Circle
            cx={200}
            cy={200}
            r={170}
            stroke="#fff"
            strokeWidth={0.5}
            fill="none"
            strokeDasharray="2 6"
          />
        </Svg>
      </View>

      {/* Mark */}
      <View style={{ marginTop: 40, alignItems: "center" }}>
        <Svg width={156} height={156} viewBox="0 0 64 64" fill="none">
          {/* Glow halo behind dot — animated separately */}
          <AnimatedCircle
            cx={58}
            cy={58}
            r={4}
            fill={DOT}
            animatedProps={useAnimatedProps(() => ({
              opacity: glowOpacity.value,
              // @ts-ignore
              transform: [{ scale: glowScale.value }],
            }))}
          />
          {/* Bowl circle — drawn on */}
          <AnimatedCircle
            cx={24}
            cy={24}
            r={18}
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="113"
            animatedProps={bowlProps}
          />
          {/* Vector line — drawn on */}
          <AnimatedPath
            d="M 37 37 L 58 58"
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray="30"
            animatedProps={vectorProps}
          />
          {/* Accent dot */}
          <Circle cx={58} cy={58} r={4} fill={DOT} />
        </Svg>
      </View>

      {/* Wordmark */}
      <Animated.View style={[{ marginTop: 38 }, wordStyle]}>
        <Text style={[s.wordmark, { fontSize: 64, lineHeight: 74 }]}>Smart{"\n"}Signals</Text>
      </Animated.View>

      {/* Arabic */}
      <Animated.View style={[{ marginTop: 8 }, arStyle]}>
        <Text style={s.arabic}>{"الاستثمار الذكي"}</Text>
      </Animated.View>

      {/* Bottom tag */}
      <Animated.View style={[s.bottomTag, tagStyle]}>
        <View style={s.tagLine} />
        <Text style={s.tagText}>POWERED BY MUBASHER</Text>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Variant 2 · Aurora
   Light blooms into the mark, wordmark blooms italic
   ═══════════════════════════════════════════════════════════════════════ */
function SplashAurora({ onFinish }: { onFinish: () => void }) {
  const auroraScale = useSharedValue(0.6);
  const auroraOpacity = useSharedValue(0);
  const circleDash = useSharedValue(113);
  const circleOpacity = useSharedValue(0);
  const vectorDash = useSharedValue(30);
  const vectorOpacity = useSharedValue(0);
  const dotScale = useSharedValue(0);
  const dotOpacity = useSharedValue(0);
  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.96);
  const arOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);

  useEffect(() => {
    // Aurora orb blooms: 0ms
    auroraOpacity.value = withSequence(
      withTiming(0.9, { duration: 500, easing: EASE_OUT }),
      withTiming(0.25, { duration: 1200, easing: EASE_OUT })
    );
    auroraScale.value = withSequence(
      withTiming(1.2, { duration: 400, easing: EASE_OUT }),
      withTiming(1.8, { duration: 600, easing: EASE_OUT }),
      withTiming(2.6, { duration: 1000, easing: EASE_OUT })
    );

    // Circle traces: 600ms
    circleOpacity.value = withDelay(500, withTiming(1, { duration: 200 }));
    circleDash.value = withDelay(
      600,
      withTiming(0, { duration: 1200, easing: EASE_SMOOTH })
    );

    // Vector traces: 900ms
    vectorOpacity.value = withDelay(800, withTiming(1, { duration: 200 }));
    vectorDash.value = withDelay(
      900,
      withTiming(0, { duration: 800, easing: EASE_SMOOTH })
    );

    // Dot settles: 1400ms
    dotOpacity.value = withDelay(1400, withTiming(1, { duration: 200 }));
    dotScale.value = withDelay(
      1400,
      withSequence(
        withTiming(1.6, { duration: 250, easing: EASE_OUT }),
        withTiming(1, { duration: 200, easing: EASE_OUT })
      )
    );

    // Wordmark blooms: 1800ms
    wordOpacity.value = withDelay(1800, withTiming(1, { duration: 500, easing: EASE_OUT }));
    wordScale.value = withDelay(
      1800,
      withTiming(1, { duration: 600, easing: EASE_OUT })
    );

    // Arabic: 2200ms
    arOpacity.value = withDelay(2200, withTiming(0.65, { duration: 500, easing: EASE_OUT }));

    // Tag: 2600ms
    tagOpacity.value = withDelay(2600, withTiming(1, { duration: 500, easing: EASE_OUT }));

    const timer = setTimeout(() => onFinish(), 4000);
    return () => clearTimeout(timer);
  }, []);

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: circleDash.value,
    opacity: circleOpacity.value,
  }));

  const vectorProps = useAnimatedProps(() => ({
    strokeDashoffset: vectorDash.value,
    opacity: vectorOpacity.value,
  }));

  const auroraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: auroraScale.value }],
    opacity: auroraOpacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wordScale.value }],
    opacity: wordOpacity.value,
  }));

  const arStyle = useAnimatedStyle(() => ({
    opacity: arOpacity.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
  }));

  return (
    <View style={[s.container, { backgroundColor: BG_DARK }]}>
      {/* Background deep overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: BG_DEEP, opacity: 0.3 },
        ]}
      />

      {/* Faint editorial grid */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}>
        <Svg width={SW} height={SH}>
          <Defs>
            <Pattern id="aurora-grid" width={48} height={48} patternUnits="userSpaceOnUse">
              <Path d="M 48 0 L 0 0 0 48" fill="none" stroke="#fff" strokeWidth={0.4} />
            </Pattern>
          </Defs>
          <Rect width={SW} height={SH} fill="url(#aurora-grid)" />
        </Svg>
      </View>

      {/* Mark assembly */}
      <View style={{ marginTop: 30, alignItems: "center" }}>
        {/* Aurora orb behind */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -60,
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: DOT,
            },
            auroraStyle,
          ]}
        />
        {/* Deep blue halo layer */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -60,
              width: 280,
              height: 280,
              borderRadius: 140,
              backgroundColor: "#062373",
              opacity: 0.4,
            },
            auroraStyle,
          ]}
        />

        <Svg width={180} height={180} viewBox="0 0 64 64" fill="none">
          <AnimatedCircle
            cx={24}
            cy={24}
            r={18}
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="113"
            animatedProps={circleProps}
          />
          <AnimatedPath
            d="M 37 37 L 58 58"
            stroke={INK}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray="30"
            animatedProps={vectorProps}
          />
          <Circle cx={58} cy={58} r={4} fill={DOT} />
        </Svg>
      </View>

      {/* Wordmark — italic serif bloom */}
      <Animated.View style={[{ marginTop: 36 }, wordStyle]}>
        <Text style={[s.wordmark, { fontSize: 64, lineHeight: 74, fontStyle: "italic" }]}>
          Smart{"\n"}Signals
        </Text>
      </Animated.View>

      {/* Arabic */}
      <Animated.View style={[{ marginTop: 6 }, arStyle]}>
        <Text style={[s.arabic, { fontSize: 28, fontWeight: "600" }]}>
          {"الاستثمار الذكي"}
        </Text>
      </Animated.View>

      {/* Bottom tag with dot ornament */}
      <Animated.View style={[s.bottomTag, tagStyle]}>
        <Svg width={60} height={6} viewBox="0 0 60 6">
          <Circle cx={30} cy={3} r={2} fill={DOT} />
          <Line x1={0} x2={22} y1={3} y2={3} stroke="rgba(255,255,255,0.3)" strokeWidth={0.8} />
          <Line x1={38} x2={60} y1={3} y2={3} stroke="rgba(255,255,255,0.3)" strokeWidth={0.8} />
        </Svg>
        <Text style={s.tagText}>POWERED BY MUBASHER</Text>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Variant 3 · Ticker Coalesce
   EGX ticker rows scroll, blur-fade out, mark coalesces from center
   ═══════════════════════════════════════════════════════════════════════ */
const TICKERS = [
  { t: "COMI", px: "89.40", ch: "+3.62%", up: true },
  { t: "HRHO", px: "33.85", ch: "+2.18%", up: true },
  { t: "SWDY", px: "64.20", ch: "+4.84%", up: true },
  { t: "TMGH", px: "42.10", ch: "+1.05%", up: true },
  { t: "ABUK", px: "47.60", ch: "-0.74%", up: false },
  { t: "ETEL", px: "23.10", ch: "+0.41%", up: true },
  { t: "ESRS", px: "24.80", ch: "-2.18%", up: false },
  { t: "JUFO", px: "13.40", ch: "+2.94%", up: true },
];

function TickerRow({
  rowIndex,
  fadeOpacity,
}: {
  rowIndex: number;
  fadeOpacity: SharedValue<number>;
}) {
  const scrollX = useSharedValue(0);
  const speed = 10000 + (rowIndex % 4) * 3000;
  const reverse = rowIndex % 2 !== 0;
  const rowOpacity = 0.25 + Math.abs(3 - rowIndex) * 0.12;

  useEffect(() => {
    scrollX.value = withRepeat(
      withTiming(reverse ? SW * 2 : -SW * 2, {
        duration: speed,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const scrollStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value * rowOpacity,
  }));

  const renderTickers = () =>
    TICKERS.map((it, i) => (
      <View key={i} style={s.tickerItem}>
        <Text style={s.tickerSymbol}>{it.t}</Text>
        <Text style={s.tickerPrice}>{it.px}</Text>
        <Text
          style={[
            s.tickerChange,
            { color: it.up ? "#4D8EF8" : "#FF8E86" },
          ]}
        >
          {it.ch}
        </Text>
        <Text style={s.tickerDot}>{"  ·  "}</Text>
      </View>
    ));

  return (
    <Animated.View style={[{ overflow: "hidden" }, fadeStyle]}>
      <Animated.View style={[{ flexDirection: "row" }, scrollStyle]}>
        {renderTickers()}
        {renderTickers()}
        {renderTickers()}
      </Animated.View>
    </Animated.View>
  );
}

function SplashTickerCoalesce({ onFinish }: { onFinish: () => void }) {
  const tickerFade = useSharedValue(1);
  const gridOpacity = useSharedValue(0.18);
  const markScale = useSharedValue(0.6);
  const markOpacity = useSharedValue(0);
  const wordY = useSharedValue(10);
  const wordOpacity = useSharedValue(0);
  const arOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const liveOpacity = useSharedValue(1);
  const liveDotScale = useSharedValue(1);

  useEffect(() => {
    // Live dot pulse (continuous)
    liveDotScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Ticker rows fade out: 1400ms → 2200ms
    tickerFade.value = withDelay(
      1400,
      withTiming(0, { duration: 800, easing: EASE_SMOOTH })
    );
    liveOpacity.value = withDelay(
      1400,
      withTiming(0, { duration: 600, easing: EASE_OUT })
    );

    // Grid fades: 1600ms
    gridOpacity.value = withDelay(
      1600,
      withTiming(0, { duration: 600, easing: EASE_OUT })
    );

    // Mark coalesces from blur: 1800ms
    markOpacity.value = withDelay(
      1800,
      withTiming(1, { duration: 700, easing: EASE_OUT })
    );
    markScale.value = withDelay(
      1800,
      withSequence(
        withTiming(1.04, { duration: 600, easing: EASE_OUT }),
        withTiming(1, { duration: 300, easing: EASE_OUT })
      )
    );

    // Wordmark: 2400ms
    wordOpacity.value = withDelay(2400, withTiming(1, { duration: 500, easing: EASE_OUT }));
    wordY.value = withDelay(2400, withTiming(0, { duration: 600, easing: EASE_OUT }));

    // Arabic: 2800ms
    arOpacity.value = withDelay(2800, withTiming(0.55, { duration: 400, easing: EASE_OUT }));

    // Tag: 3200ms
    tagOpacity.value = withDelay(3200, withTiming(1, { duration: 400, easing: EASE_OUT }));

    const timer = setTimeout(() => onFinish(), 4500);
    return () => clearTimeout(timer);
  }, []);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: markScale.value }],
    opacity: markOpacity.value,
  }));

  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wordY.value }],
    opacity: wordOpacity.value,
  }));

  const arStyle = useAnimatedStyle(() => ({
    opacity: arOpacity.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
  }));

  const gridStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
  }));

  const liveStyle = useAnimatedStyle(() => ({
    opacity: liveOpacity.value,
  }));

  return (
    <View style={[s.container, { backgroundColor: "#060B19" }]}>
      {/* Faint grid */}
      <Animated.View style={[StyleSheet.absoluteFill, gridStyle]}>
        <Svg width={SW} height={SH}>
          <Defs>
            <Pattern id="t3-grid" width={40} height={40} patternUnits="userSpaceOnUse">
              <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth={0.4} />
            </Pattern>
          </Defs>
          <Rect width={SW} height={SH} fill="url(#t3-grid)" />
        </Svg>
      </Animated.View>

      {/* Ticker rows */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: "center", gap: 32 },
        ]}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <TickerRow key={idx} rowIndex={idx} fadeOpacity={tickerFade} />
        ))}
      </View>

      {/* Top corner brand chip — markets covered (NOT a live index value) */}
      <Animated.View style={[s.liveBar, liveStyle]}>
        <View style={s.liveLeft}>
          <Text style={s.liveText}>EGX · TADAWUL</Text>
        </View>
        <Text style={s.liveRight}>Smart Signals</Text>
      </Animated.View>

      {/* Coalesced mark + wordmark */}
      <View style={s.centerContent}>
        <Animated.View style={markStyle}>
          <Svg width={140} height={140} viewBox="0 0 64 64" fill="none">
            <Circle cx={24} cy={24} r={18} stroke={INK} strokeWidth={2.4} fill="none" />
            <Path
              d="M 37 37 L 58 58"
              stroke={INK}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <Circle cx={58} cy={58} r={4} fill={DOT} />
          </Svg>
        </Animated.View>

        <Animated.View style={[{ marginTop: 32 }, wordStyle]}>
          <Text style={[s.wordmark, { fontSize: 64, lineHeight: 74, letterSpacing: -2 }]}>
            Smart{"\n"}Signals
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginTop: 6 }, arStyle]}>
          <Text style={[s.arabic, { fontSize: 28 }]}>{"الاستثمار الذكي"}</Text>
        </Animated.View>
      </View>

      {/* Bottom tag */}
      <Animated.View style={[s.bottomTag, tagStyle]}>
        <View style={s.tagLine} />
        <Text style={s.tagText}>POWERED BY MUBASHER</Text>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Splash Screen Controller
   Reads variant index from AsyncStorage, rotates 0→1→2→0...
   ═══════════════════════════════════════════════════════════════════════ */
interface SplashAnimatedProps {
  onFinish: () => void;
}

export function SplashAnimated({ onFinish }: SplashAnimatedProps) {
  const [variant, setVariant] = React.useState<number | null>(null);
  const fadeOut = useSharedValue(1);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SPLASH_KEY);
        const current = stored ? parseInt(stored, 10) : 0;
        const validCurrent = isNaN(current) ? 0 : current % 3;
        setVariant(validCurrent);
        // Store next variant for next app launch
        const next = (validCurrent + 1) % 3;
        await AsyncStorage.setItem(SPLASH_KEY, String(next));
      } catch {
        setVariant(0);
      }
    })();
  }, []);

  const handleFinish = useCallback(() => {
    fadeOut.value = withTiming(0, { duration: 400, easing: EASE_OUT }, () => {
      runOnJS(onFinish)();
    });
  }, [onFinish]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOut.value,
  }));

  if (variant === null) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG_DARK }]}>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 999 }, containerStyle]}>
      <StatusBar barStyle="light-content" />
      {variant === 0 && <SplashDecisiveDraw onFinish={handleFinish} />}
      {variant === 1 && <SplashAurora onFinish={handleFinish} />}
      {variant === 2 && <SplashTickerCoalesce onFinish={handleFinish} />}
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reticle: {
    position: "absolute",
    top: "24%",
    alignSelf: "center",
    opacity: 0.12,
  },
  wordmark: {
    fontFamily: SERIF,
    fontSize: 76,
    lineHeight: 80,
    letterSpacing: -2.5,
    color: INK,
    fontWeight: "700",
    textAlign: "center",
  },
  arabic: {
    fontFamily: AR,
    fontWeight: "700",
    fontSize: 32,
    lineHeight: 38,
    color: INK,
    textAlign: "center",
  },
  bottomTag: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  tagLine: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tagText: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: "500",
    color: MUTED,
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // Ticker styles (variant 3)
  tickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 18,
  },
  tickerSymbol: {
    fontFamily: MONO,
    fontSize: 11,
    color: INK,
    fontWeight: "600",
  },
  tickerPrice: {
    fontFamily: MONO,
    fontSize: 11,
    color: "rgba(255,255,255,0.40)",
  },
  tickerChange: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "600",
  },
  tickerDot: {
    fontFamily: MONO,
    fontSize: 11,
    color: "rgba(255,255,255,0.18)",
  },
  // Live bar (variant 3)
  liveBar: {
    position: "absolute",
    top: 70,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 3,
  },
  liveLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDotOuter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontFamily: MONO,
    fontSize: 10,
    color: MUTED,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  liveRight: {
    fontFamily: MONO,
    fontSize: 10,
    color: MUTED,
    letterSpacing: 1.5,
  },
});

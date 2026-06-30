import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Dimensions, Platform } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { Spacing } from "@/constants/theme";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { OnboardingBackdrop } from "@/components/shared/OnboardingBackdrop";
import { OnboardingHero, type HeroInk } from "@/components/shared/OnboardingHero";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Brand-aligned LIGHT palette (tokens.css :root, blue accent) ──────────────
const ACCENT = "#0B4DD4";
const ACCENT_DEEP = "#08379B";
const INK: HeroInk = {
  primary: "#0A0E1F",
  secondary: "#2A3147",
  muted: "#6B7388",
  hairline: "#E7ECF7",
  soft: "#E9F0FF",
  track: "#DCE4F5",
  accent: ACCENT,
};

// Subtle blue-family hue drift for the soft glow behind the hero (per slide).
const GLOW = ["rgba(11,77,212,0.22)", "rgba(45,99,235,0.20)", "rgba(11,77,212,0.22)"];

const SLIDES: {
  title: { en: string; ar: string };
  body: { en: string; ar: string };
}[] = [
  {
    title: { en: "Your edge\nin the market", ar: "أفضليتك\nفي السوق" },
    body: {
      en: "Institutional-grade signals from Egypt's top market analysts, built to give you the real edge.",
      ar: "إشارات استثمارية احترافية من خبراء البورصة المصرية تساعدك على اتخاذ القرار الصحيح.",
    },
  },
  {
    title: { en: "Real signals.\nReal returns.", ar: "إشارات حقيقية\nعوائد حقيقية" },
    body: {
      en: "Buy, hold and sell calls with clear price targets, entry and exit levels, and conviction scores.",
      ar: "توصيات شراء وبيع وإمساك مع أسعار مستهدفة ومستويات دخول وخروج واضحة.",
    },
  },
  {
    title: { en: "Never miss\na move", ar: "لا تفوّت\nأي فرصة" },
    body: {
      en: "Instant alerts the moment any new signal or market update is published.",
      ar: "تنبيه فوري بمجرد صدور أي إشارة جديدة أو تحديث من محللي البورصة.",
    },
  },
];

// Hero sizing — leaves room for the floating chips to peek at the edges.
const HERO_W = Math.min(322, SCREEN_WIDTH - 84);
const HERO_H = Math.round(HERO_W * 0.72);

export default function OnboardingScreen() {
  const { language } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const df = (w: "400" | "600" | "700" | "800") => displayFontFor(isAr, w);

  const N = SLIDES.length;
  // RTL renders the pages right-to-left, so logical slide 0 sits on the far right.
  const logicalAt = (v: number) => (isAr ? N - 1 - v : v);
  const visualOf = (l: number) => (isAr ? N - 1 - l : l);
  const initialX = visualOf(0) * SCREEN_WIDTH;

  const [current, setCurrent] = useState(0); // logical index
  const scrollX = useSharedValue(initialX);
  const intro = useSharedValue(0);
  const scrollRef = useRef<any>(null);
  const didInit = useRef(false);

  useEffect(() => {
    intro.value = withDelay(120, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
  }, []);

  // RTL lands on the right-most page so slide 0 reads first. `contentOffset`
  // covers iOS; `onContentSizeChange` (below) covers Android, which ignores the
  // initial offset — guarded so it only fires once and never fights the user.
  function handleContentSize() {
    if (didInit.current) return;
    didInit.current = true;
    if (isAr) scrollRef.current?.scrollTo({ x: initialX, animated: false });
  }

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Glow colours laid out in VISUAL order so each page shows its slide's hue.
  const glowColors = [0, 1, 2].map((v) => GLOW[logicalAt(v)]);
  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.value,
      [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
      glowColors,
    ),
    opacity: 0.5 + 0.5 * intro.value,
  }));

  async function markSeen() {
    await AsyncStorage.setItem("@onboarding_done", "true");
  }
  async function finish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markSeen();
    router.replace("/login");
  }
  async function skip() {
    Haptics.selectionAsync();
    await markSeen();
    router.replace("/login");
  }
  function goVisual(v: number) {
    scrollRef.current?.scrollTo({ x: v * SCREEN_WIDTH, animated: true });
  }
  function next() {
    Haptics.selectionAsync();
    if (current < N - 1) {
      const l = current + 1;
      setCurrent(l);
      goVisual(visualOf(l));
    } else {
      finish();
    }
  }
  function goTo(l: number) {
    Haptics.selectionAsync();
    setCurrent(l);
    goVisual(visualOf(l));
  }

  const isLast = current === N - 1;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <OnboardingBackdrop animated />

      <SafeAreaView style={styles.safeArea}>
        {/* Top bar — brand lockup (leading) + skip (trailing) */}
        <Animated.View
          entering={FadeIn.duration(500).delay(120)}
          style={[styles.topBar, { flexDirection: isAr ? "row-reverse" : "row" }]}
        >
          <View style={[styles.brandLockup, { flexDirection: isAr ? "row-reverse" : "row" }]}>
            <SmartSignalsMark size={24} ink={INK.primary} accent={ACCENT} />
            <Text style={[styles.brandWord, { color: INK.primary, fontFamily: df("700") }]}>
              Smart Signals
            </Text>
          </View>
          <Pressable onPress={skip} hitSlop={12} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}>
            <Text style={[styles.skipText, { color: INK.muted, fontFamily: ff("600") }]}>
              {isAr ? "تخطي" : "Skip"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Pager + the soft accent glow that sits behind the hero band */}
        <View style={styles.pagerArea}>
          <Animated.View style={[styles.heroGlow, glowStyle]} pointerEvents="none" />

          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: initialX, y: 0 }}
            onContentSizeChange={handleContentSize}
            onMomentumScrollEnd={(e) => {
              const v = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrent(logicalAt(v));
            }}
            style={styles.scroll}
          >
            {[0, 1, 2].map((v) => {
              const logical = logicalAt(v);
              return (
                <Slide
                  key={v}
                  logical={logical}
                  visualIndex={v}
                  scrollX={scrollX}
                  intro={intro}
                  isAr={isAr}
                  ff={ff}
                  df={df}
                />
              );
            })}
          </Animated.ScrollView>
        </View>

        {/* Bottom controls */}
        <Animated.View entering={FadeInDown.duration(560).delay(220)} style={styles.bottom}>
          {/* Progress segments */}
          <View style={[styles.dotsRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
            {SLIDES.map((_, i) => (
              <Pressable key={i} hitSlop={10} onPress={() => goTo(i)}>
                <ProgressDot active={i === current} accent={ACCENT} track={INK.track} />
              </Pressable>
            ))}
          </View>

          {/* Primary CTA */}
          <Pressable
            onPress={next}
            style={({ pressed }) => [styles.ctaBtn, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_DEEP]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.ctaGradient, { flexDirection: isAr ? "row-reverse" : "row" }]}
            >
              <Text style={[styles.ctaText, { fontFamily: ff("700") }]}>
                {isLast ? (isAr ? "ابدأ الآن" : "Get Started") : isAr ? "التالي" : "Next"}
              </Text>
              <Ionicons
                name={isLast ? (isAr ? "arrow-back" : "arrow-forward") : isAr ? "chevron-back" : "chevron-forward"}
                size={18}
                color="#FFFFFF"
                style={{ marginHorizontal: 6 }}
              />
            </LinearGradient>
          </Pressable>

          {/* Sign in */}
          <Pressable
            onPress={async () => {
              Haptics.selectionAsync();
              await markSeen();
              router.replace("/login");
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.signInRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.signInText, { color: INK.muted, fontFamily: ff("400") }]}>
              {isAr ? "لديك حساب بالفعل؟ " : "Already have an account? "}
              <Text style={{ color: ACCENT, fontFamily: ff("700") }}>
                {isAr ? "تسجيل الدخول" : "Sign in"}
              </Text>
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ── Progress dot — width springs between 7 and 26 on active change ────────────
function ProgressDot({ active, accent, track }: { active: boolean; accent: string; track: string }) {
  const w = useSharedValue(active ? 26 : 7);
  useEffect(() => {
    w.value = withTiming(active ? 26 : 7, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [active]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: active ? accent : track }, style]} />;
}

// ── Slide ────────────────────────────────────────────────────────────────────
type SlideProps = {
  logical: number;
  visualIndex: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
  intro: ReturnType<typeof useSharedValue<number>>;
  isAr: boolean;
  ff: (w: "400" | "600" | "700" | "800") => string;
  df: (w: "400" | "600" | "700" | "800") => string;
};

function Slide({ logical, visualIndex, scrollX, intro, isAr, ff, df }: SlideProps) {
  const item = SLIDES[logical];
  const inR = [(visualIndex - 1) * SCREEN_WIDTH, visualIndex * SCREEN_WIDTH, (visualIndex + 1) * SCREEN_WIDTH];

  // Continuous motion: card breathe + shimmer sweep.
  const breathe = useSharedValue(0);
  const shimmer = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.quad) }),
      ), -1, false);
    shimmer.value = withDelay(600, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, []);

  // Hero parallax + intro (scale, rise, fade as the page centers).
  const heroStyle = useAnimatedStyle(() => {
    const p = interpolate(scrollX.value, inR, [0.84, 1, 0.84], Extrapolation.CLAMP);
    const ty = interpolate(scrollX.value, inR, [30, 0, 30], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inR, [0, 1, 0], Extrapolation.CLAMP);
    return {
      opacity: o * intro.value,
      transform: [
        { translateY: ty + (1 - intro.value) * 22 },
        { scale: p * (0.97 + 0.03 * intro.value) },
      ],
    };
  });
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 + breathe.value * 6 }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-HERO_W * 0.7, HERO_W * 0.7]) },
      { rotate: "18deg" },
    ],
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.55, 0]),
  }));

  // Text drifts at its own rate (parallax depth) + intro.
  const copyStyle = useAnimatedStyle(() => {
    const tx = interpolate(scrollX.value, inR, [SCREEN_WIDTH * 0.16, 0, -SCREEN_WIDTH * 0.16], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inR, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: o * intro.value, transform: [{ translateX: tx }, { translateY: (1 - intro.value) * 16 }] };
  });

  const align = isAr ? "flex-end" : "flex-start";
  const textAlign = isAr ? "right" : "left";

  return (
    <View style={styles.slide}>
      {/* Hero band */}
      <View style={styles.heroZone}>
        <Animated.View style={heroStyle}>
          <Animated.View style={[styles.heroCard, { borderColor: INK.hairline }, breatheStyle]}>
            <OnboardingHero index={logical} isAr={isAr} ink={INK} width={HERO_W} />
            {/* Shimmer sweep */}
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.85)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        </Animated.View>

      </View>

      {/* Copy */}
      <Animated.View style={[styles.copy, copyStyle, { alignItems: align }]}>
        <Text
          style={[
            styles.title,
            {
              color: INK.primary,
              fontFamily: df("800"),
              textAlign,
              writingDirection: isAr ? "rtl" : "ltr",
              letterSpacing: isAr ? 0 : -1.1,
              lineHeight: isAr ? 50 : 44,
            },
          ]}
        >
          {isAr ? item.title.ar : item.title.en}
        </Text>

        <View style={[styles.titleRule, { backgroundColor: ACCENT, alignSelf: align }]} />

        <Text
          style={[
            styles.body,
            {
              color: INK.secondary,
              fontFamily: ff("400"),
              textAlign,
              writingDirection: isAr ? "rtl" : "ltr",
              lineHeight: isAr ? 30 : 26,
            },
          ]}
        >
          {isAr ? item.body.ar : item.body.en}
        </Text>
      </Animated.View>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFCFF" },
  safeArea: { flex: 1 },

  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[2],
  },
  brandLockup: { alignItems: "center", gap: 8 },
  brandWord: { fontSize: 16, letterSpacing: -0.2 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  skipText: { fontSize: 13 },

  pagerArea: { flex: 1 },
  heroGlow: {
    position: "absolute",
    alignSelf: "center",
    top: "12%",
    width: HERO_W * 1.15,
    height: HERO_W * 1.15,
    borderRadius: 999,
    ...(Platform.OS === "ios" ? { filter: "blur(70px)" } : { opacity: 0.4 }),
  },
  scroll: { flex: 1 },

  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: Spacing[6],
    justifyContent: "center",
  },
  heroZone: {
    height: HERO_H + 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[6],
  },
  heroCard: {
    width: HERO_W,
    height: HERO_H,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#0B2A5A", shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.14, shadowRadius: 26 },
      android: { elevation: 9 },
    }),
  },
  shimmer: { position: "absolute", top: -40, bottom: -40, width: 70 },

  copy: { gap: 0 },
  title: { fontSize: 38, marginBottom: Spacing[4] },
  titleRule: { width: 46, height: 4, borderRadius: 2, marginBottom: Spacing[4], opacity: 0.95 },
  body: { fontSize: 16, maxWidth: 360 },

  bottom: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    gap: Spacing[5],
  },
  dotsRow: { justifyContent: "center", alignItems: "center", gap: 7 },
  dot: { height: 7, borderRadius: 4 },

  ctaBtn: {
    borderRadius: 18,
    overflow: "hidden",
    height: 58,
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.34, shadowRadius: 18 },
      android: { elevation: 10 },
    }),
  },
  ctaGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 16, letterSpacing: 0.2 },

  signInRow: { alignItems: "center", paddingVertical: Spacing[1] },
  signInText: { fontSize: 14, lineHeight: 20 },
});

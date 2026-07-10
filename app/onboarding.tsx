import { useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { Text } from "@/components/shared/AppText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { buildOnboardingHtml } from "@/lib/onboarding/html";

/**
 * Premium 3D onboarding — a full-bleed WebView hosting a self-contained
 * HTML + Three.js stage (see lib/onboarding/html.ts). Ported from the
 * Smart Invest onboarding and re-branded to the SmartSignals blue palette.
 *
 * The gate contract is unchanged: `@onboarding_done` is written only when the
 * user leaves this screen (Skip / Get Started), and auth state stays separate
 * (see app/index.tsx). The WebView reports back via postMessage JSON:
 *   {"t":"haptic"} — slide changed        → selection haptic
 *   {"t":"done"}   — Get Started pressed  → mark seen, go to /login
 *   {"t":"skip"}   — Skip pressed         → mark seen, go to /login
 */

const STAGE_BG = "#02060F";
const ACCENT = "#0B4DD4";
const ACCENT_LIGHT = "#4D8EF8";

export default function OnboardingScreen() {
  const { language } = useTheme();
  const insets = useSafeAreaInsets();
  const isAr = language === "ar";
  const [webviewFailed, setWebviewFailed] = useState(false);

  const html = useMemo(
    () => buildOnboardingHtml({ isAr, topInset: insets.top, bottomInset: insets.bottom }),
    [isAr, insets.top, insets.bottom],
  );

  async function markSeen() {
    await AsyncStorage.setItem("@onboarding_done", "true");
  }
  async function finish(kind: "done" | "skip") {
    if (kind === "done") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.selectionAsync();
    }
    await markSeen();
    router.replace("/login");
  }

  function onMessage(event: { nativeEvent: { data: string } }) {
    let msg: { t?: string } = {};
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.t === "haptic") Haptics.selectionAsync();
    else if (msg.t === "done") finish("done");
    else if (msg.t === "skip") finish("skip");
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {webviewFailed ? (
        <FallbackOnboarding isAr={isAr} bottomInset={insets.bottom} onDone={() => finish("done")} />
      ) : (
        <WebView
          key={isAr ? "ar" : "en"}
          source={{ html }}
          originWhitelist={["*"]}
          style={styles.webview}
          // Self-contained document — block any outbound navigation.
          onShouldStartLoadWithRequest={(req) =>
            req.url === "about:blank" || req.url.startsWith("data:") || req.url.startsWith("about:")
          }
          onMessage={onMessage}
          onError={() => setWebviewFailed(true)}
          onRenderProcessGone={() => setWebviewFailed(true)}
          onContentProcessDidTerminate={() => setWebviewFailed(true)}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          hideKeyboardAccessoryView
          accessibilityLabel={isAr ? "شاشة التعريف بالتطبيق" : "App introduction"}
        />
      )}
    </View>
  );
}

/**
 * Native fallback — shown only if the WebView process dies or fails to load,
 * so a first-run user is never stuck before login. Same palette, no 3D.
 */
function FallbackOnboarding({
  isAr,
  bottomInset,
  onDone,
}: {
  isAr: boolean;
  bottomInset: number;
  onDone: () => void;
}) {
  return (
    <View style={styles.fallbackRoot}>
      <View style={styles.fallbackCopy}>
        <Text
          style={[
            styles.fallbackTitle,
            { fontFamily: displayFontFor(isAr, "800"), textAlign: isAr ? "right" : "left" },
          ]}
        >
          {isAr ? "رؤية أوضح\nللسوق" : "A Clearer View\nof the Market"}
        </Text>
        <Text
          style={[
            styles.fallbackBody,
            { fontFamily: fontFamilyFor(isAr, "400"), textAlign: isAr ? "right" : "left" },
          ]}
        >
          {isAr
            ? "إشارات استثمارية احترافية من نخبة المحللين تساعدك على فهم الفرص واتخاذ قرارات أكثر وعيًا."
            : "Professional signals from elite market analysts to help you read opportunities and make more informed decisions."}
        </Text>
      </View>
      <Pressable
        onPress={onDone}
        style={({ pressed }) => [
          styles.fallbackBtn,
          { marginBottom: bottomInset + 34, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={[ACCENT_LIGHT, ACCENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fallbackBtnInner}
        >
          <Text style={[styles.fallbackBtnText, { fontFamily: fontFamilyFor(isAr, "700") }]}>
            {isAr ? "ابدأ الآن" : "Get Started"}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: STAGE_BG },
  webview: { flex: 1, backgroundColor: STAGE_BG },

  fallbackRoot: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 30 },
  fallbackCopy: { marginBottom: 40 },
  fallbackTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 38, marginBottom: 13 },
  fallbackBody: { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 23, maxWidth: 310 },
  fallbackBtn: { borderRadius: 100, overflow: "hidden" },
  fallbackBtnInner: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  fallbackBtnText: { color: "#FFFFFF", fontSize: 15 },
});

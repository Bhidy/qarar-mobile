import { Component, createContext, useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode, ErrorInfo } from "react";

// Signals to child screens (specifically /biometric) that the animated splash has
// cleared and it is safe to prompt Face ID / Touch ID.
export const SplashContext = createContext(false);
import { Stack, router, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "@/components/shared/AppText";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import {
  useFonts,
  Sora_400Regular, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { ThemeProvider, useColors, useTheme } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/hooks/useData";
import { MarketplaceProvider } from "@/context/MarketplaceContext";
import { registerPushToken } from "@/lib/supabase";
import { resolveNotificationPath } from "@/lib/notif-route";
import { SplashAnimated } from "@/components/shared/SplashAnimated";
import { AppLock } from "@/components/shared/AppLock";
import { OTAUpdates } from "@/components/shared/OTAUpdates";

SplashScreen.preventAutoHideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Deep-link a tapped notification to the EXACT content it references. The web push
// builders always send a canonical `url` in `data`; resolveNotificationPath maps
// every type (news, technical articles, reports, stocks, calls, updates) — with
// back-compat fallbacks — to an in-app route. We route through one resolver so the
// behaviour can never drift between push taps and the in-app Inbox.
function routeFromNotification(resp: Notifications.NotificationResponse | null | undefined) {
  const data: any = resp?.notification?.request?.content?.data;
  if (!data) return;
  try {
    // Unresolvable → the Inbox (the full notifications list), NEVER the home tab.
    const path = resolveNotificationPath(data) ?? "/tabs/inbox";
    router.push(path as any);
  } catch (e) {
    console.warn("[notif route] failed:", e);
  }
}

// ── Error boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error?: Error }

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{this.state.error?.message ?? "Unknown error"}</Text>
          <Pressable style={eb.btn} onPress={() => this.setState({ hasError: false })}>
            <Text style={eb.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1F", alignItems: "center", justifyContent: "center", padding: 32 },
  title:     { color: "#E4615A", fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  msg:       { color: "#B6BCC7", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 32 },
  btn:       { backgroundColor: "#4D8EF8", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  btnText:   { color: "#fff", fontSize: 15, fontWeight: "600" },
});

// ── Inner layout (needs theme context) ───────────────────────────────────────
function AppLayout() {
  const C = useColors();
  const { isDark } = useTheme();
  const notifListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);
  // Stores the cold-start notification route until the navigator is ready.
  const pendingRoute = useRef<string | null>(null);
  // useRootNavigationState().key becomes defined once the Stack has finished
  // its initial navigation — the earliest safe moment to call router.push().
  const navState = useRootNavigationState();

  // Fire the pending cold-start route as soon as the navigator is ready.
  useEffect(() => {
    if (!navState?.key || !pendingRoute.current) return;
    router.push(pendingRoute.current as any);
    pendingRoute.current = null;
  }, [navState?.key]);

  // Keep the entire app locked to portrait. iOS Info.plist now also allows
  // landscape (so the live chart can rotate), so without this global lock every
  // screen would be free to rotate. The live-chart modal is the ONLY surface that
  // opts into landscape — it restores PORTRAIT_UP on close. Fire-and-forget; the
  // module is a no-op on platforms/devices that can't change orientation.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    // SplashScreen is hidden by RootLayout after fonts load

    // Register for notifications
    registerForPushNotifications();

    notifListener.current = Notifications.addNotificationReceivedListener(n => {
      console.log("[Notification received]", n.request.content.title);
    });
    // Tapped while app is running (foreground/background) → deep-link to the target.
    // The navigator is already mounted in these cases, so router.push is safe.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(routeFromNotification);

    // Cold start: app was launched by tapping a notification.
    // Store the target route now; the navState effect above fires it once
    // the Stack navigator is mounted and its initial navigation is complete.
    // (setTimeout(800) was unreliable — fonts can take >800ms on first install.)
    Notifications.getLastNotificationResponseAsync().then(resp => {
      if (!resp) return;
      const data: any = resp.notification.request.content.data;
      const path = resolveNotificationPath(data) ?? "/tabs/inbox";
      pendingRoute.current = path;
    });

    return () => {
      // expo-notifications removed the module-level removeNotificationSubscription;
      // the subscription object's own .remove() is the current, stable API.
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg.base },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="tabs" options={{ animation: "none" }} />
        <Stack.Screen name="article/[id]" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="stock/[ticker]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="news/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="news/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="articles/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="search" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="profile" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="login" options={{ animation: "fade", gestureEnabled: false, headerShown: false }} />
        <Stack.Screen name="biometric" options={{ animation: "fade", gestureEnabled: false, headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false, headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ animation: "slide_from_right", headerShown: false }} />
        {/* Analyst Marketplace — bundle subscriptions (frontend demo, flag-gated entry) */}
        <Stack.Screen name="marketplace/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="marketplace/analysts" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="marketplace/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="marketplace/checkout" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="marketplace/subscription" options={{ animation: "slide_from_right" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[Notifications] permission denied:", finalStatus);
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("smartsignals", {
        name: "Smart Signals Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4D8EF8",
      });
    }

    // ── Expo push token (cross-platform: iOS→APNs, Android→FCM) ───────────────
    // One token format for BOTH stores. Expo's push service relays each message
    // to APNs (iOS) or FCM (Android) using credentials uploaded to EAS:
    //   • iOS:     APNs key (.p8) in EAS credentials
    //   • Android: FCM V1 service-account JSON in EAS credentials + google-services.json in the build
    // The stored platform column is metadata; the backend routes by token format.
    let registered = false;
    try {
      const projectId =
        (Constants.expoConfig?.extra as any)?.eas?.projectId ??
        process.env.EXPO_PUBLIC_PROJECT_ID;
      const expoPush = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      if (expoPush?.data) {
        const tokenStr = expoPush.data;
        console.log("[Notifications] Expo push token registered:", Platform.OS, tokenStr.slice(0, 24) + "…");
        await registerPushToken(tokenStr, Platform.OS);
        registered = true;
      }
    } catch (devErr: any) {
      console.error("[Notifications] Expo push token failed:", devErr?.message ?? devErr);
    }

    if (!registered) {
      console.error("[Notifications] FAILED to obtain Expo push token — verify EAS push credentials (APNs key for iOS, FCM V1 for Android) and the projectId in app.json extra.eas.projectId");
    }
  } catch (e: any) {
    console.error("[Notifications] setup error:", e?.message ?? e);
  }
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // English — Sora (display/headings)
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    // English — Manrope (body/UI)
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    // Arabic — IBM Plex Sans Arabic
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native splash as soon as fonts are loaded —
    // our custom animated splash takes over from here.
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <MarketplaceProvider>
            <SplashContext.Provider value={!showSplash}>
              <AppLayout />
              {/* AppLock handles background re-lock only. Cold-start auth is handled
                  by the /biometric route (app/biometric.tsx) so home never loads
                  before the user authenticates. */}
              <AppLock active={!showSplash} />
              {/* Background OTA update runner — checks/downloads JS bundles, applies on
                  next cold start. Never blocks startup, never interrupts a session. */}
              <OTAUpdates />
              {showSplash && <SplashAnimated onFinish={handleSplashFinish} />}
            </SplashContext.Provider>
            </MarketplaceProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

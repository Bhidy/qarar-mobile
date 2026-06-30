/**
 * AppLock — background re-lock only.
 *
 * Cold-start biometric auth is handled by the /biometric route (app/biometric.tsx),
 * which ensures the home tab never mounts before Face ID succeeds.
 *
 * This component's sole job is to detect when the app returns from background
 * after LOCK_AFTER_BACKGROUND_MS and re-prompt biometric as a full-screen overlay.
 * It plays no role on cold start.
 */
import { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, AppState } from "react-native";
import { Text } from "@/components/shared/AppText";
import { StatusBar } from "expo-status-bar";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { AuroraBackground } from "@/components/shared/AuroraBackground";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";

// Grace period — quick app switches (e.g. copying a 2FA code) don't re-lock.
const LOCK_AFTER_BACKGROUND_MS = 30_000;

export function AppLock({ active }: { active: boolean }) {
  const { session } = useAuth();
  const pathname = usePathname();
  // Start unlocked — cold start goes through /biometric, not this overlay.
  const [locked, setLocked] = useState(false);
  const bgAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        if (bgAt.current == null) bgAt.current = Date.now();
      } else if (state === "active") {
        const elapsed = bgAt.current != null ? Date.now() - bgAt.current : 0;
        bgAt.current = null;
        if (session && elapsed > LOCK_AFTER_BACKGROUND_MS) {
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, [session]);

  // Reset lock when session is lost (signed out elsewhere).
  useEffect(() => {
    if (!session) setLocked(false);
  }, [session]);

  if (!active) return null;
  // /biometric is already a full-screen auth gate — never overlay on top of it.
  if (pathname === "/biometric") return null;
  if (!session || !locked) return null;

  return <LockScreen onUnlock={() => setLocked(false)} />;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { signOut } = useAuth();
  const { language } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const df = (w: "400" | "600" | "700" | "800") => displayFontFor(isAr, w);
  const T = (en: string, ar: string) => (isAr ? ar : en);

  const [bioType, setBioType] = useState<"faceID" | "touchID" | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);

  async function authenticate() {
    setBusy(true);
    setFailed(false);
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHw || !enrolled) {
        await signOut();
        router.replace("/login");
        return;
      }
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBioType(
        types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          ? "faceID"
          : "touchID"
      );
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: T("Unlock Smart Signals", "افتح Smart Signals"),
        cancelLabel: T("Cancel", "إلغاء"),
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function usePassword() {
    await signOut();
    router.replace("/login");
  }

  useEffect(() => {
    authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon = bioType === "touchID" ? "finger-print" : "scan";
  const label =
    bioType === "touchID"
      ? T("Unlock with Touch ID", "افتح ببصمة الإصبع")
      : T("Unlock with Face ID", "افتح بـ Face ID");

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AuroraBackground variant="blue" animated={false} />
      <View style={styles.center}>
        <View style={styles.markTile}>
          <SmartSignalsMark size={40} ink="#FFFFFF" accent="#4D8EF8" />
        </View>
        <Text style={[styles.title, { fontFamily: df("800") }]}>Smart Signals</Text>
        <Text style={[styles.subtitle, { fontFamily: ff("400") }]}>
          {T("Locked for your security", "مقفل لحمايتك")}
        </Text>

        <Pressable
          onPress={authenticate}
          disabled={busy}
          style={({ pressed }) => [styles.bioBtn, { opacity: busy ? 0.85 : pressed ? 0.92 : 1 }]}
        >
          <Ionicons name={icon as any} size={22} color="#fff" />
          <Text style={[styles.bioText, { fontFamily: ff("700") }]}>
            {busy ? T("Authenticating…", "جارٍ التحقق…") : label}
          </Text>
        </Pressable>

        {failed && (
          <Text style={[styles.failed, { fontFamily: ff("500") }]}>
            {T("Authentication failed — tap to try again.", "فشل التحقق — اضغط للمحاولة مجددًا.")}
          </Text>
        )}

        <Pressable onPress={usePassword} hitSlop={10} style={styles.altRow}>
          <Text style={[styles.altText, { fontFamily: ff("600") }]}>
            {T("Sign in with password instead", "تسجيل الدخول بكلمة المرور بدلاً من ذلك")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#030B1E", zIndex: 1000,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  markTile: {
    width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 10,
  },
  title: { fontSize: 26, color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.62)", marginBottom: 20 },
  bioBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    height: 56, paddingHorizontal: 30, borderRadius: 16, backgroundColor: "#4D8EF8", marginTop: 4,
  },
  bioText: { color: "#FFFFFF", fontSize: 16 },
  failed: { color: "#F09591", fontSize: 13, marginTop: 8, textAlign: "center" },
  altRow: { marginTop: 22 },
  altText: { color: "rgba(255,255,255,0.70)", fontSize: 14 },
});

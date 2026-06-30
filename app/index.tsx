import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { AuroraBackground } from "@/components/shared/AuroraBackground";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";

/**
 * Root gate. Resolves the app's entry route from two INDEPENDENT facts:
 *
 *   1. `@onboarding_done`  — has the user ever seen the 3 intro slides?
 *                            (set once, first install only — never repeats)
 *   2. auth `session`      — is the user signed in? (the REAL access gate)
 *
 * Route table:
 *   not onboarded            → /onboarding   (slides, shown once)
 *   onboarded, no session    → /login        (always reachable when logged out)
 *   onboarded, has session   → /tabs
 *
 * The previous build conflated these — onboarding set the flag *before* login, so
 * once anyone passed the slides they were sent to /tabs forever and the auth screen
 * became unreachable. Splitting the two facts is what makes login/register reliable.
 */
export default function Index() {
  const { session, loading } = useAuth();
  const [storageReady, setStorageReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@onboarding_done")
      .then((val) => {
        setOnboardingDone(!!val);
        setStorageReady(true);
      })
      .catch(() => {
        // If storage fails, treat as a first install → show onboarding.
        setOnboardingDone(false);
        setStorageReady(true);
      });
  }, []);

  // Wait until BOTH the auth session and the onboarding flag are resolved, so we
  // never flash the wrong screen (e.g. login → tabs) on a cold start.
  if (loading || !storageReady) {
    return (
      <View style={styles.root}>
        <AuroraBackground variant="blue" animated={false} />
        <View style={styles.center}>
          <SmartSignalsMark size={56} ink="#EDEEF3" accent="#4D8EF8" />
          <ActivityIndicator color="#4D8EF8" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/login" />;
  // Existing session → biometric gate first; home only loads after Face ID succeeds.
  return <Redirect href="/biometric" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080F" },
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
});

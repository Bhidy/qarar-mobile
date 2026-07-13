/**
 * OAuth deep-link landing route — rumblepro://auth/callback.
 *
 * On iOS the Google flow completes inside openAuthSessionAsync (login screen),
 * so this route normally never mounts. On Android the OS can ALSO deliver the
 * redirect as a real deep link into expo-router — without this route that
 * delivery would dead-end on +not-found mid sign-in. The exchange is
 * idempotent (exchangeAuthCode guards single-use codes), so both paths racing
 * is safe: first one wins, the second is a no-op that just routes forward.
 */
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { exchangeAuthCode, useAuth } from "@/context/AuthContext";

export default function AuthCallbackRoute() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const { session } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const code = typeof params.code === "string" ? params.code : undefined;
      const oauthError = (params.error_description ?? params.error) as string | undefined;

      if (oauthError || !code) {
        // Cancelled/failed provider leg. Forward the reason so the login screen
        // can surface it via localizeAuthError — on the Android pure-deep-link
        // path the login screen's own browser promise never ran, so without
        // this the failure would be silent. A bare cancel carries no message.
        if (mounted) router.replace(oauthError ? { pathname: "/login", params: { authError: oauthError } } : "/login");
        return;
      }
      const result = await exchangeAuthCode(code);
      if (!mounted) return;
      if (result.error) {
        router.replace({ pathname: "/login", params: { authError: result.error } });
        return;
      }
      // Success (or already exchanged by the login screen's browser promise).
      await AsyncStorage.setItem("@onboarding_done", "true").catch(() => {});
      router.replace("/tabs");
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  useEffect(() => {
    // Belt-and-braces: if a session materialises (other race leg won), move on.
    if (session) router.replace("/tabs");
  }, [session]);

  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color="#0B4DD4" />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
});

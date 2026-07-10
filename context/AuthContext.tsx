/**
 * Mobile auth state (SmartSignals).
 * Supabase Auth — email + password + 6-digit email OTP ONLY. No third-party /
 * social login (Google, Apple) is offered, so App Store Guideline 4.8 (which
 * only mandates Sign in with Apple when other social logins exist) does not
 * apply. The app is a fully-free product: every registered user has complete
 * access. There is no subscription, payment, entitlement, or in-app-purchase
 * layer — access is simply "signed in or not".
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, SUPABASE_AUTH_STORAGE_KEY } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { WEB_BASE } from "@/constants/site";

/**
 * Biometric session vault — lets "Sign in with Face ID / Touch ID" work AFTER an
 * explicit sign-out (previously signOut() destroyed the Supabase session, so the
 * login screen's biometric button always dead-ended on "session expired").
 *
 * SECURITY ENVELOPE: the vault stores ONLY the Supabase refresh token, JSON-
 * wrapped, in AsyncStorage — the SAME storage supabase-js itself uses to persist
 * the full session (access + refresh tokens) on React Native. Keeping one more
 * refresh token there is therefore security-EQUIVALENT to the signed-in state
 * that already lives on the device; it does not widen the threat model. Refresh
 * tokens are single-use: restoreBiometricSession() rotates the stored token on
 * every successful refresh, and any failed refresh purges the vault. An upgrade
 * to expo-secure-store (iOS Keychain / Android Keystore) rides the NEXT NATIVE
 * TRAIN — it cannot ship OTA because that native module is not in the current
 * binary.
 */
const BIO_SESSION_KEY = "@bio_session_v1";
const BIO_ENABLED_KEY = "@biometric_enabled";

interface AuthValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accessToken: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** Rebuild a session from the biometric vault (post-sign-out Face ID login). */
  restoreBiometricSession: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  /** Step 2 of the OTP reset flow — verifies the emailed code, opens a recovery session. */
  verifyResetOtp: (email: string, token: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ error?: string }>;
  updateFullName: (name: string) => Promise<{ error?: string }>;
  updatePhone: (phone: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue>({
  user: null, session: null, loading: true, accessToken: null,
  signInWithPassword: async () => ({}),
  signUp: async () => ({}), sendOtp: async () => ({}),
  verifyOtp: async () => ({}), signOut: async () => {},
  restoreBiometricSession: async () => ({}),
  resetPassword: async () => ({}), verifyResetOtp: async () => ({}), updatePassword: async () => ({}),
  updateEmail: async () => ({}), updateFullName: async () => ({}), updatePhone: async () => ({}),
  deleteAccount: async () => ({}),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { bindPhotoToUser, setPhotoUri } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session); setUser(data.session?.user ?? null);
      tokenRef.current = data.session?.access_token ?? null;
      setLoading(false);
      // Bind photo cache to this user; server avatar always wins on hydrate.
      bindPhotoToUser(data.session?.user?.id ?? null);
      const serverAvatar = (data.session?.user?.user_metadata?.avatar_url as string | undefined) ?? null;
      if (serverAvatar) setPhotoUri(serverAvatar);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s); setUser(s?.user ?? null);
      tokenRef.current = s?.access_token ?? null;
      // Rebind on every auth transition. SIGNED_OUT → null → photo cleared so the
      // next user on this device cannot inherit the previous user's avatar.
      bindPhotoToUser(s?.user?.id ?? null);
      if (s?.user) {
        const nextAvatar = (s.user.user_metadata?.avatar_url as string | undefined) ?? null;
        setPhotoUri(nextAvatar);
      }
      // Biometric vault refresh: after a normal sign-in (and on token rotation,
      // since Supabase invalidates the previous refresh token) keep the vault
      // holding a CURRENT refresh token — but only while biometric is enabled.
      if ((evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") && s?.refresh_token) {
        AsyncStorage.getItem(BIO_ENABLED_KEY)
          .then((v) => {
            if (v === "true") {
              return AsyncStorage.setItem(BIO_SESSION_KEY, JSON.stringify({ refresh_token: s.refresh_token }));
            }
          })
          .catch(() => { /* vault is best-effort */ });
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [bindPhotoToUser, setPhotoUri]);

  const err = (e: any) => ({ error: e?.message || "Something went wrong" });

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) supabase.auth.startAutoRefresh(); // in case a soft sign-out stopped it
    return error ? err(error) : {};
  }, []);
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signUp({ email, password, options: { data: fullName ? { full_name: fullName } : undefined } });
    return error ? err(error) : {};
  }, []);
  const sendOtp = useCallback(async (email: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? err(error) : {};
  }, []);
  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    return error ? err(error) : {};
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // BIOMETRIC SOFT SIGN-OUT (build-99 field fix, 2026-07-10): calling the
    // server /logout — even with scope:"local" — revokes the current session's
    // refresh token, which killed the vault the instant it was written (proven
    // E2E: "Invalid Refresh Token: Refresh Token Not Found"). With Face ID
    // enabled we therefore LOCK LOCALLY ONLY: vault the refresh token, stop
    // the background refresh timer (nothing may rotate the vaulted token),
    // wipe the persisted session, and drop the in-app auth state. The server
    // session stays alive strictly for biometric restore — reaching it again
    // requires the device owner's Face ID / Touch ID. Full server sign-out
    // still happens whenever biometrics are off.
    try {
      const bioEnabled = (await AsyncStorage.getItem(BIO_ENABLED_KEY)) === "true";
      if (bioEnabled) {
        const { data } = await supabase.auth.getSession();
        const rt = data.session?.refresh_token;
        if (rt) {
          await AsyncStorage.setItem(BIO_SESSION_KEY, JSON.stringify({ refresh_token: rt }));
          supabase.auth.stopAutoRefresh();
          await AsyncStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
          // No SIGNED_OUT event fires (no client call) — clear our state manually,
          // mirroring the onAuthStateChange cleanup path.
          setSession(null); setUser(null); tokenRef.current = null;
          bindPhotoToUser(null);
          return;
        }
      }
    } catch { /* fall through to the full sign-out */ }
    await supabase.auth.signOut();
  }, [bindPhotoToUser]);

  /**
   * Restore a session from the biometric vault (called by login.tsx AFTER a
   * successful Face ID / Touch ID prompt when no in-memory session exists).
   * Rotation: Supabase refresh tokens are single-use, so the NEW session's
   * refresh token is re-vaulted immediately on success. Any failure purges the
   * vault so a dead token can never be retried.
   */
  const restoreBiometricSession = useCallback(async (): Promise<{ error?: string }> => {
    if (!supabase) return { error: "Auth not configured" };
    try {
      const raw = await AsyncStorage.getItem(BIO_SESSION_KEY);
      const rt: string | undefined = raw ? JSON.parse(raw)?.refresh_token : undefined;
      if (!rt) return { error: "No saved session" };
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: rt });
      if (error || !data.session) {
        await AsyncStorage.removeItem(BIO_SESSION_KEY).catch(() => {});
        return { error: error?.message || "Session expired" };
      }
      await AsyncStorage.setItem(BIO_SESSION_KEY, JSON.stringify({ refresh_token: data.session.refresh_token }));
      supabase.auth.startAutoRefresh(); // soft sign-out stopped the refresh timer
      return {};
    } catch (e: any) {
      await AsyncStorage.removeItem(BIO_SESSION_KEY).catch(() => {});
      return { error: e?.message || "Session restore failed" };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Prefer the web endpoint: branded Sender.net email carrying the 6-digit
    // OTP (same flow as the website, plus captcha/throttle protections).
    // Falls back to Supabase's own recovery email — whose template also
    // carries the code — if the site is unreachable.
    try {
      const res = await fetch(`${WEB_BASE}/api/auth/send-reset-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) return {};
    } catch { /* network — fall through to Supabase direct */ }
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return error ? err(error) : {};
  }, []);

  /** Step 2 of the OTP reset flow — verifies the emailed code, opens a recovery session. */
  const verifyResetOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
    if (!error) supabase.auth.startAutoRefresh(); // in case a soft sign-out stopped it
    return error ? err(error) : {};
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? err(error) : {};
  }, []);

  const updateEmail = useCallback(async (newEmail: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return error ? err(error) : {};
  }, []);

  const updateFullName = useCallback(async (name: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    return error ? err(error) : {};
  }, []);

  // Mobile Number — parity with web Personal Info (stored in user_metadata.phone).
  const updatePhone = useCallback(async (phone: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.updateUser({ data: { phone } });
    return error ? err(error) : {};
  }, []);

  const deleteAccount = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return { error: "Not signed in" };
    try {
      const res = await fetch(`${WEB_BASE}/api/auth/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return { error: (j as any).error || "Failed to delete account" };
      }
      // Account is gone — purge the biometric vault so Face ID can never try to
      // resurrect a session for a deleted user.
      await AsyncStorage.multiRemove([BIO_SESSION_KEY, BIO_ENABLED_KEY]).catch(() => {});
      await supabase!.auth.signOut();
      return {};
    } catch (e: any) {
      return { error: e?.message || "Network error" };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, accessToken: session?.access_token ?? null,
      signInWithPassword,
      signUp, sendOtp, verifyOtp, signOut, restoreBiometricSession,
      resetPassword, verifyResetOtp, updatePassword, updateEmail, updateFullName, updatePhone, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

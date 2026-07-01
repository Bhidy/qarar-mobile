/**
 * Mobile auth state (SmartSignals).
 * Supabase Auth (email OTP + password + Google OAuth PKCE). The app is a fully-free
 * product: every registered user has complete access. There is no subscription,
 * payment, entitlement, or in-app-purchase layer — access is simply "signed in or not".
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { WEB_BASE } from "@/constants/site";

// Google Sign-In — OAuth PKCE web flow (NOT the native idToken flow).
// WHY: @react-native-google-signin@16.1.2 ships GoogleSignIn-iOS 9.x, whose
// native SDK embeds a `nonce` claim in the id_token but exposes NO way to read it
// back. Supabase's signInWithIdToken then rejects with
//   "Passed nonce and nonce in id_token should either both exist or not".
// The library has zero nonce support (already on its latest version), so the native
// flow is unfixable here. The OAuth PKCE flow below sidesteps the id_token entirely:
// Supabase issues the Google auth URL → we open it in an in-app browser → Google
// redirects back to our app scheme with an auth `code` → we exchange it for a
// session. Identical on iOS + Android, and reuses the web app's proven Google config.
// The Google web client's authorized redirect already includes the Supabase
// callback; only the app-scheme redirect must be in Supabase's URI allow-list.
const OAUTH_REDIRECT = Linking.createURL("auth/callback"); // e.g. rumblepro://auth/callback

interface AuthValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accessToken: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  /** Native Sign in with Apple (iOS). Required by App Store Guideline 4.8 alongside Google. */
  signInWithApple: () => Promise<{ error?: string }>;
  /** Whether Sign in with Apple is available on this device (iOS 13+). */
  appleAuthAvailable: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ error?: string }>;
  updateFullName: (name: string) => Promise<{ error?: string }>;
  updatePhone: (phone: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue>({
  user: null, session: null, loading: true, accessToken: null,
  signInWithPassword: async () => ({}), signInWithGoogle: async () => ({}),
  signInWithApple: async () => ({}), appleAuthAvailable: false,
  signUp: async () => ({}), sendOtp: async () => ({}),
  verifyOtp: async () => ({}), signOut: async () => {},
  resetPassword: async () => ({}), updatePassword: async () => ({}),
  updateEmail: async () => ({}), updateFullName: async () => ({}), updatePhone: async () => ({}),
  deleteAccount: async () => ({}),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { bindPhotoToUser, setPhotoUri } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // Sign in with Apple is iOS 13+ only. Probe once so the UI can show the button
  // exactly where Apple requires it (and never on Android, where it's unavailable).
  useEffect(() => {
    let alive = true;
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then((ok) => { if (alive) setAppleAuthAvailable(ok); })
        .catch(() => { if (alive) setAppleAuthAvailable(false); });
    }
    return () => { alive = false; };
  }, []);

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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); setUser(s?.user ?? null);
      tokenRef.current = s?.access_token ?? null;
      // Rebind on every auth transition. SIGNED_OUT → null → photo cleared so the
      // next user on this device cannot inherit the previous user's avatar.
      bindPhotoToUser(s?.user?.id ?? null);
      if (s?.user) {
        const nextAvatar = (s.user.user_metadata?.avatar_url as string | undefined) ?? null;
        setPhotoUri(nextAvatar);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [bindPhotoToUser, setPhotoUri]);

  const err = (e: any) => ({ error: e?.message || "Something went wrong" });

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: "Auth not configured" };
    try {
      // 1) Ask Supabase for the Google authorization URL (don't auto-redirect).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: OAUTH_REDIRECT,
          skipBrowserRedirect: true,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: "Could not start Google Sign-In" };

      // 2) Open the URL in an in-app browser; it returns to OAUTH_REDIRECT on success.
      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
      if (result.type !== "success" || !result.url) {
        return { error: "" }; // user dismissed / cancelled — show nothing
      }

      // 3) Pull the PKCE auth code from the callback URL and exchange it for a session.
      const { queryParams } = Linking.parse(result.url);
      const code = (queryParams?.code as string | undefined) ?? undefined;
      const cbError = (queryParams?.error_description as string | undefined)
        ?? (queryParams?.error as string | undefined);
      if (cbError) return { error: String(cbError) };
      if (!code) return { error: "No authorization code from Google" };

      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      return exErr ? { error: exErr.message } : {};
    } catch (e: any) {
      return { error: e?.message || "Google Sign-In failed" };
    }
  }, []);

  // Native Sign in with Apple → Supabase. REQUIRED by App Store Guideline 4.8 because
  // the app also offers Google sign-in. Apple returns the identityToken directly, which we
  // hand straight to Supabase (no client nonce — see the minimal flow below).
  const signInWithApple = useCallback(async () => {
    if (!supabase) return { error: "Auth not configured" };
    if (Platform.OS !== "ios") return { error: "Apple Sign-In is only available on iOS" };
    try {
      // Native Apple sign-in → Supabase, following Supabase's official React Native example
      // exactly (no client nonce): the identityToken is obtained fresh and exchanged
      // immediately over TLS, and gotrue verifies the token signature + audience server-side.
      // Keeping the flow minimal removes the most common token-exchange failure mode.
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return { error: "No identity token from Apple" };

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        // Token exchange rejected by Supabase (aud/nonce/provider). Log the raw reason so
        // a misconfiguration is diagnosable, and surface a clear message to the user.
        console.warn("[AppleSignIn] Supabase idToken exchange failed:", error.status, error.message);
        return { error: `Apple Sign-In couldn't be verified (${error.message}). Please try again.` };
      }

      // Apple only sends the full name on the VERY FIRST authorization. Persist it so the
      // profile isn't blank (Supabase can't recover it on later sign-ins).
      const given = credential.fullName?.givenName ?? "";
      const family = credential.fullName?.familyName ?? "";
      const fullName = `${given} ${family}`.trim();
      if (fullName) {
        try { await supabase.auth.updateUser({ data: { full_name: fullName } }); } catch { /* non-fatal */ }
      }
      return {};
    } catch (e: any) {
      const code = String(e?.code ?? e?.nativeErrorCode ?? "");
      // User tapped "Cancel" in the Apple sheet — surface nothing, not an error.
      if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED" || code === "1001") {
        return { error: "" };
      }
      // Apple itself couldn't complete the authorization (it shows its own "Sign Up Not
      // Completed" alert). On a correctly-configured app this is always an Apple-Account /
      // device issue — surface the EXACT code + the real-world causes so it's diagnosable.
      const msg = e?.message ? String(e.message) : "no message";
      console.warn("[AppleSignIn] native failure:", code, msg, JSON.stringify(e ?? {}));
      return {
        error:
          `Sign in with Apple couldn't be completed (code ${code || "unknown"}: ${msg}).\n\n` +
          `This is an Apple-side error. On this device please confirm:\n` +
          `•  Signed in to iCloud (Settings › your name)\n` +
          `•  Two-Factor Authentication is ON for that Apple Account\n` +
          `•  It's a personal Apple Account — company / "Managed" Apple IDs cannot use Sign in with Apple\n` +
          `•  Date & Time = Automatic, and no VPN is active\n\n` +
          `You can also continue with email or Google.`,
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // OAuth web flow keeps no native Google session to clear — Supabase signOut is enough.
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: "Auth not configured" };
    const { error } = await supabase.auth.resetPasswordForEmail(email);
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
      await supabase!.auth.signOut();
      return {};
    } catch (e: any) {
      return { error: e?.message || "Network error" };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading, accessToken: session?.access_token ?? null,
      signInWithPassword, signInWithGoogle, signInWithApple, appleAuthAvailable,
      signUp, sendOtp, verifyOtp, signOut,
      resetPassword, updatePassword, updateEmail, updateFullName, updatePhone, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

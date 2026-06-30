/**
 * Mobile auth + subscription state (SmartSignals).
 * Supabase Auth (email OTP + password). Entitlement is the SAME unified record
 * as web — so a user who subscribed on the web (Paymob) is premium in the app
 * too. In-app purchases (RevenueCat) write the same entitlement (added with the
 * native RevenueCat build); this layer is independent of that.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { WEB_BASE } from "@/constants/site";
import { SUBSCRIPTIONS_ENABLED } from "@/constants/config";
import { configureIap, iapLogIn, iapLogOut } from "@/lib/iap";

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
  /** Effective access: while subscriptions are disabled every signed-in user is "pro". */
  premium: boolean;
  /** Whether the paid model is live. UI hides all payment surfaces when false. */
  subscriptionsEnabled: boolean;
  entitlement: any | null;
  accessToken: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ error?: string }>;
  updateFullName: (name: string) => Promise<{ error?: string }>;
  updatePhone: (phone: string) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthValue>({
  user: null, session: null, loading: true, premium: false, subscriptionsEnabled: SUBSCRIPTIONS_ENABLED, entitlement: null, accessToken: null,
  signInWithPassword: async () => ({}), signInWithGoogle: async () => ({}),
  signUp: async () => ({}), sendOtp: async () => ({}),
  verifyOtp: async () => ({}), signOut: async () => {}, refreshStatus: async () => {},
  resetPassword: async () => ({}), updatePassword: async () => ({}),
  updateEmail: async () => ({}), updateFullName: async () => ({}), updatePhone: async () => ({}),
  deleteAccount: async () => ({}),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { bindPhotoToUser, setPhotoUri } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [entitlement, setEntitlement] = useState<any | null>(null);
  const tokenRef = useRef<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) { setPremium(false); setEntitlement(null); return; }
    try {
      const res = await fetch(`${WEB_BASE}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const j = await res.json();
      setPremium(!!j.premium);
      setEntitlement(j.entitlement ?? null);
    } catch { /* offline — keep last known */ }
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    // Configure RevenueCat once (anonymous); logIn binds purchases to the user id.
    configureIap();
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session); setUser(data.session?.user ?? null);
      tokenRef.current = data.session?.access_token ?? null;
      setLoading(false);
      // Bind photo cache to this user; server avatar always wins on hydrate.
      bindPhotoToUser(data.session?.user?.id ?? null);
      const serverAvatar = (data.session?.user?.user_metadata?.avatar_url as string | undefined) ?? null;
      if (serverAvatar) setPhotoUri(serverAvatar);
      if (data.session?.user) { iapLogIn(data.session.user.id); refreshStatus(); }
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
        iapLogIn(s.user.id); refreshStatus();
      } else {
        iapLogOut(); setPremium(false); setEntitlement(null);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [refreshStatus, bindPhotoToUser, setPhotoUri]);

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

  const signOut = useCallback(async () => {
    if (!supabase) return;
    // OAuth web flow keeps no native Google session to clear — Supabase signOut is enough.
    await supabase.auth.signOut();
    setPremium(false); setEntitlement(null);
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

  // While the paid model is OFF, every signed-in (registered) user gets full "pro"
  // access — the real billing status is still fetched and kept in `premium` state, but
  // the value the app reads is forced true so nothing is gated. Flipping
  // SUBSCRIPTIONS_ENABLED back on instantly restores real entitlement-based gating.
  const effectivePremium = SUBSCRIPTIONS_ENABLED ? premium : !!session;

  return (
    <AuthContext.Provider value={{
      user, session, loading, premium: effectivePremium, subscriptionsEnabled: SUBSCRIPTIONS_ENABLED,
      entitlement, accessToken: session?.access_token ?? null,
      signInWithPassword, signInWithGoogle, signUp, sendOtp, verifyOtp, signOut, refreshStatus,
      resetPassword, updatePassword, updateEmail, updateFullName, updatePhone, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

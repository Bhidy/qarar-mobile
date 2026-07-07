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
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/context/ThemeContext";
import { WEB_BASE } from "@/constants/site";

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
  resetPassword: (email: string) => Promise<{ error?: string }>;
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
  resetPassword: async () => ({}), updatePassword: async () => ({}),
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

  const signOut = useCallback(async () => {
    if (!supabase) return;
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
      signInWithPassword,
      signUp, sendOtp, verifyOtp, signOut,
      resetPassword, updatePassword, updateEmail, updateFullName, updatePhone, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

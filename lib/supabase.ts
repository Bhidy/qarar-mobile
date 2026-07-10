/**
 * Supabase client for the SmartSignals mobile app.
 * Uses AsyncStorage for session persistence (React Native safe).
 * Falls back gracefully when env vars are not set.
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? "";
const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * supabase-js persists the session under this AsyncStorage key (its default:
 * `sb-<project-ref>-auth-token`). Exported for the biometric soft sign-out,
 * which must wipe the persisted session WITHOUT calling the server /logout
 * (any server sign-out — even scope:"local" — revokes the refresh token the
 * biometric vault depends on; proven E2E 2026-07-10).
 */
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${(supabaseUrl.match(/^https?:\/\/([^.]+)\./)?.[1]) ?? "unknown"}-auth-token`;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage:          AsyncStorage,
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: false,
        // PKCE so the native Google OAuth web flow can exchangeCodeForSession(code).
        flowType: "pkce",
      },
    })
  : null;

/**
 * Public (anon-role) client for reading BROADCAST content — analyst calls, news,
 * articles, model portfolios, notifications, price feeds. These tables are public by
 * design (their RLS grants SELECT to the `anon` role only). They MUST be read with the
 * anon key and NO user session: once a user logs in, the main `supabase` client attaches
 * the user's JWT (the `authenticated` role), which has no SELECT policy on these tables,
 * so every read returns zero rows and the entire app appears empty. This client never
 * carries a session, so content stays visible whether or not the user is signed in.
 * (The proper long-term fix is also granting `authenticated` SELECT in the DB — see
 *  setup/PENDING_MIGRATIONS.sql — but the app must not depend on that.)
 */
export const supabasePublic = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export const isSupabaseReady = !!supabase;

/** Register a push token (Expo or APNs device) so the admin can broadcast to this device */
export async function registerPushToken(token: string, platform = "expo"): Promise<void> {
  if (!supabase) {
    console.warn("[supabase] registerPushToken: Supabase not ready");
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return; // push_tokens RLS requires auth; skip for unauthenticated devices
  try {
    const { error } = await supabase
      .from("push_tokens")
      .upsert({ token, platform }, { onConflict: "token" });
    if (error) {
      console.error("[supabase] registerPushToken error:", error.message);
    } else {
      console.log("[supabase] Push token registered:", platform, token.slice(0, 20) + "…");
    }
  } catch (err: any) {
    console.error("[supabase] registerPushToken failed:", err?.message ?? err);
  }
}

// base64 → ArrayBuffer (zero-dep). React Native cannot upload a Blob/File/FormData to
// Supabase Storage — supabase-js wraps those in a Blob and RN throws "Creating blobs
// from 'ArrayBuffer'/'ArrayBufferView' are not supported". The supported RN path is to
// upload an ArrayBuffer built from the file's base64 (per @supabase/storage-js docs).
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const len = base64.length;
  let bufferLength = len * 0.75;
  if (base64[len - 1] === "=") { bufferLength--; if (base64[len - 2] === "=") bufferLength--; }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[base64.charCodeAt(i)];
    const e2 = lookup[base64.charCodeAt(i + 1)];
    const e3 = lookup[base64.charCodeAt(i + 2)];
    const e4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes.buffer;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  heic: "image/heic", heif: "image/heif", webp: "image/webp",
};

/**
 * Upload a user avatar to the 'avatars' storage bucket and return its public URL.
 * Reads the local file as base64 and uploads an ArrayBuffer — the only body type
 * Supabase Storage accepts on React Native (Blob/File/FormData fail on RN).
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: "Supabase not ready" };
  try {
    const FileSystem = await import("expo-file-system/legacy");
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: "base64" as any });
    const ext = (localUri.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "");
    const contentType = MIME_BY_EXT[ext] || "image/jpeg";
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, base64ToArrayBuffer(base64), { upsert: true, contentType });
    if (upErr) return { error: upErr.message };
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust: the storage path is stable (overwritten on each change), so without a
    // version token <Image> would keep showing the previously cached avatar.
    return { url: `${data.publicUrl}?v=${Date.now()}` };
  } catch (e: any) {
    return { error: e?.message || "Upload failed" };
  }
}

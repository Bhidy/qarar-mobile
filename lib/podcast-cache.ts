/**
 * Shared stale-while-revalidate cache for podcast data (Spotify episodes +
 * YouTube playlists). Home and the Podcast tab read the SAME keys, so the list
 * renders INSTANTLY from cache on repeat opens and we never double-fetch the
 * same endpoint across the two surfaces.
 *
 * Pattern per surface:
 *   1. getCachedJson(key)      → paint instantly from the last good payload
 *   2. fetchAndCacheJson(url,key) → revalidate in the background, repaint + persist
 *
 * Persistence is best-effort (a corrupt/missing entry just falls through to the
 * network). TTL is advisory metadata; callers always revalidate, so data is never
 * stale beyond one fetch — the cache only removes the cold-start spinner.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const PODCAST_KEYS = {
  spotify: "@podcast_spotify_v1",
  yt1: "@podcast_yt1_v1",
  yt2: "@podcast_yt2_v1",
} as const;

type Wrapped<T> = { ts: number; data: T };

/** Last good payload for `key`, or null. Never throws. */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const w = JSON.parse(raw) as Wrapped<T>;
    return (w && "data" in w ? w.data : (w as unknown as T)) ?? null;
  } catch {
    return null;
  }
}

/** Fetch JSON, persist on success, return parsed payload (or null on failure). */
export async function fetchAndCacheJson<T>(url: string, key: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = (await r.json()) as T;
    AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data } as Wrapped<T>)).catch(() => {});
    return data;
  } catch {
    return null;
  }
}

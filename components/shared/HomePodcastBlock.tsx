/**
 * HomePodcastBlock — featured inline player on Home.
 *
 * Shows the latest episode of the Mubasher show in an inline Spotify embed (the
 * blue featured card) plus a "View all" link to the dedicated /tabs/podcast
 * screen, where the full episode list lives. The list is intentionally NOT
 * duplicated here — Home stays a concise entry point and the Podcast tab owns the
 * browse experience.
 *
 * Performance: reads the SAME shared stale-while-revalidate cache as the Podcast
 * tab (lib/podcast-cache) → the card paints instantly and Home never re-fetches
 * what the Podcast tab already loaded. We still fetch the episode list only to
 * resolve the latest episode id for the featured embed.
 *
 * Playback: direct Spotify IFrame-API embed; a request guard (webviewAllowRequest)
 * blocks `spotify:`/non-http schemes so the player stays inline (no "-1002" error,
 * no app hand-off).
 */
import { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Linking, ActivityIndicator } from "react-native";
import { Text } from "@/components/shared/AppText";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { WEB_BASE } from "@/constants/site";
import { spotifyEpisodeHtml, webviewAllowRequest, SPOTIFY_BASE_URL } from "@/lib/embeds";
import { getCachedJson, fetchAndCacheJson, PODCAST_KEYS } from "@/lib/podcast-cache";

const SPOTIFY_GREEN = "#1DB954";
const SHOW_ID  = "46SZ8iPqkz18HxVHQHnu7P";
const SHOW_URL = `https://open.spotify.com/show/${SHOW_ID}`;
const SHOW_EMBED = `https://open.spotify.com/embed/show/${SHOW_ID}?utm_source=generator`;

type Episode = { id: string; name: string; duration_ms: number; release_date: string; thumbnail: string };

export function HomePodcastBlock() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  // `activeId` = the latest episode id (drives the featured embed). `episodes`
  // length is only used to distinguish the empty/failed state from real content.
  const [hasEpisodes, setHasEpisodes] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [failed, setFailed]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    // `cur ?? eps[0].id` never overwrites an existing selection → safe on every payload.
    const apply = (j: any) => {
      if (!j) return;
      const eps = ((j.episodes ?? []) as Episode[]).slice(0, 1);
      if (cancelled) return;
      setHasEpisodes(eps.length > 0);
      if (eps.length > 0) setActiveId((cur) => cur ?? eps[0].id);
    };
    (async () => {
      // 1) instant paint from the shared cache
      const cached = await getCachedJson<any>(PODCAST_KEYS.spotify);
      if (cached) { apply(cached); if (!cancelled) setLoading(false); }
      // 2) revalidate
      const fresh = await fetchAndCacheJson<any>(WEB_BASE + "/api/podcast/spotify", PODCAST_KEYS.spotify);
      if (cancelled) return;
      if (fresh) { apply(fresh); setLoading(false); }
      else if (!cached) { setFailed(true); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={[s.card, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>

      {/* Header row */}
      <View style={[s.row, isRTL && s.rowRTL, { alignItems: "center", padding: Spacing[4], paddingBottom: 0 }]}>
        <View style={[s.spotifyDot, { backgroundColor: SPOTIFY_GREEN }]} />
        <Text style={[s.eyebrow, { color: SPOTIFY_GREEN, fontFamily: ff("700") }]}>SPOTIFY</Text>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/tabs/podcast"); }}
          style={{ marginInlineStart: "auto", flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4 }}
          accessibilityLabel={isAr ? "كل الحلقات" : "View all"}
        >
          <Text style={[s.viewAll, { color: C.primary, fontFamily: ff("700") }]}>
            {isAr ? "كل الحلقات" : "View all"}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={C.primary} />
        </Pressable>
      </View>

      {/* Loading / error / content */}
      {loading ? (
        <View style={{ padding: Spacing[6], alignItems: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : failed || !hasEpisodes ? (
        <Pressable
          onPress={() => Linking.openURL(SHOW_URL)}
          style={{ padding: Spacing[5], alignItems: "center", gap: 8 }}
        >
          <Ionicons name="logo-twitch" size={32} color={SPOTIFY_GREEN} />
          <Text style={[s.muted, { color: C.text.muted, fontFamily: ff("500"), textAlign: "center" }]}>
            {isAr ? "افتح في تطبيق سبوتيفاي" : "Open in Spotify"}
          </Text>
        </Pressable>
      ) : (
        /* Featured inline player — the latest episode (or the show, as a fallback). */
        <View style={[s.player, { borderColor: C.border.subtle }]}>
          <WebView
            key={activeId || "show"}
            source={
              activeId
                ? { html: spotifyEpisodeHtml(activeId, false), baseUrl: SPOTIFY_BASE_URL }
                : { uri: SHOW_EMBED }
            }
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={webviewAllowRequest}
            style={{ height: 152, backgroundColor: "transparent" }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            domStorageEnabled
            javaScriptEnabled
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", gap: 8 },
  rowRTL: { flexDirection: "row-reverse" },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, marginInlineStart: 4 },
  spotifyDot: { width: 6, height: 6, borderRadius: 3 },
  viewAll: { fontSize: 12 },
  player: { borderTopWidth: 1, marginTop: Spacing[3], overflow: "hidden" },
  muted: { fontSize: 12 },
});

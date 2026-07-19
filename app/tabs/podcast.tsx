/**
 * Podcast tab — mirrors web /podcast: Mubasher Spotify show + YouTube playlists.
 *
 * Single source of truth = the web API (`/api/podcast/spotify`, `/api/podcast/youtube`)
 * so episode/video data is identical across web + mobile, no duplicated keys.
 *
 * Performance: data is served stale-while-revalidate from a shared on-device cache
 * (lib/podcast-cache) — shared with the Home block so the list paints instantly and
 * we never double-fetch.
 *
 * Players:
 *  • Spotify  — direct IFrame-API embed in a sandboxed WebView; a request guard
 *    (webviewAllowRequest) blocks `spotify:`/non-http schemes so it never flashes the
 *    "-1002 unsupported URL" error or hands off to the Spotify app — audio plays inline.
 *  • YouTube  — react-native-youtube-iframe (the IFrame Player API done right for
 *    WKWebView) → the video plays INSIDE the app, no error frame, no leaving to YouTube.
 *
 * The episode/video TITLE is display-only (not a press target). Playback is driven by
 * the artwork + play/pause button — tapping the text never navigates or opens anything.
 */
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import {
  View, StyleSheet, FlatList, Pressable, Image, Linking,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import YoutubePlayer from "react-native-youtube-iframe";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { WEB_BASE } from "@/constants/site";
import { useViewMore } from "@/hooks/useViewMore";
import { ViewMoreButton } from "@/components/shared/ViewMoreButton";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { audioPlayerHtml, webviewAllowRequest, SPOTIFY_BASE_URL } from "@/lib/embeds";
import { getCachedJson, fetchAndCacheJson, PODCAST_KEYS } from "@/lib/podcast-cache";

const SPOTIFY_GREEN = "#1DB954";
const SHOW_ID  = "46SZ8iPqkz18HxVHQHnu7P";
const SHOW_URL = `https://open.spotify.com/show/${SHOW_ID}`;
const SHOW_EMBED = `https://open.spotify.com/embed/show/${SHOW_ID}?utm_source=generator`;
const YT_PLAYLIST_1_ID = "PLTCeYavA4-xzotNstr80RDcK3ZGBhLp4O";
const YT_PLAYLIST_2_ID = "PLTCeYavA4-xzJpOyjvr_VFOfryiH5cwdK";

type Episode = {
  id: string;
  name: string;
  description?: string;
  duration_ms: number;
  release_date: string;
  thumbnail: string;
  url?: string;
};
type Video = { id: string; title: string; published?: string; thumbnail: string; url?: string };

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function relDate(iso: string, isAr: boolean) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0)  return isAr ? "اليوم" : "Today";
  if (diff === 1) return isAr ? "أمس"   : "Yesterday";
  if (diff < 7)   return isAr ? `قبل ${diff} أيام` : `${diff}d ago`;
  if (diff < 30)  return isAr ? `قبل ${Math.floor(diff / 7)} أسابيع` : `${Math.floor(diff / 7)}w ago`;
  return d.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

export default function PodcastScreen() {
  const C = useColors();
  const { language, isRTL, isDark } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEp, setActiveEp] = useState<Episode | null>(null);
  // autoplay only after a user tap (not on initial auto-select) so the page doesn't
  // blast audio on open. Flipping it changes the WebView key → reload → play().
  const [epAutoplay, setEpAutoplay] = useState(false);
  const [epLoading, setEpLoading] = useState(true);

  const [videos1, setVideos1] = useState<Video[]>([]);
  const [videos2, setVideos2] = useState<Video[]>([]);
  const [activeVid, setActiveVid] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // RSS-backed route: direct MP3s → in-house premium player (no Spotify chrome).
  const SPO_URL = `${WEB_BASE}/api/podcast/episodes`;
  const YT1_URL = `${WEB_BASE}/api/podcast/youtube`;
  const YT2_URL = `${WEB_BASE}/api/podcast/youtube?playlist=${YT_PLAYLIST_2_ID}`;

  // `cur ?? eps[0]` never overwrites an existing selection → safe on every payload.
  function applyData(spo: any, yt1: any, yt2: any) {
    if (spo) {
      const eps: Episode[] = spo?.episodes ?? [];
      setEpisodes(eps);
      if (eps.length > 0) setActiveEp((cur) => cur ?? eps[0]);
    }
    if (yt1) setVideos1(yt1?.videos ?? []);
    if (yt2) setVideos2(yt2?.videos ?? []);
  }

  async function loadAll() {
    // 1) Instant paint from cache (no spinner on repeat opens).
    const [cSpo, cYt1, cYt2] = await Promise.all([
      getCachedJson<any>(PODCAST_KEYS.spotify),
      getCachedJson<any>(PODCAST_KEYS.yt1),
      getCachedJson<any>(PODCAST_KEYS.yt2),
    ]);
    if (cSpo || cYt1 || cYt2) { applyData(cSpo, cYt1, cYt2); setEpLoading(false); }

    // 2) Revalidate in the background and repaint.
    const [spo, yt1, yt2] = await Promise.all([
      fetchAndCacheJson<any>(SPO_URL, PODCAST_KEYS.spotify),
      fetchAndCacheJson<any>(YT1_URL, PODCAST_KEYS.yt1),
      fetchAndCacheJson<any>(YT2_URL, PODCAST_KEYS.yt2),
    ]);
    applyData(spo, yt1, yt2);
    setEpLoading(false);
  }

  useEffect(() => { loadAll(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  // One tap selects AND plays (the embed reloads via its key + autoplays). The Spotify
  // embed's own controls handle pause; the request guard keeps it inline (no -1002).
  function selectEpisode(ep: Episode) {
    Haptics.selectionAsync();
    setActiveEp(ep);
    setEpAutoplay(true);
  }

  // Show 3 episode rows initially, reveal +3 per "Load more" tap (parity request).
  const epPager = useViewMore(episodes, 3);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg.base }]} edges={["top"]}>
      <FlatList
        data={[] as any[]}
        keyExtractor={() => "_"}
        renderItem={null as any}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        ListHeaderComponent={
          <View>
            {/* Unified header (Profile / Bell / Search) — flush full-width */}
            <ScreenHeader
              title="Mubasher Podcast" titleAr="بودكاست مباشر"
              subtitle="Audio & video market analysis" subtitleAr="تحليلات السوق الصوتية والمرئية"
              icon="headset"
            />

            <View style={{ padding: Spacing[4], gap: Spacing[5] }}>

            {/* ── Spotify section ───────────────────────────── */}
            <View>
              <View style={[s.row, isRTL && s.rowRTL, { alignItems: "center", marginBottom: Spacing[3] }]}>
                <View style={[s.spotifyDot, { backgroundColor: SPOTIFY_GREEN }]} />
                <Text style={[s.eyebrow, { color: SPOTIFY_GREEN, fontFamily: ff("700") }]}>SPOTIFY</Text>
                <Pressable onPress={() => Linking.openURL(SHOW_URL)} style={{ marginInlineStart: "auto" }}>
                  <Ionicons name="open-outline" size={16} color={C.text.muted} />
                </Pressable>
              </View>

              {epLoading ? (
                <View style={[s.skeleton, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : episodes.length === 0 ? (
                <View style={[s.skeleton, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <Text style={[s.muted, { color: C.text.muted, fontFamily: ff("500") }]}>
                    {isAr ? "تعذّر تحميل الحلقات. حاول لاحقاً." : "Could not load episodes. Try again later."}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Direct embedded player. One tap on a row selects AND plays (IFrame
                      API autoplay); the request guard keeps it inline (no -1002 flash). */}
                  <View style={[s.playerCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                    <WebView
                      key={`${activeEp?.id || "show"}-${epAutoplay ? "p" : "s"}`}
                      /* In-house premium player over the episode's direct MP3 (RSS) —
                         no Spotify iframe, no "Follow"/"Get the Spotify app" cards. */
                      source={{
                        html: audioPlayerHtml((activeEp as any)?.audioUrl ?? "", activeEp?.name ?? "", { isAr, dark: isDark, autoplay: epAutoplay }),
                        baseUrl: SPOTIFY_BASE_URL,
                      }}
                      originWhitelist={["*"]}
                      onShouldStartLoadWithRequest={webviewAllowRequest}
                      onMessage={(e) => {
                        // First-party analytics — the in-page player posts {audio_play}
                        // on real playback start; dedupe is per episode per session.
                        try {
                          const m = JSON.parse(e.nativeEvent.data || "{}");
                          if (m && m.audio_play && activeEp) {
                            track("podcast_played", {
                              entityType: "podcast_episode",
                              entityId: String(activeEp.id),
                              locale: isAr ? "ar" : "en",
                              props: { title: activeEp.name ?? "" },
                            });
                          }
                        } catch { /* ignore malformed frames */ }
                      }}
                      style={{ height: 110, backgroundColor: "transparent" }}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      setSupportMultipleWindows={false}
                      domStorageEnabled
                      javaScriptEnabled
                    />
                  </View>

                  {/* Episode list — 3 rows + Load more. Title display-only;
                      artwork + play/pause button are the tap targets. */}
                  <View style={{ gap: Spacing[2], marginTop: Spacing[3] }}>
                    {epPager.items.map((ep) => {
                      const active = ep.id === activeEp?.id;
                      return (
                        <View
                          key={ep.id}
                          style={[
                            s.epRow, isRTL && s.rowRTL,
                            { backgroundColor: active ? `${C.primary}10` : C.bg.surface, borderColor: active ? `${C.primary}55` : C.border.subtle },
                          ]}
                        >
                          <Pressable onPress={() => selectEpisode(ep)} accessibilityLabel={ep.name}>
                            {ep.thumbnail ? (
                              <Image source={{ uri: ep.thumbnail }} style={s.epArt} />
                            ) : (
                              <View style={[s.epArt, { backgroundColor: C.bg.elevated, alignItems: "center", justifyContent: "center" }]}>
                                <Ionicons name="musical-notes-outline" size={20} color={C.text.muted} />
                              </View>
                            )}
                          </Pressable>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text numberOfLines={2} style={[s.epName, { color: C.text.primary, fontFamily: ff("700") }, isRTL && s.textRight]}>
                              {ep.name}
                            </Text>
                            <View style={[s.row, isRTL && s.rowRTL, { gap: 8 }]}>
                              <Text style={[s.epMeta, { color: C.text.muted, fontFamily: ff("500") }]}>
                                {relDate(ep.release_date, isAr)}
                              </Text>
                              <Text style={[s.epMeta, { color: C.text.muted }]}>·</Text>
                              <Text style={[s.epMeta, { color: C.text.muted, fontFamily: ff("500") }]}>
                                {fmtDuration(ep.duration_ms)}
                              </Text>
                            </View>
                          </View>
                          <Pressable onPress={() => selectEpisode(ep)} hitSlop={8} accessibilityLabel={active ? "Playing" : "Play"}>
                            <Ionicons
                              name={active ? "pause-circle" : "play-circle"}
                              size={28}
                              color={active ? C.primary : C.text.secondary}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                    <ViewMoreButton {...epPager} />
                  </View>
                </>
              )}
            </View>

            {/* ── YouTube section 1 ──────────────────────────── */}
            <YouTubeSection
              title={isAr ? "بودكاست مباشر — يوتيوب" : "Mubasher Podcast — YouTube"}
              videos={videos1}
              activeVid={activeVid}
              setActiveVid={(id: string | null) => { Haptics.selectionAsync(); setActiveVid(id); }}
              isAr={isAr} isRTL={isRTL} C={C} ff={ff}
              playlistUrl={`https://www.youtube.com/playlist?list=${YT_PLAYLIST_1_ID}`}
            />

            {/* ── YouTube section 2 ──────────────────────────── */}
            <YouTubeSection
              title={isAr ? "مقابلات مختارة" : "Featured Interviews"}
              videos={videos2}
              activeVid={activeVid}
              setActiveVid={(id: string | null) => { Haptics.selectionAsync(); setActiveVid(id); }}
              isAr={isAr} isRTL={isRTL} C={C} ff={ff}
              playlistUrl={`https://www.youtube.com/playlist?list=${YT_PLAYLIST_2_ID}`}
            />

            <View style={{ height: TAB_BAR_CLEARANCE }} />
            </View>
          </View>
        }
        ListEmptyComponent={null}
      />
    </SafeAreaView>
  );
}

function YouTubeSection({ title, videos, activeVid, setActiveVid, isAr, isRTL, C, ff, playlistUrl }: any) {
  // Hook must run before any early return (rules of hooks). 3 rows + Load more.
  const vidPager = useViewMore((videos ?? []) as Video[], 3);
  if (!videos || videos.length === 0) return null;

  // Only the section that OWNS the active video mounts the player.
  const ownsActive = !!activeVid && (videos as Video[]).some((v) => v.id === activeVid);

  return (
    <View>
      <View style={[s.row, isRTL && s.rowRTL, { alignItems: "center", marginBottom: Spacing[3] }]}>
        <Ionicons name="logo-youtube" size={16} color="#FF0000" />
        <Text style={[s.eyebrow, { color: "#FF0000", fontFamily: ff("700"), marginInlineStart: 6 }]}>YOUTUBE</Text>
        <Pressable onPress={() => Linking.openURL(playlistUrl)} style={{ marginInlineStart: "auto" }}>
          <Ionicons name="open-outline" size={16} color={C.text.muted} />
        </Pressable>
      </View>
      <Text style={[s.sectionTitle, { color: C.text.primary, fontFamily: ff("800") }, isRTL && s.textRight, { marginBottom: Spacing[3] }]}>
        {title}
      </Text>

      {ownsActive && (
        <View style={[s.playerCard, { backgroundColor: "#000", borderColor: C.border.subtle, marginBottom: Spacing[3] }]}>
          {/* react-native-youtube-iframe = inline WKWebView player done right → plays
              INSIDE the app, no Error 152/153, no leaving to the YouTube app. */}
          <YoutubePlayer
            height={210}
            play
            videoId={activeVid}
            webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}
          />
        </View>
      )}

      <View style={{ gap: Spacing[2] }}>
        {vidPager.items.map((v: Video) => {
          const active = v.id === activeVid;
          return (
            <View
              key={v.id}
              style={[
                s.epRow, isRTL && s.rowRTL,
                { backgroundColor: active ? `${C.primary}10` : C.bg.surface, borderColor: active ? `${C.primary}55` : C.border.subtle },
              ]}
            >
              <Pressable onPress={() => setActiveVid(v.id)} accessibilityLabel={v.title}>
                {v.thumbnail ? (
                  <Image source={{ uri: v.thumbnail }} style={s.epArt} />
                ) : (
                  <View style={[s.epArt, { backgroundColor: C.bg.elevated, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="videocam-outline" size={20} color={C.text.muted} />
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={[s.epName, { color: C.text.primary, fontFamily: ff("700") }, isRTL && s.textRight]}>
                  {v.title}
                </Text>
                {v.published && (
                  <Text style={[s.epMeta, { color: C.text.muted, fontFamily: ff("500"), marginTop: 3 }]}>
                    {relDate(v.published, isAr)}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setActiveVid(v.id)} hitSlop={8} accessibilityLabel={active ? "Playing" : "Play"}>
                <Ionicons
                  name={active ? "pause-circle" : "play-circle"}
                  size={28}
                  color={active ? C.primary : C.text.secondary}
                />
              </Pressable>
            </View>
          );
        })}
        <ViewMoreButton {...vidPager} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  row: { flexDirection: "row", gap: 10 },
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  iconBubble: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },
  pageSub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.4 },
  spotifyDot: { width: 6, height: 6, borderRadius: 3 },
  skeleton: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[6], alignItems: "center", justifyContent: "center" },
  muted: { fontSize: 13 },
  playerCard: { borderWidth: 1, borderRadius: Radius.lg, overflow: "hidden" },
  epRow: {
    borderWidth: 1, borderRadius: Radius.md, padding: Spacing[3],
    flexDirection: "row", alignItems: "center", gap: Spacing[3],
  },
  epArt: { width: 56, height: 56, borderRadius: Radius.sm },
  epName: { fontSize: 13, lineHeight: 17 },
  epMeta: { fontSize: 11 },
});

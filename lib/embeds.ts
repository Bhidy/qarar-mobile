/**
 * WebView embed HTML builders for Spotify + YouTube, plus a shared request guard.
 *
 * WHY HTML (not a plain `uri`):
 *  • YouTube: the previous "Error 153 / 152" was an ORIGIN MISMATCH — the iframe
 *    loaded `youtube-nocookie.com` while the WebView baseUrl was `youtube.com`, so
 *    the player's origin check failed. The videos themselves are embeddable
 *    (`playableInEmbed: true`). The fix is the official IFrame Player API with
 *    `host` + `playerVars.origin` BOTH equal to the baseUrl (`https://www.youtube.com`)
 *    — everything aligned → no config error. The Player API also gives us an
 *    `onError` event we forward to React Native so the UI can self-heal (offer
 *    "Watch on YouTube") instead of showing a dead error frame.
 *  • Spotify embeds load PAUSED and need a tap inside the iframe to start (=2 taps
 *    in our list UI). The Spotify IFrame API exposes a controller with .play(),
 *    so we autoplay on `ready` when the user explicitly tapped a row (1 tap).
 *
 * The "-1002 unsupported URL" flash was the Spotify embed trying to hand off to
 * the native Spotify app via a `spotify:` deep-link, which WKWebView can't load.
 * `webviewAllowRequest` (used in onShouldStartLoadWithRequest) blocks every
 * non-http(s) scheme so the player stays inline and the error never appears.
 *
 * Both builders are returned with the baseUrl the WebView must use:
 *   <WebView source={{ html, baseUrl }} onShouldStartLoadWithRequest={webviewAllowRequest} ... />
 */

export const YT_BASE_URL = "https://www.youtube.com";
export const SPOTIFY_BASE_URL = "https://open.spotify.com";
export const TV_BASE_URL = "https://www.tradingview.com";

/**
 * TradingView Advanced Chart (free widget) for an in-app WebView — the same live
 * interactive chart the customer web signal page shows behind the "Live Chart" CTA.
 * Loaded inside a Modal so the analyst's published symbol + indicators render
 * full-screen with drawing tools. Posts {tv_ready}/{tv_error} to React Native.
 */
export function tradingViewChartHtml(
  symbol: string,
  interval: string = "D",
  theme: "light" | "dark" = "light",
  locale: string = "en",
  studies: string[] = [],
): string {
  const studiesJson = studies && studies.length ? JSON.stringify(studies) : "undefined";
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>html,body{margin:0;padding:0;height:100%;background:transparent;overflow:hidden}#tv{height:100%;width:100%}</style>
</head><body>
<div id="tv"></div>
<script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
<script>
  function post(m){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} }
  try {
    new TradingView.widget({
      container_id: "tv", autosize: true,
      symbol: ${JSON.stringify(symbol)}, interval: ${JSON.stringify(interval || "D")},
      theme: ${JSON.stringify(theme === "dark" ? "dark" : "light")}, style: "1",
      locale: ${JSON.stringify(locale === "ar" ? "ar" : "en")},
      hide_side_toolbar: false, hide_top_toolbar: false, withdateranges: true,
      enable_publishing: false, allow_symbol_change: false, details: false, calendar: false,
      studies: ${studiesJson}
    });
    post({ tv_ready: true });
  } catch (e) { post({ tv_error: String(e) }); }
</script>
</body></html>`;
}

/**
 * Shared request guard for embed WebViews. Allow only http(s) (and the initial
 * about:/data: bootstrap); block app deep-links (spotify:, youtube:, itms-apps:,
 * vnd.youtube:, etc.) that otherwise trigger WKWebView's "-1002 unsupported URL"
 * full-page error and try to leave the app. Keeps playback strictly inline.
 */
export function webviewAllowRequest(req: { url?: string } | undefined | null): boolean {
  const u = (req && req.url) || "";
  if (!u) return true;
  return /^(https?:|about:|data:|blob:)/i.test(u);
}

/**
 * YouTube inline player via the official IFrame Player API, origin-aligned to the
 * WebView baseUrl so the player never throws a config error (152/153).
 * Posts `{yt_error}` / `{yt_ready}` to React Native via window.ReactNativeWebView.
 * Pass autoplay=true to start immediately on a user tap.
 */
export function youtubeEmbedHtml(videoId: string, autoplay = true): string {
  const ap = autoplay ? 1 : 0;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}#p{width:100%;height:100%}</style>
</head><body>
<div id="p"></div>
<script>
  function post(m){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} }
  var tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
  window.onYouTubeIframeAPIReady = function () {
    try {
      new YT.Player('p', {
        videoId: '${videoId}',
        host: 'https://www.youtube.com',
        playerVars: { playsinline: 1, autoplay: ${ap}, rel: 0, modestbranding: 1, fs: 1, origin: 'https://www.youtube.com' },
        events: {
          onReady: function (e) { post({ yt_ready: true }); ${ap ? "try { e.target.playVideo(); } catch(_){}" : ""} },
          onError: function (e) { post({ yt_error: e && e.data }); }
        }
      });
    } catch (err) { post({ yt_error: -1 }); }
  };
</script>
</body></html>`;
}

/** Spotify episode player via the IFrame API. autoplay=true → plays on ready. */
export function spotifyEpisodeHtml(episodeId: string, autoplay = false, height = 152): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>html,body{margin:0;padding:0;background:transparent;height:100%}#ep{width:100%}</style>
</head><body>
<div id="ep"></div>
<script src="https://open.spotify.com/embed/iframe-api/v1" async></script>
<script>
  window.onSpotifyIframeApiReady = function (IFrameAPI) {
    var el = document.getElementById('ep');
    IFrameAPI.createController(el, { uri: 'spotify:episode:${episodeId}', width: '100%', height: ${height} }, function (controller) {
      ${autoplay ? "controller.addListener('ready', function(){ try { controller.play(); } catch(e){} });" : ""}
    });
  };
</script>
</body></html>`;
}

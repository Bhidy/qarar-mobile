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

import { WEB_BASE } from "@/constants/site";

export const YT_BASE_URL = "https://www.youtube.com";
export const SPOTIFY_BASE_URL = "https://open.spotify.com";
export const TV_BASE_URL = "https://www.tradingview.com";

/**
 * Self-hosted TradingView Advanced Chart page (web /embed/chart) driven by OUR
 * own price data via /api/udf. Used for EGX + Tadawul symbols, which the FREE
 * tv.js widget doesn't carry — it silently falls back to AAPL for them. USA
 * symbols keep the free-widget HTML path (TradingView covers them natively).
 * Load as a plain `{ uri }` WebView source (not html) so the page's own
 * origin/assets resolve. Query params are built manually — RN's URLSearchParams
 * polyfill doesn't implement toString().
 */
export function advancedChartUrl(
  symbol: string,
  opts: { theme?: "light" | "dark"; lang?: string; interval?: string } = {},
): string {
  const theme = opts.theme === "dark" ? "dark" : "light";
  const lang = opts.lang === "ar" ? "ar" : "en";
  const interval = (opts.interval || "D").trim() || "D";
  return `${WEB_BASE}/embed/chart?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&theme=${theme}&lang=${lang}`;
}

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

/**
 * In-house premium podcast player (replaces the Spotify embed, which interrupted
 * playback with Spotify marketing — "Follow", "Get the Spotify app"). Plays the
 * episode's direct MP3 (from the show's public RSS feed) in an HTML5 <audio>
 * under our own brand UI: circular play button, seekable progress, elapsed/total,
 * speed toggle. Self-contained (no external scripts), RTL-aware, ~110px tall.
 * Use with baseUrl SPOTIFY_BASE_URL? No — audio is on anchor.fm/cloudfront; any
 * https baseUrl works. Pair with webviewAllowRequest as usual.
 */
export function audioPlayerHtml(
  audioUrl: string,
  title: string,
  opts: { isAr?: boolean; dark?: boolean; autoplay?: boolean } = {},
): string {
  const { isAr = false, dark = false, autoplay = false } = opts;
  const dir = isAr ? "rtl" : "ltr";
  const ink = dark ? "#F4F6FB" : "#101729";
  const muted = dark ? "rgba(244,246,251,0.55)" : "rgba(16,23,41,0.5)";
  const track = dark ? "rgba(244,246,251,0.18)" : "rgba(16,23,41,0.12)";
  const surface = "transparent";
  return `<!DOCTYPE html><html dir="${dir}"><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;padding:0;background:${surface};height:100%;overflow:hidden;
    font-family:-apple-system,'Segoe UI',Roboto,'Cairo',sans-serif}
  .wrap{display:flex;align-items:center;gap:14px;padding:14px 16px;height:100%}
  .btn{width:52px;height:52px;border-radius:50%;border:0;flex:none;cursor:pointer;
    background:linear-gradient(135deg,#0B4DD4 0%,#08379B 100%);
    box-shadow:0 10px 24px -10px rgba(11,77,212,.55);display:flex;align-items:center;justify-content:center}
  .btn svg{width:20px;height:20px;fill:#fff}
  .main{flex:1;min-width:0}
  .title{font-size:13px;font-weight:700;color:${ink};white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis;margin:0 0 8px}
  .bar{position:relative;height:5px;border-radius:99px;background:${track};cursor:pointer}
  .fill{position:absolute;top:0;${isAr ? "right" : "left"}:0;height:100%;border-radius:99px;width:0%;
    background:linear-gradient(90deg,#0B4DD4,#08379B)}
  .times{display:flex;justify-content:space-between;font-size:10.5px;color:${muted};
    font-variant-numeric:tabular-nums;margin-top:5px}
  .spd{flex:none;border:1px solid ${track};background:transparent;color:${ink};border-radius:99px;
    font-size:11px;font-weight:700;padding:5px 10px;cursor:pointer;font-variant-numeric:tabular-nums}
</style></head><body>
<div class="wrap">
  <button class="btn" id="pp" aria-label="play">
    <svg id="ic" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
  </button>
  <div class="main">
    <p class="title">${title.replace(/</g, "&lt;")}</p>
    <div class="bar" id="bar"><div class="fill" id="fill"></div></div>
    <div class="times"><span id="cur">0:00</span><span id="dur">–:––</span></div>
  </div>
  <button class="spd" id="spd">1×</button>
</div>
<audio id="a" preload="metadata" src="${audioUrl.replace(/"/g, "&quot;")}"></audio>
<script>
  var a=document.getElementById('a'),pp=document.getElementById('pp'),ic=document.getElementById('ic'),
      bar=document.getElementById('bar'),fill=document.getElementById('fill'),
      cur=document.getElementById('cur'),dur=document.getElementById('dur'),spd=document.getElementById('spd');
  var SP=[1,1.25,1.5,2],si=0;
  var PLAY='M8 5v14l11-7z',PAUSE='M6 5h4v14H6zM14 5h4v14h-4z';
  function fmt(s){if(!isFinite(s)||s<0)s=0;var m=Math.floor(s/60),x=Math.floor(s%60);return m+':'+(x<10?'0':'')+x;}
  function paint(){ic.innerHTML='<path d="'+(a.paused?PLAY:PAUSE)+'"/>';}
  pp.onclick=function(){ if(a.paused){a.play().catch(function(){});} else {a.pause();} };
  a.onplay=function(){paint();try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({audio_play:true}))}catch(e){}};
  a.onpause=paint; a.onended=paint;
  a.onloadedmetadata=function(){ dur.textContent=fmt(a.duration); };
  a.ontimeupdate=function(){
    cur.textContent=fmt(a.currentTime);
    if(a.duration) fill.style.width=(a.currentTime/a.duration*100)+'%';
  };
  bar.onclick=function(e){
    if(!a.duration) return;
    var r=bar.getBoundingClientRect(); var x=(e.clientX-r.left)/r.width;
    ${isAr ? "x=1-x;" : ""}
    a.currentTime=Math.max(0,Math.min(1,x))*a.duration;
  };
  spd.onclick=function(){ si=(si+1)%SP.length; a.playbackRate=SP[si]; spd.textContent=SP[si]+'\\u00D7'; };
  ${autoplay ? "a.play().catch(function(){});" : ""}
</script>
</body></html>`;
}

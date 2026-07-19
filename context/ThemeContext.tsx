import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { track } from "@/lib/analytics";
import { getTranslation } from "@/constants/translations";
import type { Locale } from "@/constants/translations";

export type ThemeMode    = "dark" | "light";
export type AccentColor  = "blue" | "gold" | "teal";
export type AppLanguage  = "en" | "ar";
export type AppMarket    = "egypt" | "saudi" | "usa";

// ── Market availability lock (frontend-only, reversible) ─────────────────────
// Only these markets are user-selectable in the app right now. Saudi & USA data
// and code stay fully intact (constants/saudi-data.ts etc.) — they're just not
// offered to end users until ready. Re-enable by adding the market here. Mirrors
// the existing hidden market-switcher decision.
export const MARKETS_ENABLED: AppMarket[] = ["egypt", "saudi"];
export const DEFAULT_MARKET: AppMarket = "egypt";
/** Force any market to an enabled one so a persisted 'saudi'/'usa' selection
 *  can't strand a user on a market whose switcher is now hidden. */
export function lockMarket(m: AppMarket | null | undefined): AppMarket {
  return m && MARKETS_ENABLED.includes(m) ? m : DEFAULT_MARKET;
}

interface ThemeContextValue {
  mode:     ThemeMode;
  accent:   AccentColor;
  language: AppLanguage;
  market:   AppMarket;
  photoUri: string | null;
  /** Rebinds the device's photo cache to a Supabase user id (or null when
   *  logged out). Called by AuthContext on every auth change so switching
   *  users on the same device CANNOT bleed avatars. */
  bindPhotoToUser: (userId: string | null) => void;
  isRTL:    boolean;
  isDark:   boolean;
  setMode:     (m: ThemeMode)    => void;
  setAccent:   (a: AccentColor)  => void;
  setLanguage: (l: AppLanguage)  => void;
  setMarket:   (m: AppMarket)    => void;
  setPhotoUri: (uri: string | null) => void;
  t: (path: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode:     "light",
  accent:   "blue",
  language: "ar",
  market:   "egypt",
  photoUri: null,
  isRTL:    true,
  isDark:   false,
  setMode:     () => {},
  setAccent:   () => {},
  setLanguage: () => {},
  setMarket:   () => {},
  setPhotoUri: () => {},
  bindPhotoToUser: () => {},
  t: (p) => p,
});

// Per-user photo cache key — switching accounts on the same device CANNOT bleed
// avatars. The legacy un-scoped "@theme_photoUri" key is purged on first run.
const photoKey = (userId: string | null) => userId ? `@theme_photoUri:${userId}` : "@theme_photoUri:anon";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode,     setModeState]     = useState<ThemeMode>("light");
  const [accent,   setAccentState]   = useState<AccentColor>("blue");
  // Default language is Arabic for the Egypt/MENA audience. Existing installs
  // still respect their saved @theme_language on next launch; only fresh
  // installs (no persisted value) land on Arabic + RTL.
  const [language, setLanguageState] = useState<AppLanguage>("ar");
  const [market,   setMarketState]   = useState<AppMarket>("egypt");
  const [photoUri, setPhotoUriState] = useState<string | null>(null);
  const [boundUserId, setBoundUserId] = useState<string | null>(null);

  // Load all persisted settings on first mount. Photo is NOT loaded here — it
  // is bound per-user by AuthContext via bindPhotoToUser once the session
  // hydrates, so the launch screen of a logged-out device cannot show a previous
  // user's avatar. Migrate-away from the legacy un-scoped key.
  useEffect(() => {
    (async () => {
      try {
        const [m, a, l, mk] = await Promise.all([
          AsyncStorage.getItem("@theme_mode"),
          AsyncStorage.getItem("@theme_accent"),
          AsyncStorage.getItem("@theme_language"),
          AsyncStorage.getItem("@theme_market"),
        ]);
        if (m)  setModeState(m as ThemeMode);
        if (a)  setAccentState(a as AccentColor);
        if (l)  setLanguageState(l as AppLanguage);
        // Coerce any persisted market to an enabled one (Egypt). If the stored
        // value was a now-disabled market, rewrite it so it doesn't linger.
        {
          const locked = lockMarket(mk as AppMarket | null);
          setMarketState(locked);
          if (mk && mk !== locked) AsyncStorage.setItem("@theme_market", locked).catch(() => {});
        }
        // One-time legacy purge — remove the un-scoped key from older builds.
        AsyncStorage.removeItem("@theme_photoUri").catch(() => {});
      } catch (_) { /* ignore */ }
    })();
  }, []);

  // RTL is handled entirely via isRTL flag on each component — no I18nManager needed
  const setMode     = (m: ThemeMode)       => { setModeState(m);     AsyncStorage.setItem("@theme_mode",     m).catch(() => {}); };
  const setAccent   = (a: AccentColor)     => { setAccentState(a);   AsyncStorage.setItem("@theme_accent",   a).catch(() => {}); };
  const setLanguage = (l: AppLanguage)     => { setLanguageState(l); AsyncStorage.setItem("@theme_language", l).catch(() => {}); };
  const setMarket   = (m: AppMarket)       => {
    const lm = lockMarket(m);
    // First-party analytics — only real changes, not re-selects of the same market.
    setMarketState((prev) => {
      if (prev !== lm) track("market_switched", { market: lm, allowRepeat: true });
      return lm;
    });
    AsyncStorage.setItem("@theme_market", lm).catch(() => {});
  };
  const setPhotoUri = (uri: string | null) => {
    setPhotoUriState(uri);
    const key = photoKey(boundUserId);
    if (uri) AsyncStorage.setItem(key, uri).catch(() => {});
    else     AsyncStorage.removeItem(key).catch(() => {});
  };

  // Called by AuthContext on every auth change. On sign-in: read THIS user's
  // photo from AsyncStorage. On sign-out: clear in-memory + remove the anon key.
  const bindPhotoToUser = (userId: string | null) => {
    setBoundUserId(userId);
    if (userId) {
      AsyncStorage.getItem(photoKey(userId)).then((stored) => {
        setPhotoUriState(stored || null);
      }).catch(() => setPhotoUriState(null));
    } else {
      setPhotoUriState(null);
      AsyncStorage.removeItem(photoKey(null)).catch(() => {});
    }
  };

  const t = (path: string) => getTranslation(path, language as Locale);

  return (
    <ThemeContext.Provider value={{
      mode, accent, language,
      // Render-time hard clamp: every screen ALWAYS receives an enabled market
      // (Egypt). Even an installed app that had 'saudi' persisted will display
      // Egypt the moment this build runs — no dependence on the storage-coercion
      // write. Single source of truth for the market shown anywhere in the app.
      market: lockMarket(market),
      photoUri,
      isRTL: language === "ar",
      isDark: mode === "dark",
      setMode, setAccent, setLanguage, setMarket, setPhotoUri, bindPhotoToUser,
      t,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Color palette ──────────────────────────────────────────────────────────
export function useColors() {
  const { mode, accent } = useTheme();

  /* Brand-aligned primaries — from tokens.css */
  const darkPrimaries = {
    blue: { p: "#4D8EF8", soft: "#162347", softer: "#0F1932", ink: "#9DB6FF", deep: "#1B3A88" },
    gold: { p: "#D9B560", soft: "#332918", softer: "#1A1405", ink: "#E8C982", deep: "#7A5E0A" },
    teal: { p: "#2DA8A8", soft: "#142B2D", softer: "#061515", ink: "#5EC8C8", deep: "#0D5050" },
  };
  const lightPrimaries = {
    blue: { p: "#0B4DD4", soft: "#E4EBFF", softer: "#F1F4FF", ink: "#08379B", deep: "#062373" },
    gold: { p: "#B8923A", soft: "#FBEFC9", softer: "#FFFBF0", ink: "#6E5316", deep: "#5A3C00" },
    teal: { p: "#0B7E7E", soft: "#D2EDED", softer: "#F0FBFB", ink: "#075A5A", deep: "#033838" },
  };

  const dp = darkPrimaries[accent];
  const lp = lightPrimaries[accent];

  if (mode === "light") {
    /* Brand-aligned light backgrounds from tokens.css :root */
    const bgTint =
      accent === "gold" ? { base: "#FAFAF7", surface: "#FFFFFF", elevated: "#F3F2EC", overlay: "#ECEAE0" }
    : accent === "teal" ? { base: "#F5FAFA", surface: "#FFFFFF", elevated: "#EBF5F5", overlay: "#DCF0F0" }
    :                     { base: "#FFFFFF",  surface: "#FFFFFF", elevated: "#F5F6FA", overlay: "#ECEEF5" };

    const borderTint =
      accent === "gold" ? { subtle: "#E8E3D4", default: "#D5CCBB", strong: "#B8AD96" }
    : accent === "teal" ? { subtle: "#D4E9E9", default: "#B8D6D6", strong: "#8CBBBB" }
    :                     { subtle: "#ECEEF3", default: "#ECEEF3", strong: "#D4D8E2" };

    return {
      bg: bgTint, border: borderTint,
      primary: lp.p, primaryDeep: lp.deep, primarySoft: lp.soft,
      primarySofter: lp.softer, primaryInk: lp.ink,
      signal: {
        invest: lp.p, investSolid: lp.p, investSoft: lp.soft, investInk: lp.ink,
        buy: lp.p, buySoft: lp.soft, buyInk: lp.ink,
        hold: "#B8923A", holdSoft: "#FBEFC9", holdInk: "#6E5316",
        takeProfit: "#0B7E7E", takeProfitSoft: "#D2EDED", takeProfitInk: "#075A5A",
        sell: "#C53030", sellSoft: "#FCE3DE", sellInk: "#8A1F19",
        live: "#C53030",
      },
      accent: {
        plum: "#6E2C82", plumSoft: "#F1E0F4",
        terracotta: "#C95B3C", terracottaSoft: "#FCDFD0",
        sand: "#D4B27A", gold: "#B8923A", teal: "#0B7E7E", red: "#C53030",
      },
      text: { primary: "#0A0E1F", secondary: "#2A3147", muted: "#6B7388", inverse: "#FFFFFF", white: "#FFFFFF" },
    };
  }

  /* Brand-aligned dark palette from tokens.css [data-theme="dark"] */
  return {
    bg: { base: "#060B19", surface: "#0E1729", elevated: "#15203A", overlay: "#1B2A47" },
    border: { subtle: "#1F2C46", default: "#2C3A57", strong: "#3A4D6E" },
    primary: dp.p, primaryDeep: dp.deep, primarySoft: dp.soft,
    primarySofter: dp.softer, primaryInk: dp.ink,
    signal: {
      invest: dp.p, investSolid: dp.p, investSoft: dp.soft, investInk: dp.ink,
      buy: dp.p, buySoft: dp.soft, buyInk: dp.ink,
      hold: "#D9B560", holdSoft: "#332918", holdInk: "#E8C982",
      takeProfit: "#2DA8A8", takeProfitSoft: "#142B2D", takeProfitInk: "#5EC8C8",
      sell: "#E4615A", sellSoft: "#2C1614", sellInk: "#F09591",
      live: "#E4615A",
    },
    accent: {
      plum: "#B774CC", plumSoft: "#2C1B32",
      terracotta: "#E27958", terracottaSoft: "#33180F",
      sand: "#C9A06A", gold: "#D9B560", teal: "#2DA8A8", red: "#E4615A",
    },
    text: { primary: "#EDEEF3", secondary: "#B6BCC7", muted: "#6E7689", inverse: "#060B19", white: "#FFFFFF" },
  };
}

// First-party usage analytics — mobile tracker (mirrors web/lib/analytics.ts).
//
// Events insert DIRECTLY into public.user_events through the authed Supabase
// client (RLS: authenticated INSERT-own only; event names DB-whitelisted; a DB
// trigger throttles 120 events / 5 min / user). Signed-out usage is never
// recorded. Fire-and-forget: tracking must never throw or block the UI.
//
// A "session" = app foreground period; a new session id is minted on cold
// start and after ≥30 minutes in background (Amplitude/Mixpanel convention).
// View-style events dedupe per (event, entity) per session.

import { Platform } from "react-native";
import { supabase, isSupabaseReady } from "@/lib/supabase";

export type TrackEvent =
  | "session_started"
  | "login_succeeded"
  | "signal_viewed"
  | "report_read"
  | "article_read"
  | "news_viewed"
  | "index_update_viewed"
  | "stock_page_viewed"
  | "podcast_played"
  | "home_viewed"
  | "search_performed"
  | "market_switched";

export type TrackEntityType =
  | "technical_call" | "fundamental_call" | "article" | "fundamental_article"
  | "technical_article" | "news" | "index_update" | "stock" | "podcast_episode";

export interface TrackOptions {
  entityType?: TrackEntityType;
  entityId?: string;
  ticker?: string;
  market?: string;               // egypt|saudi|usa (ThemeContext) or EG|SA|US
  locale?: "en" | "ar";
  props?: Record<string, unknown>;
  /** Skip the per-session dedupe (e.g. market_switched may repeat). */
  allowRepeat?: boolean;
}

const SESSION_GAP_MS = 30 * 60 * 1000;
const PLATFORM = Platform.OS === "ios" ? "ios" : "android";

let sessionId: string | null = null;
let sessionStartedSent = false;
let lastActiveAt = 0;
const seen = new Set<string>();

function uuid(): string {
  // RFC4122-ish v4 without importing a crypto polyfill — collision risk is
  // irrelevant here (session ids only group events for display).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normMarket(m?: string): string | null {
  const v = String(m ?? "").toLowerCase();
  if (!v) return null;
  if (v === "eg" || v === "egypt") return "EG";
  if (v === "sa" || v === "saudi" || v === "tasi") return "SA";
  if (v === "us" || v === "usa" || v === "spx") return "US";
  return null;
}

function ensureSession(): { id: string; fresh: boolean } {
  const now = Date.now();
  const stale = !sessionId || now - lastActiveAt > SESSION_GAP_MS;
  if (stale) {
    sessionId = uuid();
    sessionStartedSent = false;
    seen.clear();
  }
  lastActiveAt = now;
  return { id: sessionId!, fresh: !sessionStartedSent };
}

/**
 * Mark app-foreground transitions (wired to AppState in useData). After a
 * ≥30-minute background gap the next event opens a fresh session.
 */
export function noteAppActive(): void {
  const now = Date.now();
  if (sessionId && now - lastActiveAt > SESSION_GAP_MS) {
    sessionId = null; // next track() mints a new session
  }
  lastActiveAt = now;
}

/** Track a customer event. Never throws; no-op when signed out or not ready. */
export function track(event: TrackEvent, opts: TrackOptions = {}): void {
  try {
    if (!isSupabaseReady || !supabase) return;
    const client = supabase;
    const { id, fresh } = ensureSession();

    if (!opts.allowRepeat) {
      const key = `${event}:${opts.entityType ?? ""}:${opts.entityId ?? opts.ticker ?? ""}`;
      if (seen.has(key)) return;
      seen.add(key);
    }

    void client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return; // signed-out usage is never recorded

      const rows: Array<Record<string, unknown>> = [];
      if (fresh && event !== "session_started") {
        sessionStartedSent = true;
        rows.push({
          user_id: user.id, session_id: id, event: "session_started",
          platform: PLATFORM, locale: opts.locale ?? null, props: {},
        });
      }
      if (event === "session_started") sessionStartedSent = true;

      rows.push({
        user_id: user.id,
        session_id: id,
        event,
        entity_type: opts.entityType ?? null,
        entity_id: opts.entityId ? String(opts.entityId).slice(0, 120) : null,
        ticker: opts.ticker ? String(opts.ticker).slice(0, 24) : null,
        market: normMarket(opts.market),
        platform: PLATFORM,
        locale: opts.locale ?? null,
        props: opts.props ?? {},
      });

      void client.from("user_events").insert(rows).then(({ error }) => {
        if (error && __DEV__) console.log("[analytics]", error.message);
      });
    }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}

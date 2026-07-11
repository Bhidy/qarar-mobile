/**
 * OTAUpdates — background over-the-air update runner (expo-updates / EAS Update).
 *
 * WHAT IT DOES
 *   • On launch and on every foreground, checks the channel for a newer JS bundle
 *     that matches this binary's runtimeVersion, downloads it in the background, and
 *     lets expo-updates apply it on the NEXT cold start. It NEVER reloads the app
 *     mid-session, so it can never interrupt an in-progress flow (e.g. checkout).
 *   • Emits a clear `[OTA]` log line at every phase: check → available → download →
 *     ready → up-to-date → error.
 *
 * SAFETY / FALLBACK / ROLLBACK
 *   • Disabled automatically in dev / Expo Go (`Updates.isEnabled` is false there).
 *   • Every call is wrapped — a failure only logs; the app keeps running on its
 *     current (cached or embedded) bundle. With `fallbackToCacheTimeout: 0` the app
 *     ALWAYS launches instantly on the cached bundle; a download never blocks startup.
 *   • Rollback is automatic: if a downloaded update crash-loops on first load,
 *     expo-updates reverts to the last good / embedded bundle. Operator-initiated
 *     rollback is `eas update:rollback` / republish (see setup/OTA_UPDATE_RUNBOOK.md).
 *
 * Native config lives in app.json `updates` (url, runtimeVersion: fingerprint —
 * the runtime auto-tracks the native surface so a JS bundle can never land on a
 * binary with a different native layer). Channel is injected per build profile by
 * EAS Build (eas.json).
 */
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

// Don't re-check more often than this when the app is foregrounded repeatedly.
const MIN_CHECK_INTERVAL_MS = 60_000;

// If a launch-triggered download completes within this window of app start, apply
// it immediately (one clean reload) instead of waiting for the NEXT cold start.
// Past the window the user is already mid-session → defer to next cold start.
const LAUNCH_APPLY_WINDOW_MS = 8_000;

function log(msg: string, extra?: unknown) {
  if (extra !== undefined) console.log(`[OTA] ${msg}`, extra);
  else console.log(`[OTA] ${msg}`);
}

export function OTAUpdates() {
  const checking = useRef(false);
  const lastCheck = useRef(0);
  const launchedAt = useRef(Date.now());

  useEffect(() => {
    // Disabled in dev / Expo Go / when updates aren't configured. No-op, no logs spam.
    if (!Updates.isEnabled) {
      log("disabled (dev build / Updates not enabled) — skipping");
      return;
    }

    // One-time visibility into which bundle is actually running.
    log(
      `running ${Updates.isEmbeddedLaunch ? "EMBEDDED" : "OTA"} bundle` +
        ` · channel=${Updates.channel ?? "?"} · runtimeVersion=${Updates.runtimeVersion ?? "?"}` +
        ` · updateId=${Updates.updateId ?? "embedded"}`,
    );

    let cancelled = false;

    const checkAndDownload = async (trigger: string) => {
      const now = Date.now();
      if (checking.current) return;
      if (now - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
      checking.current = true;
      lastCheck.current = now;
      try {
        log(`checking for update (${trigger}) …`);
        const result = await Updates.checkForUpdateAsync();
        if (cancelled) return;
        if (!result.isAvailable) {
          log("up to date");
          return;
        }
        log("update available → downloading …");
        const fetched = await Updates.fetchUpdateAsync();
        if (cancelled) return;
        if (fetched.isNew) {
          const sinceLaunch = Date.now() - launchedAt.current;
          if (trigger === "launch" && sinceLaunch < LAUNCH_APPLY_WINDOW_MS) {
            // Fresh cold start and the download beat the apply window → apply NOW
            // (one clean reload) so users see fixes on the FIRST launch after a
            // publish, not the second. Mid-session (foreground checks or slow
            // downloads) still defers to the next cold start — never interrupts.
            log(`update downloaded ✓ — applying now (${sinceLaunch}ms after launch)`);
            await Updates.reloadAsync();
            return;
          }
          log("update downloaded ✓ — will apply on next app restart");
        } else {
          log("fetch returned no new update");
        }
      } catch (e: any) {
        // Never throw: a failed update must never break the app.
        log("ERROR — staying on current bundle:", e?.message ?? String(e));
      } finally {
        checking.current = false;
      }
    };

    // Check on launch …
    checkAndDownload("launch");

    // … and whenever the app returns to the foreground.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") checkAndDownload("foreground");
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return null;
}


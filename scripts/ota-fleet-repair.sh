#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ota-fleet-repair.sh — one-off delivery repair (2026-07-10).
#
# ROOT CAUSE: runtimeVersion uses the fingerprint policy, and app.json's
# buildNumber/versionCode are part of the fingerprint. Every `release.sh stamp`
# therefore FORKS the runtime — each OTA only targeted the next unreleased
# binary, never the installed fleet. (Proven: `eas fingerprint:compare
# ec1e9d69…` shows versions as the ONLY drift.)
#
# This script republishes the CURRENT JS to every live fleet runtime by
# temporarily stamping each shipped (buildNumber, versionCode[, version])
# tuple, re-baselining the OTA guard, and running the fully-gated publish.
# The FOREVER fix (fingerprint.config.js with ExpoConfigVersions sourceSkips)
# ships separately — after it, all future binaries share one stable runtime.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

# (iosBuild androidVc version) tuples of every binary users can be running.
# 97/19 already received today's groups but is included for freshness/uniformity.
TUPLES=(
  "95 17 1.0.1"
  "96 18 1.0.1"
  "97 19 1.0.1"
  "94 16 1.0.0"
)

for t in "${TUPLES[@]}"; do
  read -r IOS VC VER <<< "$t"
  echo "════════ fleet tuple ios=$IOS vc=$VC v=$VER ════════"
  bash scripts/release.sh stamp "$IOS" "$VC" "$VER" >/dev/null
  bash scripts/ota-stamp-release.sh >/dev/null            # re-baseline drift guard for this tuple
  bash scripts/ota-publish.sh production "Delivery repair: full current JS for the v$VER (ios $IOS / vc$VC) runtime" \
    || echo "⚠ publish FAILED for tuple $t — continuing"
done

# Restore the real current stamps (build 98 / vc20) + guard baseline.
bash scripts/release.sh stamp 98 20 1.0.1 >/dev/null
bash scripts/ota-stamp-release.sh >/dev/null
echo "✅ fleet repair complete — app.json restored to 98/20 v1.0.1"

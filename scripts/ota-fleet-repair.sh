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
#
# FOREVER FIX (owner-approved 2026-07-10): runtimeVersion policy is now
# "appVersion" — binaries from iOS 99 / Android vc21 onward share the stable
# runtime "1.0.1" and receive plain `ota-publish.sh` updates directly. This
# script remains ONLY to reach the legacy fingerprint-runtime binaries
# (94–98 / vc16–20); it temporarily flips the policy back to "fingerprint"
# per tuple, then restores. Retire it once the store fleet is ≥99/vc21.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
# ── DEPRECATED (2026-07-11) ──────────────────────────────────────────────────
# Superseded by scripts/ota-publish-fleet.sh (build-once / promote-everywhere /
# hash-attested). This script re-bundles per tuple (non-deterministic bytes) and
# its restore step hardcodes v1.0.1/99/21 — WRONG for any later release train.
echo "❌ DEPRECATED: use  bash scripts/ota-publish-fleet.sh \"message\"  instead." >&2
exit 1

cd "$(dirname "$0")/.."

set_policy() { # set_policy fingerprint|appVersion
  node -e '
    const fs=require("fs");const j=JSON.parse(fs.readFileSync("app.json","utf8"));
    j.expo.runtimeVersion={policy:process.argv[1]};
    fs.writeFileSync("app.json",JSON.stringify(j,null,2)+"\n");
  ' "$1"
}
trap 'set_policy appVersion' EXIT   # never leave the repo on the legacy policy
set_policy fingerprint

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

# Restore the real current stamps + guard baseline (policy restored by trap).
CUR_IOS="${CURRENT_IOS_BUILD:-99}"; CUR_VC="${CURRENT_ANDROID_VC:-21}"
bash scripts/release.sh stamp "$CUR_IOS" "$CUR_VC" 1.0.1 >/dev/null
set_policy appVersion
bash scripts/ota-stamp-release.sh >/dev/null
echo "✅ fleet repair complete — app.json restored to $CUR_IOS/$CUR_VC v1.0.1 (appVersion policy)"

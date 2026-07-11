#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OTA publish — single-runtime publish (staging / current-train only).
#
# ⚠ PRODUCTION FLEET RULE (2026-07-11): the installed fleet spans MULTIPLE
#   runtimes; this script only reaches the ONE runtime matching app.json's
#   current stamps. To ship a fix to ALL production users, use:
#       bash scripts/ota-publish-fleet.sh "message"
#   (build-once / promote-everywhere / hash-attested delivery.)
#
#   usage:  bash scripts/ota-publish.sh <staging|production> ["update message"]
#
# Three gates, in order — an update that fails ANY gate is NOT published:
#   1. PREFLIGHT (Hermes)  — runs scripts/preflight-build-check.sh: tsc + expo-doctor
#                            + a REAL Hermes bundle export for iOS & Android. This is
#                            the same gate that catches the dynamic-import class of
#                            failure that broke builds 37–42. An OTA can ship that bug
#                            just like a binary can, so it is gated identically.
#   2. NATIVE-DRIFT        — compares the current native fingerprint to the one stamped
#                            at the live store build (.ota-release-fingerprint). If the
#                            native surface changed (new module, permission, SDK, plugin,
#                            app.json native key…), the update is REFUSED — that change
#                            needs a real App Store / Play release, not an OTA.
#   3. PUBLISH (UNSIGNED)  — eas update over HTTPS. Update code signing needs the
#                            EAS Enterprise plan (not on this account), so updates
#                            are NOT cryptographically signed; integrity rests on
#                            HTTPS + EAS account access (protect it with 2FA). See
#                            §2 to enable signing if the account is upgraded.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
die() { echo "${RED}${BLD}❌ OTA ABORTED:${RST} $1" >&2; exit 1; }
ok()  { echo "${GRN}✅ $1${RST}"; }

CHANNEL="${1:-}"
MESSAGE="${2:-}"
# Map the OTA channel to the EAS environment whose env vars (EXPO_PUBLIC_*) get
# baked into the bundle. eas-cli requires --environment in --non-interactive mode.
case "$CHANNEL" in
  staging)    ENVIRONMENT="preview" ;;
  production) ENVIRONMENT="production" ;;
  *) die "first arg must be 'staging' or 'production' (got: '${CHANNEL:-<empty>}')." ;;
esac
# Message is REQUIRED — it shows in `eas update:list` and is what you grep for when
# rolling back. (Also avoids a macOS bash-3.2 empty-array+set -u 'unbound variable'.)
[ -n "$MESSAGE" ] || die "second arg (update message) is required, e.g.: bash scripts/ota-publish.sh $CHANNEL \"fix: corrected benchmark label\""

STAMP=".ota-release-fingerprint"

# NOTE: EAS Update CODE SIGNING requires the EAS Enterprise plan, which this
# account does not have. Updates are published UNSIGNED — secured by HTTPS + EAS
# account access (the standard for most EAS Update apps; protect the account with
# 2FA). To enable signing IF you upgrade to Enterprise: run
#   npx expo-updates codesigning:generate --key-output-directory keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Smart Signals OTA"
#   npx expo-updates codesigning:configure --certificate-input-directory=certs --key-input-directory=keys
# then append `--private-key-path keys/private-key.pem` below and ship a new store
# build so the cert is embedded (keys/ is already gitignored).

# Single native fingerprint over the CNG inputs (app.json, package deps, plugins,
# native files). Any native-affecting change moves this hash.
fingerprint() {
  node -e "require('@expo/fingerprint').createFingerprintAsync(process.cwd()).then(f=>process.stdout.write(f.hash)).catch(e=>{console.error(e);process.exit(1)})"
}

echo "${BLD}── OTA publish → channel: ${CHANNEL} ──${RST}"

# ── GATE 1: preflight Hermes gate ────────────────────────────────────────────
echo "${BLD}[1/3] Preflight (tsc + doctor + Hermes export) …${RST}"
bash scripts/preflight-build-check.sh || die "preflight gate failed — fix the above before publishing."
ok "preflight passed"

# ── GATE 2: native-drift guard ───────────────────────────────────────────────
echo "${BLD}[2/3] Native-drift fingerprint guard …${RST}"
[ -f "$STAMP" ] || die "no $STAMP found. Stamp the live store build first: run 'bash scripts/ota-stamp-release.sh' from the exact commit you shipped to the stores, commit it, THEN publish OTAs."
# Parse as JSON explicitly — the stamp has no .json extension, so require() would
# try to load it as a JS module and throw on the first ':' .
STAMPED_FP="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$STAMP','utf8')).hash||'')" 2>/dev/null || true)"
[ -n "$STAMPED_FP" ] || die "$STAMP is malformed (no .hash). Re-run scripts/ota-stamp-release.sh."
CURRENT_FP="$(fingerprint)"
if [ "$CURRENT_FP" != "$STAMPED_FP" ]; then
  echo "${YLW}  stamped (live build): $STAMPED_FP${RST}"
  echo "${YLW}  current (this tree):  $CURRENT_FP${RST}"
  die "NATIVE FINGERPRINT CHANGED → OTA is NOT allowed. The native layer differs from the shipped build. Cut a new App Store / Play release, then run scripts/ota-stamp-release.sh. (OTA is for JS/asset changes ONLY.)"
fi
ok "native fingerprint matches the live store build ($CURRENT_FP)"

# ── GATE 3: publish ──────────────────────────────────────────────────────────
# ── Gate 2.6 (2026-07-10 P0 post-mortem): the EAS ENVIRONMENT must carry the
# EXPO_PUBLIC config. `eas update --environment X` sources env from the EAS env
# store and IGNORES local .env — an empty environment ships a bundle with a NULL
# supabase client ("Auth not configured" on every device; broke TestFlight+Play
# sign-in on 2026-07-10). Fail CLOSED if any required var is missing.
REQUIRED_VARS="EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_PROJECT_ID"
ENV_LIST=$(npx eas-cli env:list "$ENVIRONMENT" 2>/dev/null || true)
for V in $REQUIRED_VARS; do
  echo "$ENV_LIST" | grep -q "^$V=" || { echo "✗ EAS env '$ENVIRONMENT' is missing $V — populate it (eas env:create) before publishing. ABORTED."; exit 1; }
done
echo "✅ EAS env '$ENVIRONMENT' carries all required EXPO_PUBLIC vars"

echo "${BLD}[3/3] Publishing update to '${CHANNEL}' (env: ${ENVIRONMENT}) …${RST}"
# Publish to the branch named after the channel. The channel→branch link (created
# once in setup — see OTA_UPDATE_RUNBOOK.md) routes it to binaries on that channel.
# --branch and --channel are mutually exclusive on `eas update`; we use --branch.
# --message is always set (required above) → no empty-array expansion (bash-3.2 safe).
npx eas-cli update \
  --branch "$CHANNEL" \
  --environment "$ENVIRONMENT" \
  --message "$MESSAGE" \
  --non-interactive \
  || die "eas update failed (see above)."

ok "OTA published to '${CHANNEL}'."
echo "${BLD}Next:${RST} verify on a device on the '${CHANNEL}' channel — cold-start the app twice (download, then apply). Rollback if needed: ${BLD}bash scripts/ota-publish.sh ${CHANNEL}${RST} of a fixed bundle, or ${BLD}npx eas-cli update:rollback --branch ${CHANNEL}${RST}."

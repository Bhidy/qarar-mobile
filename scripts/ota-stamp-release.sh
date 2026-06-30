#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Stamp the native fingerprint of the build you just shipped to the App Store /
# Play Store. This becomes the baseline the OTA publish guard checks against, so
# OTAs can only target binaries with an IDENTICAL native layer.
#
#   WHEN:  immediately after you build & submit a store release, from the EXACT
#          commit/tree you shipped. Then commit the updated .ota-release-fingerprint.
#   usage: bash scripts/ota-stamp-release.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

GRN=$'\033[32m'; BLD=$'\033[1m'; RST=$'\033[0m'
STAMP=".ota-release-fingerprint"

HASH="$(node -e "require('@expo/fingerprint').createFingerprintAsync(process.cwd()).then(f=>process.stdout.write(f.hash)).catch(e=>{console.error(e);process.exit(1)})")"
VERSION="$(node -e "process.stdout.write(require('./app.json').expo.version)")"
IOS_BUILD="$(node -e "process.stdout.write(String(require('./app.json').expo.ios.buildNumber||''))")"
AND_VC="$(node -e "process.stdout.write(String(require('./app.json').expo.android.versionCode||''))")"
STAMPED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$STAMP" <<JSON
{
  "_comment": "Native fingerprint of the LIVE store build. The OTA publish guard (scripts/ota-publish.sh) refuses to ship an update whose native fingerprint differs from this. Re-stamp after EVERY store release. Do not hand-edit.",
  "hash": "${HASH}",
  "appVersion": "${VERSION}",
  "iosBuildNumber": "${IOS_BUILD}",
  "androidVersionCode": "${AND_VC}",
  "stampedAt": "${STAMPED_AT}"
}
JSON

echo "${GRN}${BLD}✅ Stamped${RST} ${STAMP}"
echo "   hash:    ${HASH}"
echo "   version: ${VERSION} (ios build ${IOS_BUILD} / android vc ${AND_VC})"
echo "${BLD}Now commit it:${RST} git add ${STAMP} && git commit -m \"chore(ota): stamp native fingerprint for v${VERSION}\""

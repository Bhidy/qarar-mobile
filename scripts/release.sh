#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release.sh — THE single store-release entrypoint for Smart Signals mobile.
#
#   bash scripts/release.sh stamp <iosBuild> <androidVersionCode>  # set versions
#   bash scripts/release.sh ios                                    # TestFlight
#   bash scripts/release.sh android                                # AAB + Play
#   bash scripts/release.sh both                                   # parallel
#
# Pipeline per platform (fail-closed at every step):
#   preflight (clean tree, forbidden deps, store-truth build number, disk)
#   → build (iOS: ../build_testflight.sh N — pure xcodebuild + ASC upload;
#            Android: eas build --local, app-bundle, credentials.json signing)
#   → verify-artifact (binary symbol grep + debug-signature tripwire)
#   → tag (ios/N, android/vcN) + RELEASES.md ledger entry
#   → reminder: OTA re-stamp (scripts/ota-stamp-release.sh) for the new binary.
#
# HISTORY / WHY: versions used to live in 6 disagreeing places, builds shipped
# from dirty trees (build 94), and 4 contradictory entrypoints coexisted.
# This script + release-preflight.sh + verify-artifact.sh are the forever-fix:
# ONE entrypoint, truth from the stores, nothing unverified, everything tagged.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
CMD="${1:?usage: release.sh stamp|ios|android|both}"

ok()   { echo "   ✓ $1"; }
fail() { echo "   ✗ $1"; exit 1; }

stamp() {
  local IOS="${1:?stamp needs <iosBuild>}" VC="${2:?stamp needs <androidVersionCode>}"
  # Dual-stamp so bare (committed android/) and CNG (prebuild) modes agree.
  node -e '
    const fs=require("fs");const p="app.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));
    j.expo.ios.buildNumber=String(process.argv[1]); j.expo.android.versionCode=Number(process.argv[2]);
    fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");
  ' "$IOS" "$VC"
  sed -i '' -E "s/versionCode [0-9]+/versionCode $VC/" android/app/build.gradle
  ok "stamped app.json (ios=$IOS, vc=$VC) + android/app/build.gradle (vc=$VC)"
  echo "   → commit this stamp before building (preflight enforces a clean tree)"
}

ledger() { # ledger <platform> <version> <artifact-or-note>
  local F="RELEASES.md"
  [ -f "$F" ] || printf "# Release Ledger\n\nEvery store upload: version, commit, date, artifact. Appended by scripts/release.sh.\n\n| Date | Platform | Build | Commit | Note |\n|---|---|---|---|---|\n" > "$F"
  printf "| %s | %s | %s | %s | %s |\n" "$(date +%F)" "$1" "$2" "$(git rev-parse --short HEAD)" "$3" >> "$F"
}

release_ios() {
  bash scripts/release-preflight.sh > /tmp/ss-preflight.txt || { cat /tmp/ss-preflight.txt; exit 1; }
  cat /tmp/ss-preflight.txt
  local NEXT; NEXT=$(grep -m1 NEXT_IOS_BUILD= /tmp/ss-preflight.txt | cut -d= -f2)
  local STAMPED; STAMPED=$(node -e 'console.log(require("./app.json").expo.ios.buildNumber)')
  [ "$STAMPED" = "$NEXT" ] || fail "app.json iOS buildNumber=$STAMPED but ASC expects $NEXT — run: release.sh stamp $NEXT <vc> && commit"
  ( cd .. && bash build_testflight.sh "$NEXT" )   # archives, verifies (Step 5b hook), uploads
  # IPA lands at mobile/build/export/*.ipa — verified in-pipeline by the Step 5b
  # hook before upload; nothing further to re-check here.
  git tag -f "ios/$NEXT" && ledger iOS "$NEXT" "TestFlight via build_testflight.sh"
  ok "iOS $NEXT uploaded + tagged ios/$NEXT — now run scripts/ota-stamp-release.sh for the new binary"
}

release_android() {
  bash scripts/release-preflight.sh
  local VC; VC=$(node -e 'console.log(require("./app.json").expo.android.versionCode)')
  local OUT="build-android-vc${VC}.aab"
  EAS_NO_VCS=1 eas build -p android --profile preview-aab --local --non-interactive --output "$OUT"
  bash scripts/verify-artifact.sh "$OUT"
  eas submit -p android --profile production --path "$OUT" --non-interactive \
    || fail "Play submit failed — AAB kept at $OUT (verified, re-submit manually)"
  git tag -f "android/vc$VC" && ledger Android "vc$VC" "Play internal via eas submit"
  ok "Android vc$VC uploaded + tagged android/vc$VC — run scripts/ota-stamp-release.sh for the new binary"
}

case "$CMD" in
  stamp)   stamp "${2:-}" "${3:-}";;
  ios)     release_ios;;
  android) release_android;;
  both)    # Parallel per mobile-build-rules (M-series, plenty of disk).
           release_android & AND=$!; release_ios; wait $AND;;
  *) fail "unknown command: $CMD";;
esac

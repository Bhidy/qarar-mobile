#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release-preflight.sh — the gate EVERY store build must pass. Fail-closed.
#
# Enforces the release invariants that repeatedly broke us:
#   1. CLEAN TREE   — no release ever builds from uncommitted state again
#                     (build 94 shipped from a dirty tree; untraceable in git).
#   2. NO FORBIDDEN DEPS — marketplace/subscription/social-login must never
#                     return to mobile (owner rule + App Store Guideline 4.8).
#   3. TRUTH FROM THE STORE — prints the authoritative next iOS build number
#                     from the App Store Connect API (never a stale comment).
#   4. DISK GATE    — from-source RN builds need headroom (same as
#                     build_testflight.sh).
#
# Usage:  bash scripts/release-preflight.sh            # all checks
#         bash scripts/release-preflight.sh --json     # + machine-readable result
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

ok()   { echo "   ✓ $1"; }
fail() { echo "   ✗ FAIL: $1"; exit 1; }

echo "── Release preflight ─────────────────────────────────────────"

# 1. Clean tree — the single biggest source of the release loop.
if [ -n "$(git status --porcelain)" ]; then
  git status --short | head -10
  fail "working tree is DIRTY — commit or stash before any store build (build 94 lesson)"
fi
ok "git tree clean (HEAD $(git rev-parse --short HEAD))"

# 2. Forbidden dependencies — package.json + Podfile.lock + filesystem ghosts.
FORBIDDEN='react-native-purchases|revenuecat|@react-native-google-signin|expo-apple-authentication|GoogleSignIn|AppAuth'
if grep -qiE "$FORBIDDEN" package.json; then fail "forbidden dependency in package.json (marketplace/social-login must never return)"; fi
if [ -f ios/Podfile.lock ] && grep -qiE "AppAuth|GoogleSignIn|RevenueCat|PurchasesHybridCommon" ios/Podfile.lock; then
  fail "forbidden pod in Podfile.lock — run a clean 'pod install' (see ios-stale-googlesignin-pods post-mortem)"
fi
ok "no forbidden deps (payments/social-login) in package.json or Podfile.lock"
for ghost in app/marketplace lib/marketplace components/marketplace context/MarketplaceContext.tsx plugins/with-ios-modular-headers.js; do
  [ -e "$ghost" ] && fail "marketplace/compliance ghost present: $ghost (must stay deleted)"
done
ok "no marketplace/plugin ghosts on disk"

# 3. Truth from the store — authoritative latest iOS build via ASC API.
# RELEASE_PLATFORM=android skips the iOS-only gates (closed train, Info.plist
# bindings) — an Android release must not be blocked by App Store state.
PLATFORM="${RELEASE_PLATFORM:-all}"
ASC_KEY_ID="53QD83W9UK"
ASC_ISSUER_ID="a3879256-fee1-4421-8369-9206ad76ee1c"
ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
[ -f "$ASC_KEY_PATH" ] || fail "ASC key missing: $ASC_KEY_PATH"
if [ "$PLATFORM" = "android" ]; then
  ok "android-only release — iOS closed-train + Info.plist gates skipped"
fi
ASC_OUT=$(node -e '
const crypto=require("crypto"),fs=require("fs");
const KEY_ID=process.argv[1],ISSUER=process.argv[2],KEY=fs.readFileSync(process.argv[3],"utf8");
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const now=Math.floor(Date.now()/1000);
const hdr=b64({alg:"ES256",kid:KEY_ID,typ:"JWT"}),pl=b64({iss:ISSUER,iat:now,exp:now+600,aud:"appstoreconnect-v1"});
const jwt=hdr+"."+pl+"."+crypto.sign("sha256",Buffer.from(hdr+"."+pl),{key:KEY,dsaEncoding:"ieee-p1363"}).toString("base64url");
const bundle=require("./app.json").expo.ios.bundleIdentifier;
(async()=>{
  const H={Authorization:"Bearer "+jwt};
  const apps=await fetch("https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]="+bundle,{headers:H}).then(r=>r.json());
  const app=apps.data&&apps.data[0]; if(!app){console.error("app not found");process.exit(1);}
  const b=await fetch("https://api.appstoreconnect.apple.com/v1/builds?filter[app]="+app.id+"&sort=-version&limit=1",{headers:H}).then(r=>r.json());
  const latest=Number(b.data?.[0]?.attributes?.version||0);
  // Closed-train tripwire: a version that reached the store (READY_FOR_SALE etc.)
  // can never receive another build — the marketing version MUST be bumped.
  // (Error class 90062/90186 — burned build 95 attempt #1 on 2026-07-10.)
  const vs=await fetch("https://api.appstoreconnect.apple.com/v1/apps/"+app.id+"/appStoreVersions?limit=5",{headers:H}).then(r=>r.json());
  // Only APPROVED-class states close a train for uploads (90062). A version merely
  // WAITING_FOR_REVIEW / IN_REVIEW still accepts new builds (verified 2026-07-10:
  // the over-strict list blocked an Android-only release).
  const CLOSED=["READY_FOR_SALE","PENDING_APPLE_RELEASE","PENDING_DEVELOPER_RELEASE","PROCESSING_FOR_APP_STORE"];
  const closed=(vs.data||[]).filter(v=>CLOSED.includes(v.attributes.appStoreState)).map(v=>v.attributes.versionString);
  console.log(JSON.stringify({next:latest+1, closedTrains:closed}));
})().catch(e=>{console.error(e.message);process.exit(1);});
' "$ASC_KEY_ID" "$ASC_ISSUER_ID" "$ASC_KEY_PATH") || fail "ASC query failed"
NEXT_IOS=$(node -e 'console.log(JSON.parse(process.argv[1]).next)' "$ASC_OUT")
APP_VER=$(node -e 'console.log(require("./app.json").expo.version)')
if [ "$PLATFORM" != "android" ]; then
  node -e '
const {closedTrains}=JSON.parse(process.argv[1]);
if(closedTrains.includes(process.argv[2])){console.error("version "+process.argv[2]+" train is CLOSED on the App Store ("+closedTrains.join(",")+") — bump expo.version: scripts/release.sh stamp <ios> <vc> <newVersion>");process.exit(1);}
' "$ASC_OUT" "$APP_VER" || fail "marketing-version train closed"
fi
ok "App Store Connect: next iOS build number = $NEXT_IOS (authoritative); version $APP_VER train open"

# Android: canonical local counter = app.json (Play rejects duplicates at submit,
# and release.sh stamps both app.json AND build.gradle so bare/CNG modes agree).
VC=$(node -e 'console.log(require("./app.json").expo.android.versionCode)')
GRADLE_VC=$(grep -m1 -E "versionCode [0-9]+" android/app/build.gradle | grep -oE "[0-9]+")
[ "$VC" = "$GRADLE_VC" ] || fail "versionCode drift: app.json=$VC vs build.gradle=$GRADLE_VC — run scripts/release.sh stamp"
ok "android versionCode consistent (app.json == build.gradle == $VC)"

# iOS Info.plist MUST reference build-setting variables, not literals — a literal
# CFBundleShortVersionString (e.g. 1.0.0) silently overrode the script's version
# args and bounced build 95 twice (error 90062/90186). The native tree is gitignored
# (CNG); when present on this build machine, enforce the binding. When absent it will
# be generated from app.json (the version source of truth) at prebuild time.
PLIST=ios/SmartSignals/Info.plist
if [ -f "$PLIST" ]; then
  grep -A1 "CFBundleShortVersionString</key>" "$PLIST" | grep -q 'MARKETING_VERSION' \
    || fail "Info.plist CFBundleShortVersionString is a LITERAL — must be \$(MARKETING_VERSION) (build-95 version-bounce trap)"
  grep -A1 "CFBundleVersion</key>" "$PLIST" | grep -q 'CURRENT_PROJECT_VERSION' \
    || fail "Info.plist CFBundleVersion is a LITERAL — must be \$(CURRENT_PROJECT_VERSION)"
  ok "Info.plist versions bind to build settings (MARKETING_VERSION / CURRENT_PROJECT_VERSION)"
else
  ok "native ios/ not generated (gitignored CNG) — versions will come from app.json at prebuild"
fi

# 4. Disk gate.
FREE_GB=$(df -g / | awk 'NR==2 {print $4}')
[ "$FREE_GB" -ge 20 ] || fail "only ${FREE_GB}GB free — from-source builds need ≥20GB"
ok "disk: ${FREE_GB}GB free"

echo "── Preflight PASSED ──────────────────────────────────────────"
echo "NEXT_IOS_BUILD=$NEXT_IOS"
echo "ANDROID_VERSION_CODE=$VC"

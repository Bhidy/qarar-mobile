#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-artifact.sh — MANDATORY post-build binary verification. Fail-closed.
#
# The App Store 4.8 rejection loop happened because a "clean" JS tree still
# produced a binary linking GoogleSignIn/AppAuth (stale pods). The post-mortem
# rule: NEVER trust the source tree — grep the ARTIFACT.
#
#   • IPA: unzip → scan the app binary + embedded frameworks for forbidden
#     symbols (GoogleSignIn / AppAuth / RevenueCat / Purchases).
#   • AAB: scan the bundle for the same forbidden classes AND reject a
#     debug-keystore signature (the build.gradle debug-signing trap).
#
# Usage:  bash scripts/verify-artifact.sh <path-to.ipa|.aab>
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ART="${1:?usage: verify-artifact.sh <artifact.ipa|.aab>}"
[ -f "$ART" ] || { echo "✗ artifact not found: $ART"; exit 1; }
FORBIDDEN='GIDSignIn|GoogleSignIn|OIDAuthorization|AppAuth|RCPurchases|RevenueCat|PurchasesHybridCommon'
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

ok()   { echo "   ✓ $1"; }
fail() { echo "   ✗ VERIFICATION FAILED: $1"; echo "   → DO NOT SHIP $ART"; exit 1; }

echo "── Verifying artifact: $(basename "$ART") ───────────────────"

case "$ART" in
  *.ipa)
    unzip -qq "$ART" -d "$TMP"
    APP_DIR=$(find "$TMP/Payload" -maxdepth 1 -name "*.app" | head -1)
    [ -n "$APP_DIR" ] || fail "no .app in IPA payload"
    # Main binary + every embedded framework binary.
    BIN="$APP_DIR/$(basename "$APP_DIR" .app)"
    HITS=""
    for f in "$BIN" "$APP_DIR"/Frameworks/*.framework/* "$APP_DIR"/Frameworks/*.dylib; do
      [ -f "$f" ] || continue
      if strings - "$f" 2>/dev/null | grep -qE "$FORBIDDEN"; then HITS="$HITS $(basename "$f")"; fi
    done
    # Framework NAMES are an even stronger signal than strings.
    ls "$APP_DIR/Frameworks" 2>/dev/null | grep -qiE "GoogleSignIn|AppAuth|RevenueCat|Purchases" && HITS="$HITS framework-name"
    [ -z "$HITS" ] || fail "forbidden symbols in:$HITS (stale pods? clean 'pod install' + rebuild)"
    ok "binary + frameworks clean of GoogleSignIn/AppAuth/RevenueCat symbols"
    # REQUIRED strings (2026-07-10): the embedded JS bundle must carry the supabase
    # config — a bundle without it ships a NULL auth client ("Auth not configured").
    JSB=$(find "$APP_DIR" -name "main.jsbundle" | head -1)
    if [ -n "$JSB" ]; then
      grep -aq "iwwjpzkfxoglugjqkznc" "$JSB" || fail "embedded JS bundle is MISSING the supabase URL (env not inlined at export)"
      ok "embedded JS bundle carries the supabase config"
    else
      echo "   ⚠ main.jsbundle not found in .app — verify env inlining manually"
    fi
    ;;
  *.aab|*.apk)
    # Forbidden classes anywhere in the bundle (dex strings survive a raw scan).
    if strings - "$ART" 2>/dev/null | grep -qE "com\.revenuecat|com\.google\.android\.gms\.auth\.api\.signin|net\.openid\.appauth"; then
      fail "forbidden Android classes present (RevenueCat / GoogleSignIn / AppAuth)"
    fi
    ok "bundle clean of RevenueCat/GoogleSignIn/AppAuth classes"
    # REQUIRED config (2026-07-10 P0): the embedded JS bundle inside the AAB must
    # carry the supabase URL. AAB entries are DEFLATED — a grep on the raw zip
    # cannot see inside; unzip and check the actual bundle asset.
    AABTMP=$(mktemp -d)
    unzip -qq "$ART" -d "$AABTMP" 2>/dev/null || true
    JSA=$(find "$AABTMP" -name "index.android.bundle" -o -name "*.hbc" 2>/dev/null | head -1)
    if [ -n "$JSA" ]; then
      grep -aq "iwwjpzkfxoglugjqkznc" "$JSA" || { rm -rf "$AABTMP"; fail "embedded Android JS bundle is MISSING the supabase URL (env not inlined at export)"; }
      ok "embedded Android JS bundle carries the supabase config"
    else
      echo "   ⚠ JS bundle asset not found inside AAB — verify env inlining manually"
    fi
    rm -rf "$AABTMP"
    # Signature: reject the debug keystore (CN=Android Debug) — the gradle trap.
    CERT=$(keytool -printcert -jarfile "$ART" 2>/dev/null | head -5 || true)
    echo "$CERT" | grep -q "Android Debug" && fail "artifact is DEBUG-SIGNED (build.gradle debug-keystore trap) — unshippable"
    echo "$CERT" | grep -q "Owner:" && ok "release-signed: $(echo "$CERT" | grep -m1 'Owner:' | cut -c1-70)" \
      || echo "   ⚠ could not read signature (jarsigner-era bundle?) — verify manually"
    ;;
  *) fail "unknown artifact type (expected .ipa/.aab/.apk)";;
esac

echo "── Artifact VERIFIED — safe to ship ──────────────────────────"

# ── EMBEDDED RUNTIME GATE (build-99 incident, 2026-07-10) ────────────────────
# A binary whose embedded expo-updates runtime differs from app.json's
# expo.version is ORPHANED from every OTA. Refuse to ship one.
EXPECT_RT=$(node -e 'console.log(require("./app.json").expo.version)')
case "$1" in
  *.ipa)
    RT=$(unzip -p "$1" "Payload/*.app/Expo.plist" 2>/dev/null | plutil -extract EXUpdatesRuntimeVersion raw - 2>/dev/null || echo MISSING)
    [ "$RT" = "$EXPECT_RT" ] || { echo "   ✗ embedded iOS runtime '$RT' != expected '$EXPECT_RT' — OTA-orphaned binary, DO NOT SHIP"; exit 1; }
    echo "   ✓ embedded iOS runtime = $RT (matches app.json)";;
  *.aab)
    if unzip -p "$1" base/manifest/AndroidManifest.xml 2>/dev/null | grep -q "file:fingerprint"; then
      echo "   ✗ Android manifest still carries the fingerprint runtime policy — OTA-orphaned binary, DO NOT SHIP"; exit 1
    fi
    unzip -p "$1" base/manifest/AndroidManifest.xml 2>/dev/null | grep -q "$EXPECT_RT" \
      && echo "   ✓ embedded Android runtime string '$EXPECT_RT' present" \
      || { echo "   ✗ expected runtime '$EXPECT_RT' not found in Android manifest — DO NOT SHIP"; exit 1; };;
esac

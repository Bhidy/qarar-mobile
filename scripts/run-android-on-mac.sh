#!/usr/bin/env bash
# Run the Android app on macOS like a real phone — windowed emulator + your build.
#
#   bash scripts/run-android-on-mac.sh            # launch emulator + install newest AAB
#   bash scripts/run-android-on-mac.sh <file.aab> # use a specific AAB
#
# The emulator IS a real Android 15 device (Google Play services incl.). Drive it with
# your mouse + keyboard. Log in with the QA account in setup/TEST_ACCOUNT.md.
set -euo pipefail

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
JH="$(/usr/bin/java -XshowSettings:properties -version 2>&1 | awk -F= '/java.home/{gsub(/ /,"",$2);print $2}')"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
BT="$HOME/.bundletool/bundletool.jar"
AVD="ss_audit"

AAB="${1:-$(ls -t "$HERE"/build-android-*.aab "$HERE"/build/*.aab 2>/dev/null | head -1)}"
[ -f "$AAB" ] || { echo "No AAB found. Pass one: bash $0 path/to/app.aab"; exit 1; }
echo "▶ AAB: $AAB"

# 0. bundletool (one-time download; converts AAB -> installable universal APK)
if [ ! -f "$BT" ]; then
  echo "▶ fetching bundletool…"; mkdir -p "$(dirname "$BT")"
  curl -sL -o "$BT" https://github.com/google/bundletool/releases/download/1.17.2/bundletool-all-1.17.2.jar
fi

# 1. AVD (one-time create). Pixel 7, Android 35, Google APIs, arm64 (Apple Silicon).
if ! avdmanager list avd 2>/dev/null | grep -q "Name: $AVD"; then
  echo "▶ creating AVD $AVD (one-time)…"
  yes | sdkmanager "system-images;android-35;google_apis;arm64-v8a" >/dev/null
  echo "no" | avdmanager create avd -n "$AVD" \
    -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7 --force
fi

# 2. Boot the emulator WITH a window if not already up
if ! adb devices | grep -q emulator; then
  echo "▶ booting emulator window…"
  "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -gpu auto -no-snapshot-save >/tmp/ss-emu.log 2>&1 &
  echo -n "  waiting for boot"
  until adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do echo -n .; sleep 3; done; echo " up"
fi

# 3. AAB -> signed universal APK (signing is emulator-only; app has no attestation)
CJ="$HERE/credentials.json"
KS=$(python3 -c "import json;print(json.load(open('$CJ'))['android']['keystore']['keystorePath'])")
KA=$(python3 -c "import json;print(json.load(open('$CJ'))['android']['keystore']['keyAlias'])")
PW=$(python3 -c "import json;print(json.load(open('$CJ'))['android']['keystore']['keystorePassword'])")
TMP="$(mktemp -d)"
echo "▶ building universal APK…"
"$JH/bin/java" -jar "$BT" build-apks --bundle="$AAB" --output="$TMP/a.apks" --mode=universal \
  --ks="$KS" --ks-key-alias="$KA" --ks-pass=pass:"$PW" --key-pass=pass:"$PW" --overwrite
unzip -o -q "$TMP/a.apks" universal.apk -d "$TMP"

PKG=$("$ANDROID_HOME"/build-tools/*/aapt2 dump packagename "$TMP/universal.apk" 2>/dev/null | tail -1)
echo "▶ installing $PKG…"
adb install -r "$TMP/universal.apk" >/dev/null
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || \
  adb shell am start -n "$PKG/.MainActivity" >/dev/null 2>&1
rm -rf "$TMP"
echo "✅ $PKG is running in the emulator window. Log in with setup/TEST_ACCOUNT.md."

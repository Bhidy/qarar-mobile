#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ota-publish-fleet.sh — THE sanctioned way to ship a production OTA (2026-07-11).
#
#   usage:  bash scripts/ota-publish-fleet.sh "update message"
#
# WHY THIS EXISTS (root cause of the "published but nothing changed" loop):
#   1. The fleet spans MULTIPLE runtimes (current train + stable 1.0.1 +
#      legacy per-build fingerprint runtimes 94-97/vc16-19). A plain
#      `ota-publish.sh production` only reaches the ONE runtime matching
#      app.json's current stamps — most devices never see it.
#   2. `eas update` re-bundles per publish and Metro output is NOT
#      deterministic — hash-attestation on 2026-07-11 proved two different
#      bundle variants across one fleet run, i.e. unverifiable bytes.
#
# THE FIX — enterprise build-once / promote-everywhere / attest:
#   GATE 1  preflight        tsc + expo-doctor + real Hermes export (unchanged).
#   GATE 2  EAS env          the production env store must carry EXPO_PUBLIC_*
#                            (2026-07-10 P0: empty env = fleet-wide broken auth).
#   BUILD   export ONCE      `eas env:exec production -- expo export` → a single
#                            artifact whose bytes are verified locally.
#   GATE 3  artifact verify  env markers baked in + SHA-256 recorded per platform.
#   PROMOTE per tuple        stamp app.json from fleet-runtimes.json, upload the
#                            SAME artifact with `eas update --skip-bundler`.
#                            Byte-identical JS on every runtime, by construction.
#   GATE 4  attestation      fetch the update manifest for EVERY (runtime,
#                            platform) exactly as a device does and assert the
#                            served launchAsset.hash == the local artifact hash.
#                            No green light until the CDN provably serves the
#                            verified bytes to every fleet member.
#
# MAINTENANCE: keep fleet-runtimes.json in sync at every store release.
# Rollback:   npx eas-cli update:rollback --branch production (per runtime), or
#             re-run this script from a good commit.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; BLD=$'\033[1m'; RST=$'\033[0m'
die() { echo "${RED}${BLD}❌ FLEET OTA ABORTED:${RST} $1" >&2; exit 1; }
ok()  { echo "${GRN}✅ $1${RST}"; }

MESSAGE="${1:-}"
[ -n "$MESSAGE" ] || die "usage: bash scripts/ota-publish-fleet.sh \"update message\""

FLEET="fleet-runtimes.json"
[ -f "$FLEET" ] || die "$FLEET not found — the fleet registry is required."
CHANNEL="$(node -e "process.stdout.write(require('./$FLEET').channel)")"
DIST="dist-fleet"

git diff --quiet -- app.json || die "app.json has uncommitted changes — commit or checkout first (the promote loop stamps and restores it via git)."

# ── GATE 1: preflight (tsc + doctor + Hermes) ────────────────────────────────
echo "${BLD}[1/6] Preflight (tsc + doctor + Hermes export) …${RST}"
bash scripts/preflight-build-check.sh || die "preflight gate failed."
ok "preflight passed"

# ── GATE 2: EAS env store must carry the EXPO_PUBLIC config ─────────────────
echo "${BLD}[2/6] EAS 'production' env check …${RST}"
REQUIRED_VARS="EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_PROJECT_ID"
ENV_LIST=$(npx eas-cli env:list production 2>/dev/null || true)
for V in $REQUIRED_VARS; do
  echo "$ENV_LIST" | grep -q "^$V=" || die "EAS env 'production' is missing $V — populate it (eas env:create) first."
done
ok "EAS env carries all required EXPO_PUBLIC vars"

# ── BUILD ONCE: single verified artifact ─────────────────────────────────────
echo "${BLD}[3/6] Exporting ONE bundle with production env baked in …${RST}"
rm -rf "$DIST"
npx eas-cli env:exec production "npx expo export --platform ios --platform android --output-dir $DIST" >/tmp/_fleet_export.log 2>&1 \
  || { tail -30 /tmp/_fleet_export.log; die "expo export failed (full log: /tmp/_fleet_export.log)"; }
ok "exported → $DIST"

# ── GATE 3: artifact verification (env baked + hashes recorded) ─────────────
echo "${BLD}[4/6] Verifying artifact content …${RST}"
node - "$DIST" <<'NODE' || die "artifact verification failed"
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dist = process.argv[2];
const out = {};
for (const platform of ["ios", "android"]) {
  const dir = path.join(dist, "_expo/static/js", platform);
  const entry = fs.readdirSync(dir).find(f => f.endsWith(".hbc"));
  if (!entry) { console.error(`no .hbc bundle for ${platform}`); process.exit(1); }
  const buf = fs.readFileSync(path.join(dir, entry));
  // Env must be baked (2026-07-10 P0: env-less bundles broke sign-in fleet-wide).
  if (!buf.includes(Buffer.from("supabase.co"))) {
    console.error(`${platform}: EXPO_PUBLIC env NOT baked into bundle — refusing to publish`);
    process.exit(1);
  }
  const hash = crypto.createHash("sha256").update(buf).digest("base64url");
  out[platform] = hash;
  console.log(`  ${platform}: ${entry} (${(buf.length/1048576).toFixed(1)}MB) sha256=${hash} env=baked`);
}
fs.writeFileSync("/tmp/_fleet_hashes.json", JSON.stringify(out));
NODE
ok "artifact verified — hashes recorded"

# ── PROMOTE: same artifact to every fleet runtime ────────────────────────────
echo "${BLD}[5/6] Promoting the artifact to every fleet runtime …${RST}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
N_TUPLES="$(node -e "process.stdout.write(String(require('./$FLEET').tuples.length))")"
restore() { git checkout -- app.json 2>/dev/null || true; }
trap restore EXIT

FAILED=""
for ((i=0; i<N_TUPLES; i++)); do
  LABEL="$(node -e "process.stdout.write(require('./$FLEET').tuples[$i].label)")"
  echo "${BLD}── tuple $((i+1))/$N_TUPLES: $LABEL ──${RST}"
  node - "$FLEET" "$i" <<'NODE'
const fs = require("fs");
const t = require(`${process.cwd()}/${process.argv[2]}`).tuples[Number(process.argv[3])];
const j = JSON.parse(fs.readFileSync("app.json", "utf8"));
// Stamp the EXACT runtime strings the target binaries request (per platform),
// straight from the registry. Never re-derive via a policy: fingerprint
// recomputation drifts with ANY tree change (proven 2026-07-12 — four legacy
// tuples published to freshly-computed hashes no live binary requests, caught
// by attestation). Explicit strings make the registry the source of truth.
j.expo.version = t.version;
delete j.expo.runtimeVersion;
j.expo.ios.runtimeVersion = t.expect.ios;
j.expo.android.runtimeVersion = t.expect.android;
j.expo.ios.buildNumber = String(t.iosBuild);
j.expo.android.versionCode = Number(t.androidVc);
fs.writeFileSync("app.json", JSON.stringify(j, null, 2) + "\n");
NODE
  # --environment is CLI-mandatory in --non-interactive mode even though
  # --skip-bundler means no bundling happens (env was baked at export time).
  if ! npx eas-cli update --branch "$CHANNEL" --skip-bundler --input-dir "$DIST" \
        --environment production \
        --message "$MESSAGE [$LABEL]" --non-interactive >/tmp/_fleet_pub_$i.log 2>&1; then
    tail -12 "/tmp/_fleet_pub_$i.log"
    FAILED="$FAILED [$LABEL]"
    echo "${YLW}⚠ publish FAILED for '$LABEL' — continuing with remaining tuples${RST}"
  else
    grep -E "Runtime version|Update group ID" "/tmp/_fleet_pub_$i.log" | sed 's/^/  /' || true
  fi
  git checkout -- app.json
done
restore
trap - EXIT

# Re-baseline the single-runtime guard used by ota-publish.sh (staging etc.).
bash scripts/ota-stamp-release.sh >/dev/null || true

[ -z "$FAILED" ] || die "some tuples failed to publish:$FAILED — fix and re-run (safe: promotes are idempotent)."
ok "all $N_TUPLES tuples published"

# ── GATE 4: delivery attestation (device-simulation, hash equality) ─────────
echo "${BLD}[6/6] Attesting delivery for every (runtime, platform) …${RST}"
node - "$FLEET" "$STARTED_AT" <<'NODE' || die "ATTESTATION FAILED — the CDN is NOT serving the verified artifact to every runtime. Do NOT trust this publish; investigate before announcing."
const { execFileSync } = require("child_process");
const fleet = require(`${process.cwd()}/${process.argv[2]}`);
const startedAt = process.argv[3];
const expected = JSON.parse(require("fs").readFileSync("/tmp/_fleet_hashes.json", "utf8"));
const URL = "https://u.expo.dev/8d61ac43-8ae4-4fe3-a101-558817aabe3e";
let fails = 0;
for (const t of fleet.tuples) {
  for (const platform of ["ios", "android"]) {
    const runtime = t.expect[platform];
    const raw = execFileSync("curl", ["-s", URL,
      "-H", "expo-protocol-version: 1",
      "-H", `expo-platform: ${platform}`,
      "-H", `expo-runtime-version: ${runtime}`,
      "-H", `expo-channel-name: ${fleet.channel}`,
      "-H", "accept: multipart/mixed"], { maxBuffer: 16 * 1024 * 1024 });
    let manifest = null;
    const start = raw.indexOf('{"id":');
    if (start !== -1) {
      const end = raw.indexOf("\r\n--", start);
      try { manifest = JSON.parse(raw.slice(start, end === -1 ? undefined : end)); } catch {}
    }
    if (!manifest) { console.log(`❌ ${t.label} ${platform}: no manifest returned`); fails++; continue; }
    const hashOk = manifest.launchAsset && manifest.launchAsset.hash === expected[platform];
    const freshOk = manifest.createdAt >= startedAt;
    if (hashOk && freshOk) {
      console.log(`✅ ${t.label} ${platform}: serves verified bundle (update ${manifest.id.slice(0,8)}…)`);
    } else {
      console.log(`❌ ${t.label} ${platform}: hash ${hashOk ? "ok" : "MISMATCH (" + (manifest.launchAsset||{}).hash + ")"} fresh ${freshOk ? "ok" : "STALE (" + manifest.createdAt + ")"}`);
      fails++;
    }
  }
}
if (fails) { console.error(`\n${fails} combos NOT serving the verified artifact`); process.exit(1); }
console.log("\nAll fleet runtimes provably serve the verified artifact.");
NODE
ok "ATTESTED — every fleet runtime serves the exact verified bundle."
echo "${BLD}Devices apply it on next launch (≤8s window) or the cold start after. Verify any device: Profile → footer shows the Bundle id.${RST}"

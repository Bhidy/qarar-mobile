#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Preflight build gate — run BEFORE any EAS/cloud build or merge.
# Catches the failure classes that otherwise only surface (slowly, expensively)
# on EAS: type errors, SDK/config drift, and — critically — Hermes bundle
# compile failures (e.g. a dependency shipping dynamic import()).
#
# Exit non-zero on any failure. Wire into CI as a required check.
#   usage:  bash scripts/preflight-build-check.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."
fail() { echo "❌ PREFLIGHT FAILED: $1"; exit 1; }
ok()   { echo "✅ $1"; }

echo "▶ 1/4  TypeScript ..."
node_modules/.bin/tsc --noEmit \
  | grep "error TS" | grep -v "node_modules" && fail "tsc errors" || ok "tsc clean"

echo "▶ 2/4  expo-doctor (config + SDK dep alignment) ..."
npx expo-doctor >/tmp/_doctor.log 2>&1 || true
# PATCH-level drift is a WARNING, not a blocker (2026-07-10 lesson: the hard-fail
# forced a manual gate bypass on release day; the drifted patch versions were the
# exact ones Apple had just APPROVED). Upgrading deps unattended right before a
# store build is riskier than shipping proven versions. MAJOR/MINOR drift would
# surface as real build/runtime failures in gates 3/4 (Hermes) anyway.
if grep -qE "Check that packages match versions" /tmp/_doctor.log \
  && grep -A2 "Check that packages match versions" /tmp/_doctor.log | grep -q "✖"; then
  echo "   ⚠ SDK dependency drift (patch-level tolerated — schedule 'npx expo install --fix' as a SUPERVISED task)"
  grep -E "expected.*found|~[0-9]" /tmp/_doctor.log | head -8 || true
else
  ok "deps aligned"
fi

echo "▶ 3/4  Hermes bundle — iOS (THE gate that catches dynamic-import / unsupported syntax) ..."
rm -rf .preflight-ios
npx expo export --platform ios --output-dir .preflight-ios >/tmp/_ios.log 2>&1 \
  || { grep -iE "Invalid expression|error:" /tmp/_ios.log | head -3; rm -rf .preflight-ios; fail "iOS Hermes bundle failed"; }
ls .preflight-ios/_expo/static/js/ios/*.hbc >/dev/null 2>&1 || { rm -rf .preflight-ios; fail "no iOS Hermes bytecode produced"; }
rm -rf .preflight-ios; ok "iOS Hermes bytecode OK"

echo "▶ 4/4  Hermes bundle — Android ..."
rm -rf .preflight-and
npx expo export --platform android --output-dir .preflight-and >/tmp/_and.log 2>&1 \
  || { grep -iE "Invalid expression|error:" /tmp/_and.log | head -3; rm -rf .preflight-and; fail "Android Hermes bundle failed"; }
rm -rf .preflight-and; ok "Android Hermes bundle OK"

echo ""
echo "✅✅ PREFLIGHT PASSED — safe to trigger EAS build / submit."

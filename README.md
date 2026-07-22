# Smart Signals — Mobile

Premium EGX / Tadawul investment‑intelligence app (iOS + Android). Bilingual
(English / Arabic with full RTL), dark‑first design, delivering technical &
fundamental research signals, news, podcasts, and performance tracking — backed
by Supabase and shipped over‑the‑air with EAS Update.

This is the React Native (Expo) client. The web platform and admin live in the
companion repo **[`qarar-web`](https://github.com/Bhidy/qarar-web)** and both
share the same Supabase backend.

---

## Status

| | |
|---|---|
| **App name** | Smart Signals |
| **Bundle id / package** | `com.rumble.pro` |
| **Platforms** | iOS 16.4+ · Android |
| **iOS build** | `82` (TestFlight) |
| **Android** | versionCode `7`, internal track |
| **Stores** | Apple App Store ID `6772120783` · Google Play internal testing |

> **Brand history:** the project has been through `Rumble Pro` → `Qarar` →
> `Smart Signals`. The npm package name was de-branded to `smartsignals-mobile`
> (2026-07-22); only the **bundle id / package** `com.rumble.pro` retains the
> earliest name.
>
> ⚠️ **`com.rumble.pro` is permanent and must not be "cleaned up."** Google Play
> freezes the package name at first publish and App Store Connect freezes the
> bundle ID at first build upload — so this string is welded to both live
> listings, to FCM (`google-services.json`), and to the APNs push topic. Editing
> it anywhere does not rename anything; it breaks push, breaks the Play download
> link, and makes the next AAB unuploadable. Retiring the legacy name requires a
> **new Play listing under a new package**, not a code edit — costed in
> [`setup/BUNDLE_ID_DEBRAND_ANALYSIS.md`](../setup/BUNDLE_ID_DEBRAND_ANALYSIS.md).
> The `rumblepro://` OAuth scheme is likewise load-bearing: if it is ever
> changed it must be **added alongside**, never swapped.

---

## Tech stack

- **Expo SDK 56** · **React Native 0.85** · **React 19** · New Architecture (Hermes)
- **expo-router** (typed routes) for file‑based navigation
- **Supabase** (`@supabase/supabase-js`) — auth, data, realtime, storage
- **RevenueCat** (`react-native-purchases`) — in‑app subscriptions
- **Google Sign‑In** + **expo-local-authentication** (biometric app lock)
- **Reanimated 4** + Worklets, expo-blur / linear-gradient, react-native-svg, WebView
- **EAS Update** (expo-updates) — OTA delivery
- **i18n fonts:** Cairo & IBM Plex Sans Arabic (AR) · Manrope & Sora (Latin)

---

## Project structure

```
app/                Expo Router routes (screens)
  tabs/             Tab navigator: home, technical, fundamental, insights, news, podcast, inbox
  stock/[ticker]    Stock detail (live chart, signals)
  article/, news/, technical-article/   Content detail screens
  login, onboarding, biometric, subscribe, profile, edit-profile, search, research
components/         Shared UI (cards, badges, covers, backgrounds, headers)
constants/          Theme, translations, market data (EGX/Saudi/USA), site config
context/            AuthContext, ThemeContext
hooks/              Data fetching + view helpers
lib/                Supabase client, IAP, call-updates, notifications routing, rich-text, embeds
scripts/            OTA publish + pre-flight build checks
plugins/            Expo config plugins (with-fast-android)
patches/            patch-package patches
assets/             Icons, splash, brand, logos
```

Native projects (`ios/`, `android/`) are **continuously generated** from
`app.json` (Expo CNG) and are intentionally **not** committed — never hand‑edit
them; run `expo prebuild` to regenerate.

---

## Getting started

**Prerequisites:** Node 18+, the EAS CLI (`npm i -g eas-cli`), Xcode 16+ (iOS)
and/or Android Studio.

```bash
npm install            # also runs patch-package
cp .env.example .env   # fill in real values (see below)
npm start              # Expo dev server
npm run ios            # build & run on iOS
npm run android        # build & run on Android
```

### Environment

All runtime config is `EXPO_PUBLIC_*` (bundled into the client — client‑safe
values only). Copy `.env.example` → `.env` and populate it. Build‑time values
are also injected via `eas.json` per profile. **Never** put the Supabase
`service_role` key (or any private key) in this app.

---

## Builds & releases (EAS)

Profiles are defined in `eas.json`:

| Profile | Output | Channel |
|---|---|---|
| `development` | dev client | staging |
| `preview` | internal APK | staging |
| `preview-aab` | internal AAB | staging |
| `production` | store build (auto‑increment) | production |

```bash
# ⚠️ DEPRECATED — EAS CLOUD builds are FORBIDDEN (owner rule: local-only).
# THE single sanctioned release path (preflight → build → verify → upload → tag):
bash scripts/release.sh ios       # TestFlight (pure xcodebuild via ../build_testflight.sh)
bash scripts/release.sh android   # AAB via eas --local + Play submit
bash scripts/release.sh both      # parallel
# Version stamping (authoritative iOS number from scripts/release-preflight.sh):
bash scripts/release.sh stamp <iosBuild> <androidVersionCode>   # then commit
```

`scripts/preflight-build-check.sh` runs sanity checks before a build.

### OTA updates

JS‑only changes ship without a store review via EAS Update:

```bash
scripts/ota-publish.sh        # publish to a channel (Hermes-gated, native-drift guarded)
scripts/ota-stamp-release.sh  # stamp the release fingerprint
```

`runtimeVersion` follows `appVersion`; updates with a native‑code change require
a new store build.

---

## Security

- Secrets are kept out of git: `.env`, `credentials.json`, keystores (`*.jks`,
  `*.p8`, `*.p12`, `*.keystore`), and all build outputs are gitignored.
- `google-services.json` contains only the Firebase **client** API key (safe to
  ship in apps); restrict it in the Google Cloud console.
- The only Supabase key in the client is the **anon** key, protected by
  row‑level security on the backend.

---

## Related

- **Web / admin:** [`qarar-web`](https://github.com/Bhidy/qarar-web)
- Backend: Supabase (project `smart-signals`)

const { withPodfile } = require("@expo/config-plugins");

/**
 * iOS: force modular headers on the Google C-pods.
 *
 * Google Sign-In (7.x, pulled by @react-native-google-signin) now depends on
 * AppCheckCore — a Swift pod — which in turn depends on GoogleUtilities and
 * RecaptchaInterop. Those are plain C pods that don't define modules, so when the
 * app is built with STATIC libraries (our setup) the Swift pod can't `import` them
 * and `pod install` fails with "cannot yet be integrated as static libraries".
 *
 * Forcing `:modular_headers => true` on just these pods generates module maps for
 * them, so the static build links cleanly. We do NOT flip `use_modular_headers!`
 * globally because that can break the from-source React-Native pods.
 *
 * CNG-durable: this runs on every `expo prebuild`, so the Podfile always carries
 * the fix even though ios/ is gitignored and regenerated.
 */
const PODS = ["GoogleUtilities", "RecaptchaInterop", "GTMSessionFetcher", "AppAuth"];
const MARKER = "# >>> ios modular-headers (with-ios-modular-headers.js) >>>";

module.exports = function withIosModularHeaders(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes(MARKER)) {
      const block =
        `\n  ${MARKER}\n` +
        PODS.map((p) => `  pod '${p}', :modular_headers => true`).join("\n") +
        `\n`;
      // Insert right after `use_expo_modules!` inside the app target.
      contents = contents.replace(/(use_expo_modules!\s*\n)/, `$1${block}`);
      cfg.modResults.contents = contents;
    }
    return cfg;
  });
};

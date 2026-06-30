// Speed plugin: build Android for arm64-v8a ONLY when FAST_ANDROID=1 is set.
// Modern phones are all arm64 → ~4x faster builds (skips armeabi-v7a / x86 / x86_64).
// No-op unless FAST_ANDROID=1, so production (.aab for Play) still builds all ABIs.
// Used by the `preview` EAS profile (env.FAST_ANDROID="1") and local builds.
const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withFastAndroid(config) {
  if (process.env.FAST_ANDROID !== "1") return config;
  return withGradleProperties(config, (cfg) => {
    const key = "reactNativeArchitectures";
    cfg.modResults = cfg.modResults.filter(
      (p) => !(p.type === "property" && p.key === key)
    );
    cfg.modResults.push({ type: "property", key, value: "arm64-v8a" });
    return cfg;
  });
};

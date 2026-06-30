const { withGradleProperties } = require("@expo/config-plugins");

/**
 * Raise the Gradle JVM memory for the from-source Android build.
 *
 * Expo's generated android/gradle.properties defaults to
 * `-Xmx2048m -XX:MaxMetaspaceSize=512m`. That metaspace is too small for the
 * Kotlin Symbol Processing (KSP) step on this project (expo-updates etc.) and the
 * build dies with `java.lang.OutOfMemoryError: Metaspace` — especially on a 16GB
 * machine. `eas build --local` re-runs prebuild and regenerates gradle.properties,
 * so a direct file edit is wiped; this CNG-durable plugin re-applies the bump on
 * every prebuild. workers.max is trimmed so peak RAM stays bounded on 16GB.
 */
const JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=2048m -XX:+UseParallelGC";

module.exports = function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const set = (key, value) => {
      const found = props.find((p) => p.type === "property" && p.key === key);
      if (found) found.value = value;
      else props.push({ type: "property", key, value });
    };
    set("org.gradle.jvmargs", JVM_ARGS);
    set("org.gradle.workers.max", "3");
    return cfg;
  });
};

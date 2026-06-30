import { Tabs } from "expo-router";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "@/components/shared/AppText";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useTheme } from "@/context/ThemeContext";

type TabKey = "index" | "fundamental" | "technical" | "news" | "podcast";
type TabCfg = { icon: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap; en: string; ar: string };

const TABS: Record<TabKey, TabCfg> = {
  index:       { icon: "home",          outline: "home-outline",          en: "Home",        ar: "الرئيسية" },
  fundamental: { icon: "bar-chart",     outline: "bar-chart-outline",     en: "Fundamental", ar: "أساسي" },
  technical:   { icon: "trending-up",   outline: "trending-up-outline",   en: "Technical",   ar: "فني" },
  news:        { icon: "newspaper",     outline: "newspaper-outline",     en: "News",        ar: "أخبار" },
  // Podcast replaces Inbox in the tab bar (per product direction). Inbox remains
  // reachable via the bell icon in the Home header, and `/inbox` deep-links still
  // resolve so push-notification routing isn't broken.
  podcast:     { icon: "headset",       outline: "headset-outline",       en: "Podcast",     ar: "بودكاست" },
};

/**
 * Floating, glassy premium tab bar. A frosted BlurView card detached from the
 * screen edges (rounded + shadow), one row of icon+label tabs. Labels are forced
 * to a single line (numberOfLines=1) — fixes the previous 2-line "Fundam/ental"
 * wrap. React Navigation reserves this bar's height, so content is never hidden.
 */
function GlassTabBar({ state, navigation }: any) {
  const C = useColors();
  const { isDark, language } = useTheme();
  const isAr = language === "ar";
  const insets = useSafeAreaInsets();
  // The OS app-icon badge is synced centrally in DataProvider (always mounted), so
  // it stays correct even on a cold deep-link into Inbox before this bar mounts.

  // Visual order follows the route order; mirror for RTL.
  const ordered = isAr ? [...state.routes].reverse() : state.routes;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView
        intensity={isDark ? 40 : 55}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.bar,
          {
            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(16,23,41,0.08)",
            // translucent fill so it reads as glass even where the OS blur is weak (Android)
            backgroundColor: isDark ? "rgba(14,23,41,0.55)" : "rgba(255,255,255,0.62)",
          },
        ]}
      >
        {ordered.map((route: any) => {
          const cfg = TABS[route.name as TabKey];
          if (!cfg) return null;
          const realIndex = state.routes.findIndex((r: any) => r.key === route.key);
          const focused = state.index === realIndex;
          // No tab carries an unread badge — the Home header bell + the OS app-icon
          // badge (synced in DataProvider) represent unread.

          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              hitSlop={8}
              android_ripple={{ color: `${C.primary}22`, radius: 36, borderless: true }}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={isAr ? cfg.ar : cfg.en}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: `${C.primary}1F` }]}>
                <Ionicons name={focused ? cfg.icon : cfg.outline} size={20} color={focused ? C.primary : C.text.muted} />
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, { color: focused ? C.primary : C.text.muted, fontWeight: focused ? "700" : "600" }]}
              >
                {isAr ? cfg.ar : cfg.en}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        // Float the bar so scenes are NOT inset for it — content shows through the
        // transparent margins around the glass card.
        tabBarStyle: { position: "absolute", borderTopWidth: 0, elevation: 0, backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="fundamental" />
      <Tabs.Screen name="technical" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="podcast" />
      {/* Inbox lives inside the tab navigator so the bottom nav stays visible, but it
          has no tab button (not in TABS → GlassTabBar skips it). Reached via the
          Home header bell (router.push("/tabs/inbox")) and push deep-links. */}
      <Tabs.Screen name="inbox" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Absolute overlay → the navigator reserves NO space for it, so screen content
    // scrolls UNDER and BESIDE the floating glass bar (transparent margins). Each
    // scroll screen adds TAB_BAR_CLEARANCE bottom padding so nothing hides behind it.
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 6,
    // soft float shadow
    shadowColor: "#0A0A0B",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
    maxWidth: "100%",
  },
});

/**
 * Watchlist — every ticker the user bookmarked via the stock page's "Watch"
 * toggle (AsyncStorage `@watch:{ticker}` = "1"). Read on every focus so a
 * toggle made on any stock page is reflected the moment the user returns.
 * Entry point: Profile → "My Watchlist". Local-only (no server sync).
 */
import { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, FlatList } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { TickerLogo } from "@/components/shared/TickerLogo";
import { EmptyState } from "@/components/shared/EmptyState";
import { useData } from "@/hooks/useData";
import { useCompanyName } from "@/hooks/useCompanyName";

const WATCH_PREFIX = "@watch:";

export default function WatchlistScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const {
    FUNDAMENTAL_CALLS, TECHNICAL_CALLS,
    SAUDI_FUNDAMENTAL, SAUDI_TECHNICAL,
    USA_FUNDAMENTAL, USA_TECHNICAL,
    PRICES,
  } = useData();
  const companyName = useCompanyName();

  const [tickers, setTickers] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const watchKeys = keys.filter((k) => k.startsWith(WATCH_PREFIX));
      if (watchKeys.length === 0) { setTickers([]); return; }
      const pairs = await AsyncStorage.multiGet(watchKeys);
      setTickers(
        pairs
          .filter(([, v]) => v === "1") // "0" = un-watched (key kept, value flipped)
          .map(([k]) => k.slice(WATCH_PREFIX.length))
          .filter(Boolean)
          .sort(),
      );
    } catch {
      setTickers([]);
    }
  }, []);

  // Refresh on every focus (not just mount) — the user toggles Watch on stock
  // pages pushed ON TOP of this screen, and the list must be fresh on return.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Company name through the ONE global resolver — the watchlist stores only
  // tickers, and scanning the loaded call cohorts (as this used to) left every
  // watched stock WITHOUT a published call showing a bare ticker.
  const companyFor = (t: string): string => companyName(t) || t;

  const removeTicker = (t: string) => {
    Haptics.selectionAsync();
    // Same convention as the stock page's toggle: value "0" = not watched.
    AsyncStorage.setItem(`${WATCH_PREFIX}${t}`, "0")
      .catch(() => {})
      .then(() => load());
  };

  const upColor = C.primary;      // app convention (stock page): up = brand primary
  const dnColor = C.accent.red;   //                              down = accent red

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      {/* Header — same stack-screen pattern as search / news index */}
      <View style={[s.header, { borderBottomColor: C.border.subtle }, isRTL && s.rowRTL]}>
        <Pressable style={[s.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: C.text.primary, fontFamily: ff("700") }]}>
          {isAr ? "قائمة المتابعة" : "My Watchlist"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={tickers}
        keyExtractor={(t) => t}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[2], flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ paddingTop: Spacing[8] }}>
            <EmptyState
              icon="bookmark-outline"
              title={isAr ? "لا توجد أسهم متابعة بعد" : "Nothing watched yet"}
              subtitle={isAr
                ? "اضغط «متابعة» في صفحة أي سهم لحفظه هنا"
                : "Tap Watch on any stock to save it here"}
            />
          </View>
        }
        renderItem={({ item: t }) => {
          const live = PRICES[t.toUpperCase()];
          const price = Number(live?.lastPrice) > 0 ? Number(live.lastPrice) : null;
          const changePct = typeof live?.changePct === "number" ? Number(live.changePct) : null;
          const changeColor = (changePct ?? 0) >= 0 ? upColor : dnColor;
          return (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/stock/${t}` as any); }}
              style={({ pressed }) => [
                s.row,
                { backgroundColor: C.bg.surface, borderColor: C.border.subtle },
                isRTL && s.rowRTL,
                pressed && { opacity: 0.85 },
              ]}
            >
              <TickerLogo ticker={t} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[s.ticker, { color: C.text.primary, fontFamily: ff("800") }, isRTL && s.textRight]}>{t}</Text>
                <Text numberOfLines={1} style={[s.company, { color: C.text.muted, fontFamily: ff("400") }, isRTL && s.textRight]}>
                  {companyFor(t)}
                </Text>
              </View>
              <View style={s.priceCol}>
                <Text style={[s.price, { color: C.text.primary, fontFamily: ff("700") }]}>
                  {price != null ? price.toFixed(2) : (isAr ? "غير متاح" : "—")}
                </Text>
                {changePct != null ? (
                  <Text style={[s.change, { color: changeColor, fontFamily: ff("700") }]}>
                    {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => removeTicker(t)}
                hitSlop={10}
                style={[s.trashBtn, { backgroundColor: `${C.accent.red}12` }]}
                accessibilityRole="button"
                accessibilityLabel={isAr ? `إزالة ${t} من المتابعة` : `Remove ${t} from watchlist`}
              >
                <Ionicons name="trash-outline" size={15} color={C.accent.red} />
              </Pressable>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={C.text.muted} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  rowRTL:      { flexDirection: "row-reverse" },
  textRight:   { textAlign: "right" },
  header:      { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: Typography.base, fontWeight: "700", textAlign: "center" },
  row:         { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1 },
  ticker:      { fontSize: Typography.sm, fontWeight: "800", letterSpacing: 0.5 },
  company:     { fontSize: 11, marginTop: 2 },
  priceCol:    { alignItems: "flex-end", gap: 1 },
  price:       { fontSize: Typography.sm, fontWeight: "700", fontVariant: ["tabular-nums"] },
  change:      { fontSize: 11, fontWeight: "700", fontVariant: ["tabular-nums"] },
  trashBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});

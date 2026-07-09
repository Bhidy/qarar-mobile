import { ScrollView, View, StyleSheet, Pressable } from "react-native";
import { formatDate } from "@/lib/format-date";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { type NotifType, type Notification } from "@/constants/data";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { parseCallDate } from "@/lib/performance";
import { resolveNotificationPath } from "@/lib/notif-route";

type FilterType = "all" | "signals" | "reports";

function GroupHeader({ label, C, isRTL, fontFamily }: {
  label: string; C: any; isRTL: boolean;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
}) {
  return (
    <View style={[styles.groupHeader, { backgroundColor: C.bg.elevated, borderBottomColor: C.border.subtle }]}>
      <Text style={[
        styles.groupLabel,
        { color: C.text.muted, fontFamily: fontFamily("700") },
        isRTL && styles.textRight,
      ]}>
        {label}
      </Text>
    </View>
  );
}

function NotifItem({ item, C, isRTL, isAr, fontFamily, onRead }: {
  item: Notification; C: any; isRTL: boolean; isAr: boolean;
  fontFamily: (w: "400"|"600"|"700"|"800") => string | undefined;
  onRead: (id: string | number) => void;
}) {
  const notifType = String(item.type ?? "article"); // null-safe: never crash the Inbox on a typeless row
  const isSignal = notifType.startsWith("signal");

  const signalColor =
    item.type === "signal-buy" || item.type === "signal-invest" ? C.primary
    : item.type === "signal-sell"         ? C.accent.red
    : item.type === "signal-hold"         ? C.accent.gold
    : item.type === "signal-take-profit"  ? C.accent.teal
    : C.primary;

  const iconConfig: Record<NotifType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string; labelAr: string }> = {
    article:              { icon: "document-text-outline", color: C.text.secondary, bg: C.bg.elevated, label: "Report",       labelAr: "تقرير" },
    "signal-invest":      { icon: "trending-up",           color: "#fff",           bg: C.primary,     label: "Invest",       labelAr: "استثمر" },
    "signal-buy":         { icon: "trending-up",           color: C.primary,        bg: `${C.primary}18`, label: "Buy",       labelAr: "اشترِ" },
    "signal-sell":        { icon: "trending-down",         color: C.accent.red,     bg: `${C.accent.red}18`, label: "Sell",   labelAr: "بيع" },
    "signal-hold":        { icon: "remove",                color: C.accent.gold,    bg: `${C.accent.gold}18`, label: "Hold",  labelAr: "احتفظ" },
    "signal-take-profit": { icon: "flag",                  color: C.accent.teal,    bg: `${C.accent.teal}18`, label: "Take Profit", labelAr: "اجنِ الأرباح" },
    "signal-target":      { icon: "refresh",               color: C.primary,        bg: `${C.primary}18`, label: "TP Update", labelAr: "تحديث الهدف" },
    live:                 { icon: "radio",                 color: "#fff",           bg: C.accent.red,  label: "Live",         labelAr: "مباشر" },
    portfolio:            { icon: "briefcase-outline",     color: C.accent.gold,    bg: `${C.accent.gold}18`, label: "Portfolio", labelAr: "محفظة" },
    "price-alert":        { icon: "alert-circle-outline",  color: C.primary,        bg: `${C.primary}18`, label: "Price Alert", labelAr: "تنبيه سعر" },
  };

  const config = iconConfig[item.type] ?? iconConfig.article;
  const displayTitle    = (isAr && item.titleAr)    ? item.titleAr    : item.title;
  const displaySubtitle = (isAr && item.subtitleAr) ? item.subtitleAr : item.subtitle;
  const signalLabel     = isAr ? config.labelAr : config.label;

  function handlePress() {
    // Mark as read immediately (optimistic — badge updates before navigation).
    if (!item.read) onRead(item.id);
    // Same resolver the push-tap handler uses, so an in-app tap lands on the exact
    // same screen a push tap would. `url` (when the row carries one) wins; otherwise
    // it falls back to the row's type/ticker/articleId.
    const path = resolveNotificationPath({
      url: (item as any).url,
      type: item.type,
      ticker: item.ticker,
      articleId: item.articleId,
      id: item.id,
    });
    if (path) router.push(path as any);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.notifItem,
        isRTL && styles.notifItemRTL,
        { backgroundColor: item.read ? C.bg.surface : `${C.primary}06`, borderBottomColor: C.border.subtle },
        pressed && { opacity: 0.7 },
      ]}
      onPress={handlePress}
    >
      {/* Unread bar — left in LTR, right in RTL */}
      {!item.read && (
        <View style={[
          styles.unreadBar,
          isRTL ? styles.unreadBarRTL : styles.unreadBarLTR,
          { backgroundColor: C.primary },
        ]} />
      )}

      <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>

      <View style={styles.notifContent}>
        {/* Top row: ticker+signal tag | time+date */}
        <View style={[styles.notifTop, isRTL && styles.rowRTL]}>
          <View style={[styles.notifTitleRow, isRTL && styles.rowRTL]}>
            {item.ticker && (
              <Text style={[styles.notifTicker, { color: C.text.primary }]}>{item.ticker}</Text>
            )}
            {isSignal && (
              <View style={[styles.signalTag, { backgroundColor: `${signalColor}18`, borderColor: `${signalColor}30` }]}>
                <Text style={[styles.signalTagText, { color: signalColor }]}>{signalLabel}</Text>
              </View>
            )}
          </View>
          <View style={[styles.notifTime, isRTL && styles.alignStart]}>
            {item.time && <Text style={[styles.notifTimeText, { color: C.text.secondary }]}>{item.time}</Text>}
            <Text style={[styles.notifDateText, { color: C.text.muted }]}>{formatDate(item.date)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.notifTitle,
            { color: isSignal ? C.text.primary : C.text.secondary },
            isSignal && { fontWeight: "700" },
            isRTL && styles.textRight,
          ]}
          numberOfLines={2}
        >
          {displayTitle}
        </Text>

        {/* Subtitle */}
        {displaySubtitle && (
          <Text
            style={[styles.notifSubtitle, { color: C.text.muted }, isRTL && styles.textRight]}
            numberOfLines={1}
          >
            {displaySubtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const { NOTIFICATIONS, markNotificationRead, markAllNotificationsRead } = useData();
  const [filter, setFilter] = useState<FilterType>("all");

  const isAr = language === "ar";
  const fontFamily = (weight: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, weight);

  const filtered = NOTIFICATIONS.filter(n => {
    const nt = String(n.type ?? "article"); // null-safe filter
    if (filter === "signals") return nt.startsWith("signal") || nt === "live";
    if (filter === "reports") return nt === "article";
    return true;
  });

  // Relative date buckets computed from the actual date (not hard-coded days),
  // so notifications always group correctly as data updates.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date());
  const bucketOf = (n: Notification) => {
    const d = parseCallDate(n.date);
    if (!d) return 3;
    const diff = Math.round((todayStart - startOfDay(d)) / 86_400_000);
    if (diff <= 0) return 0;   // today (or future-dated)
    if (diff === 1) return 1;  // yesterday
    if (diff <= 7) return 2;   // last 7 days
    return 3;                  // earlier
  };
  const today     = filtered.filter(n => bucketOf(n) === 0);
  const yesterday = filtered.filter(n => bucketOf(n) === 1);
  const last7     = filtered.filter(n => bucketOf(n) === 2);
  const earlier   = filtered.filter(n => bucketOf(n) === 3);

  const groups = [
    { label: isAr ? "اليوم"      : "Today",      items: today },
    { label: isAr ? "أمس"        : "Yesterday",  items: yesterday },
    { label: isAr ? "آخر 7 أيام" : "Last 7 Days",items: last7 },
    { label: isAr ? "سابقاً"     : "Earlier",    items: earlier },
  ].filter(g => g.items.length > 0);

  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length;

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: "all",     label: isAr ? "الكل"    : "All" },
    { key: "signals", label: isAr ? "إشارات"  : "Signals" },
    { key: "reports", label: isAr ? "تقارير"  : "Reports" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg.base }]} edges={["top"]}>

      {/* ── Sticky header ──────────────────────────────────── */}
      <View style={[
        styles.header,
        isRTL && styles.rowRTL,
        { borderBottomColor: C.border.subtle, backgroundColor: C.bg.base },
      ]}>
        <View style={[styles.headerLeft, isRTL && styles.rowRTL]}>
          <View style={[styles.inboxIcon, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
            <Ionicons name="mail" size={18} color={C.text.secondary} />
            {unreadCount > 0 && (
              <View style={[
                styles.inboxBadge,
                isRTL && styles.inboxBadgeRTL,
                { backgroundColor: C.primary, borderColor: C.bg.base },
              ]}>
                <Text style={styles.inboxBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: C.text.primary, fontFamily: fontFamily("800") }, isRTL && styles.textRight]}>
              {isAr ? "الصندوق" : "Inbox"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: C.text.muted, fontFamily: fontFamily("400") }, isRTL && styles.textRight]}>
              {isAr ? "إشاراتك وتقاريرك وتحديثاتك" : "Signals, reports & updates"}
            </Text>
          </View>
        </View>

        {/* Mark all as read — only when there is something unread */}
        {unreadCount > 0 && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllNotificationsRead(); }}
            hitSlop={8}
            style={[styles.markAllBtn, isRTL && styles.rowRTL, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}30` }]}
            accessibilityRole="button"
            accessibilityLabel={isAr ? "اجعل الكل مقروء" : "Mark all as read"}
          >
            <Ionicons name="checkmark-done" size={14} color={C.primary} />
            <Text style={[styles.markAllText, { color: C.primary, fontFamily: fontFamily("700") }]}>
              {isAr ? "اجعل الكل مقروء" : "Mark all read"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Filter chips ────────────────────────────────────── */}
      <View style={[
        styles.filterRow,
        isRTL && styles.filterRowRTL,
        { borderBottomColor: C.border.subtle, backgroundColor: C.bg.base },
      ]}>
        {filterOptions.map(opt => (
          <Pressable
            key={opt.key}
            onPress={() => setFilter(opt.key)}
            style={[
              styles.filterChip,
              filter === opt.key
                ? { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}30` }
                : { backgroundColor: C.bg.elevated, borderColor: C.border.subtle },
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: filter === opt.key ? C.primary : C.text.muted, fontFamily: fontFamily("700") },
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.listContainer, { borderColor: C.border.subtle }]}>
          {groups.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: C.bg.surface }]}>
              <Ionicons name="mail-open-outline" size={40} color={C.text.muted} />
              <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: fontFamily("600") }]}>
                {isAr ? "لا توجد إشعارات" : "No notifications"}
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <View key={group.label}>
                <GroupHeader label={group.label} C={C} isRTL={isRTL} fontFamily={fontFamily} />
                {group.items.map((item) => (
                  <NotifItem key={String(item.id)} item={item} C={C} isRTL={isRTL} isAr={isAr} fontFamily={fontFamily} onRead={markNotificationRead} />
                ))}
              </View>
            ))
          )}
        </View>
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  alignStart: { alignItems: "flex-start" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: Spacing[4], paddingTop: Spacing[2],
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },

  inboxIcon: {
    width: 40, height: 40, borderRadius: Radius.xl,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  inboxBadge: {
    position: "absolute", top: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
  },
  inboxBadgeRTL: { right: undefined, left: -3 },
  inboxBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  headerTitle: { fontSize: Typography.xl, fontWeight: "800" },
  headerSubtitle: { fontSize: Typography.xs },

  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1,
  },
  markAllText: { fontSize: 11, fontWeight: "700" },

  filterRow: {
    flexDirection: "row", gap: Spacing[2],
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderBottomWidth: 1,
  },
  filterRowRTL: { flexDirection: "row-reverse" },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  filterChipText: { fontSize: 11, fontWeight: "700" },

  listContainer: {
    borderRadius: Radius.xl, overflow: "hidden",
    margin: Spacing[4], borderWidth: 1,
  },
  emptyState: {
    alignItems: "center", justifyContent: "center",
    padding: Spacing[8], gap: Spacing[3],
  },
  emptyText: { fontSize: Typography.sm, fontWeight: "600" },

  groupHeader: {
    paddingHorizontal: Spacing[4], paddingVertical: 8,
    borderBottomWidth: 1,
  },
  groupLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },

  notifItem: {
    flexDirection: "row", gap: Spacing[3],
    padding: Spacing[4], borderBottomWidth: 1,
    position: "relative",
  },
  notifItemRTL: { flexDirection: "row-reverse" },

  unreadBar: {
    position: "absolute", top: 0, bottom: 0,
    width: 3, borderRadius: 2,
  },
  unreadBarLTR: { left: 0 },
  unreadBarRTL: { right: 0, left: undefined },

  iconBox: {
    width: 36, height: 36, borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1,
  },
  notifContent: { flex: 1, gap: 3 },
  notifTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  notifTicker: { fontWeight: "800", fontSize: Typography.sm, letterSpacing: 0.8 },
  signalTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  signalTagText: { fontSize: 9, fontWeight: "700" },
  notifTime: { alignItems: "flex-end", gap: 1 },
  notifTimeText: { fontSize: 10, fontWeight: "600" },
  notifDateText: { fontSize: 10 },
  notifTitle: { fontSize: Typography.xs, lineHeight: 17 },
  notifSubtitle: { fontSize: 11, lineHeight: 15 },
});

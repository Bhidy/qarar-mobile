/**
 * ScreenHeader — the ONE header used across every tab screen so the top bar is
 * identical app-wide: a leading title block (icon bubble + title + subtitle) and
 * the SAME trailing action cluster on every page — Search, Bell (with live unread
 * badge), and the user's Profile avatar. Fully RTL-aware.
 *
 * This replaces the per-page bespoke headers (and their one-off market/LIVE badges)
 * so Fundamental / Technical / News / Podcast all match Home.
 */
import { View, StyleSheet, Pressable, Image } from "react-native";
import { Text } from "@/components/shared/AppText";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/hooks/useData";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";

export function ScreenHeader({
  title, titleAr, subtitle, subtitleAr, icon = "bar-chart", iconColor, noBorder,
}: {
  title: string; titleAr: string;
  subtitle?: string; subtitleAr?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Hide the bottom divider (e.g. News draws its own below the tabs/search). */
  noBorder?: boolean;
}) {
  const C = useColors();
  const { language, isRTL, photoUri } = useTheme();
  const { user } = useAuth();
  const { NOTIFICATIONS } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || null;
  const avatarInitial = displayName ? displayName.charAt(0).toUpperCase() : "?";
  const avatarUri = photoUri ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const unread = (NOTIFICATIONS || []).filter((n: any) => !n.read).length;
  const accent = iconColor ?? C.primary;

  return (
    <View style={[styles.header, { borderBottomColor: C.border.subtle }, noBorder && { borderBottomWidth: 0, paddingBottom: 0 }, isRTL && styles.rowRTL]}>
      {/* Leading: page identity */}
      <View style={[styles.left, isRTL && styles.rowRTL]}>
        <View style={[styles.pageIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.textRight]} numberOfLines={1}>
            {isAr ? titleAr : title}
          </Text>
          {(subtitle || subtitleAr) ? (
            <Text style={[styles.subtitle, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.textRight]} numberOfLines={1}>
              {isAr ? (subtitleAr ?? subtitle) : (subtitle ?? "")}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Trailing: identical action cluster on every screen */}
      <View style={[styles.actions, isRTL && styles.rowRTL]}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}
          onPress={() => router.push("/search")}
          accessibilityLabel={isAr ? "بحث" : "Search"}
        >
          <Ionicons name="search" size={18} color={C.text.secondary} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}
          onPress={() => router.push("/tabs/inbox")}
          accessibilityLabel={isAr ? "صندوق الإشعارات" : "Inbox"}
        >
          <Ionicons name="notifications-outline" size={20} color={C.text.secondary} />
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: C.accent.red, borderColor: C.bg.base }, isAr && { right: undefined, left: -4 }]}>
              <Text style={styles.badgeTxt}>{unread > 99 ? "99+" : String(unread)}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={[styles.avatar, { backgroundColor: C.primary, borderColor: C.border.subtle }]}
          onPress={() => router.push("/profile")}
          accessibilityLabel={isAr ? "الملف الشخصي" : "Profile"}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing[2], paddingHorizontal: Spacing[4], paddingTop: Spacing[2], paddingBottom: Spacing[3], borderBottomWidth: 1 },
  rowRTL: { flexDirection: "row-reverse" },
  textRight: { textAlign: "right" },
  left: { flexDirection: "row", alignItems: "center", gap: Spacing[3], flexShrink: 1 },
  pageIcon: { width: 38, height: 38, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: Typography.lg, fontWeight: "800" },
  subtitle: { fontSize: Typography.xs, marginTop: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  badge: { position: "absolute", top: -3, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1.5 },
  badgeTxt: { color: "#fff", fontSize: 8.5, fontWeight: "800" },
});

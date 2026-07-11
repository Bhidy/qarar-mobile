import { ScrollView, View, StyleSheet, Pressable, Switch, Animated, Linking, Alert, Image, TouchableOpacity } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useAuth } from "@/context/AuthContext";
import { uploadAvatar, supabase } from "@/lib/supabase";
import {
  useColors, useTheme, MARKETS_ENABLED,
  type ThemeMode, type AccentColor, type AppLanguage, type AppMarket,
} from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";

// ── Animated pressable row ────────────────────────────────────────────
function PressRow({
  icon, label, value, last, C, onPress, danger, rtl,
}: {
  icon: any; label: string; value?: string; last?: boolean;
  C: any; onPress?: () => void; danger?: boolean; rtl?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  function press()  { Haptics.selectionAsync(); Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start(); }
  function release(){ Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 5 }).start(); }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: C.border.subtle }, rtl && styles.rowRTL]}
        onPressIn={press} onPressOut={release} onPress={onPress}
      >
        <View style={[styles.rowIcon, { backgroundColor: danger ? `${C.accent.red}15` : `${C.primary}15` }]}>
          <Ionicons name={icon} size={15} color={danger ? C.accent.red : C.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: danger ? C.accent.red : C.text.primary, textAlign: rtl ? "right" : "left" }]}>{label}</Text>
        {value && <Text style={[styles.rowValue, { color: C.text.muted }]}>{value}</Text>}
        <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={14} color={danger ? C.accent.red : C.text.muted} />
      </Pressable>
    </Animated.View>
  );
}

function SwitchRow({
  icon, label, value, onChange, C, disabled, last, rtl,
}: {
  icon: any; label: string; value: boolean; onChange: (v: boolean) => void;
  C: any; disabled?: boolean; last?: boolean; rtl?: boolean;
}) {
  function handleChange(v: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(v);
  }
  return (
    <View style={[
      styles.row,
      !last && { borderBottomWidth: 1, borderBottomColor: C.border.subtle },
      disabled && { opacity: 0.4 },
      rtl && styles.rowRTL,
    ]}>
      <View style={[styles.rowIcon, { backgroundColor: `${C.primary}15` }]}>
        <Ionicons name={icon} size={15} color={C.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: C.text.primary, textAlign: rtl ? "right" : "left" }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={handleChange}
        disabled={disabled}
        trackColor={{ false: C.border.default, true: `${C.primary}70` }}
        thumbColor={value ? C.primary : C.text.muted}
        ios_backgroundColor={C.border.default}
      />
    </View>
  );
}

// ── Section block ─────────────────────────────────────────────────────
function Section({ icon, title, children, C, rtl }: {
  icon: any; title: string; children: React.ReactNode; C: any; rtl?: boolean;
}) {
  return (
    <View style={styles.sectionWrap}>
      <View style={[styles.sectionHeader, rtl && styles.rowRTL]}>
        <Ionicons name={icon} size={12} color={C.text.muted} />
        <Text style={[styles.sectionTitle, { color: C.text.muted, textAlign: rtl ? "right" : "left" }]}>{title}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const C = useColors();
  const { mode, accent, language, market, photoUri, setMode, setAccent, setLanguage, setMarket, setPhotoUri, t } = useTheme();
  const { user, signOut, updatePassword, updateEmail, deleteAccount } = useAuth();
  const rtl = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(rtl, w);
  const df = (w: "400" | "600" | "700" | "800") => displayFontFor(rtl, w);
  const displayName = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "—";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  // Prefer the just-picked local/uploaded photo; fall back to the server-saved avatar
  // (user_metadata.avatar_url) so it shows on a fresh device / after reinstall.
  const avatarUri = photoUri ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  const [pushEnabled,    setPushEnabled]    = useState(true);
  const [signalAlerts,   setSignalAlerts]   = useState(true);
  const [liveAlerts,     setLiveAlerts]     = useState(true);
  const [researchAlerts, setResearchAlerts] = useState(true);

  const [changePwVisible,    setChangePwVisible]    = useState(false);
  const [newPassword,        setNewPassword]        = useState('');
  const [changeEmailVisible, setChangeEmailVisible] = useState(false);
  const [newEmail,           setNewEmail]           = useState('');

  // #12 — persist notification preferences (were ephemeral useState, lost on relaunch).
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("@notif_prefs").then((raw) => {
      if (raw) try {
        const p = JSON.parse(raw);
        if (typeof p.pushEnabled === "boolean") setPushEnabled(p.pushEnabled);
        if (typeof p.signalAlerts === "boolean") setSignalAlerts(p.signalAlerts);
        if (typeof p.liveAlerts === "boolean") setLiveAlerts(p.liveAlerts);
        if (typeof p.researchAlerts === "boolean") setResearchAlerts(p.researchAlerts);
      } catch {}
      // Prefer server-side values over local when user is logged in
      const serverPrefs = user?.user_metadata?.notif_prefs;
      if (user && serverPrefs) {
        if (typeof serverPrefs.pushEnabled === "boolean") setPushEnabled(serverPrefs.pushEnabled);
        if (typeof serverPrefs.signalAlerts === "boolean") setSignalAlerts(serverPrefs.signalAlerts);
        if (typeof serverPrefs.liveAlerts === "boolean") setLiveAlerts(serverPrefs.liveAlerts);
        if (typeof serverPrefs.researchAlerts === "boolean") setResearchAlerts(serverPrefs.researchAlerts);
      }
      setPrefsLoaded(true);
    }).catch(() => setPrefsLoaded(true));
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    AsyncStorage.setItem("@notif_prefs", JSON.stringify({ pushEnabled, signalAlerts, liveAlerts, researchAlerts })).catch(() => {});
    if (user) {
      supabase?.auth.updateUser({ data: { notif_prefs: { pushEnabled, signalAlerts, liveAlerts, researchAlerts } } }).catch(() => {});
    }
  }, [prefsLoaded, pushEnabled, signalAlerts, liveAlerts, researchAlerts]);

  // Entrance animations
  const avatarScale   = useRef(new Animated.Value(0.7)).current;
  const avatarOpacity = useRef(new Animated.Value(0)).current;
  const headerTY      = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(avatarScale,   { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.timing(avatarOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(headerTY,      { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
    ]).start();
  }, []);

  // Photo picker
  const handlePickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      // User just declined the system prompt and can be asked again → no nag.
      if (perm.canAskAgain) return;
      // Permanently denied → the system prompt will never re-appear; the ONLY
      // way forward is the Settings app, so offer to open it directly.
      Alert.alert(
        language === "ar" ? "إذن مطلوب" : "Permission Required",
        language === "ar"
          ? "الوصول إلى الصور معطّل. فعّله من الإعدادات لرفع صورة شخصية."
          : "Photo access is disabled. Enable it in Settings to upload a profile photo.",
        [
          { text: language === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
          { text: language === "ar" ? "فتح الإعدادات" : "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const srcUri = result.assets[0].uri;
      if (user) {
        // Upload to Supabase Storage
        const upload = await uploadAvatar(user.id, srcUri);
        if (upload.url) {
          setPhotoUri(upload.url);
          // Persist on the account so the avatar survives reinstall and shows on other
          // devices (home + profile read user_metadata.avatar_url as the fallback).
          supabase?.auth.updateUser({ data: { avatar_url: upload.url } }).catch(() => {});
        } else {
          // Upload failed — fall back to a device-local copy so the avatar still
          // shows on this device. Message is bilingual; the raw server error is
          // logged (not shown) so the user never sees "Bucket not found"-style text.
          console.warn('[profile] avatar upload failed:', upload.error);
          Alert.alert(
            language === 'ar' ? 'تعذّر حفظ الصورة على الخادم' : "Couldn't save photo to server",
            language === 'ar'
              ? 'تم حفظ الصورة على هذا الجهاز. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.'
              : 'Your photo was saved on this device. Check your connection and try again.'
          );
          try {
            const ext     = srcUri.split(".").pop() || "jpg";
            const destUri = `${FileSystem.documentDirectory}avatar_${Date.now()}.${ext}`;
            await FileSystem.copyAsync({ from: srcUri, to: destUri });
            setPhotoUri(destUri);
          } catch {
            setPhotoUri(srcUri);
          }
        }
      } else {
        // Not signed in — save locally as before
        try {
          const ext     = srcUri.split(".").pop() || "jpg";
          const destUri = `${FileSystem.documentDirectory}avatar_${Date.now()}.${ext}`;
          await FileSystem.copyAsync({ from: srcUri, to: destUri });
          setPhotoUri(destUri);
        } catch {
          setPhotoUri(srcUri);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleChangePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.prompt(
      t('profile.changePassword') || 'Change Password',
      t('profile.changePasswordPrompt') || 'Enter your new password (8+ characters):',
      async (pw) => {
        if (!pw || pw.length < 8) {
          Alert.alert('Error', 'Password must be at least 8 characters.'); return;
        }
        const r = await updatePassword(pw);
        if (r.error) Alert.alert('Error', r.error);
        else Alert.alert('Success', 'Password updated successfully.');
      },
      'secure-text'
    );
  };

  const handleChangeEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.prompt(
      t('profile.changeEmail') || 'Change Email',
      t('profile.changeEmailPrompt') || 'Enter your new email address:',
      async (em) => {
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          Alert.alert('Error', 'Please enter a valid email address.'); return;
        }
        const r = await updateEmail(em.trim());
        if (r.error) Alert.alert('Error', r.error);
        else Alert.alert('Success', 'A confirmation link has been sent to your new email.');
      },
      'plain-text',
      user?.email || ''
    );
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      language === 'ar' ? 'حذف الحساب' : 'Delete Account',
      language === 'ar'
        ? 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك وجميع بياناتك بشكل دائم.'
        : 'This action cannot be undone. Your account and all data will be permanently deleted.',
      [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ar' ? 'حذف حسابي' : 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            const r = await deleteAccount();
            if (r.error) Alert.alert('Error', r.error);
            else router.replace('/');
          },
        },
      ]
    );
  };

  // Send test notification
  const sendTestNotif = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Smart Signals", body: "Test notification ✓" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
  };

  // Sign out
  const handleSignOut = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t("profile.signOut"),
      t("profile.signOutConfirm"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        { text: t("profile.signOut"), style: "destructive", onPress: () => signOut().then(() => router.replace("/")) },
      ]
    );
  };

  const ACCENT_OPTIONS: { value: AccentColor; color: string; label: string }[] = [
    { value: "blue", color: C.primarySoft === "#EAF1FF" ? "#2B72F0" : "#4D8EF8", label: "Blue" },
    { value: "gold", color: "#D9B560",  label: "Gold" },
    { value: "teal", color: "#2DA8A8",  label: "Teal" },
  ];

  return (
    // Presented as a modal sheet (see _layout): the sheet already insets below the
    // status bar, so DON'T add a top safe-area inset too — that produced the empty
    // white band above the avatar. Top spacing comes from the hero's own padding.
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={[]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: C.bg.base }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ─────────────────────────────────────────────────── */}
        <Animated.View style={[styles.heroWrap, { transform: [{ scale: avatarScale }], opacity: avatarOpacity }]}>
          {/* Premium accent header glow behind the avatar */}
          <LinearGradient
            colors={[`${C.primary}22`, `${C.primary}08`, "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroGlow}
            pointerEvents="none"
          />
          <TouchableOpacity activeOpacity={0.85} onPress={handlePickPhoto} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: C.primary }]} />
            ) : (
              <LinearGradient
                colors={[C.primary, C.primaryDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarPlaceholder}
              >
                <Text style={[styles.avatarInitial, { color: C.text.white, fontFamily: df("800") }]}>{avatarInitial}</Text>
              </LinearGradient>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
              <Ionicons name="camera" size={11} color={C.primary} />
            </View>
          </TouchableOpacity>

          <Animated.View style={[styles.heroText, { transform: [{ translateY: headerTY }] }]}>
            <Text style={[styles.heroName, { color: C.text.primary, fontFamily: df("800"), textAlign: rtl ? "right" : "center" }]}>
              {displayName}
            </Text>
            <Text style={[styles.heroEmail, { color: C.text.muted, fontFamily: ff("400"), textAlign: rtl ? "right" : "center" }]}>
              {user?.email || "—"}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* ── Market selector — HIDDEN: re-enable when Saudi/USA are fully ready */}

        {/* ── Appearance ─────────────────────────────────────────────── */}
        <Section icon="color-palette-outline" title={t("profile.appearance")} C={C} rtl={rtl}>
          {/* Theme */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border.subtle }, rtl && styles.rowRTL]}>
            <View style={[styles.rowIcon, { backgroundColor: `${C.primary}15` }]}>
              <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={15} color={C.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text.primary }]}>{t("profile.theme")}</Text>
            <View style={[styles.segmentSmall, { backgroundColor: C.bg.elevated }]}>
              {([["light", "sunny", t("profile.lightMode")], ["dark", "moon", t("profile.darkMode")]] as const).map(([val, ico, lbl]) => (
                <Pressable
                  key={val}
                  onPress={() => { Haptics.selectionAsync(); setMode(val); }}
                  style={[styles.segSmallBtn, mode === val && { backgroundColor: C.bg.surface }]}
                >
                  <Ionicons name={ico as any} size={12} color={mode === val ? C.primary : C.text.muted} />
                  <Text style={[styles.segSmallLabel, { color: mode === val ? C.primary : C.text.muted }]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Accent color */}
          <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: C.border.subtle }, rtl && styles.rowRTL]}>
            <View style={[styles.rowIcon, { backgroundColor: `${C.primary}15` }]}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary }} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text.primary }]}>{t("profile.accentColor")}</Text>
            <View style={styles.accentRow}>
              {ACCENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { Haptics.selectionAsync(); setAccent(opt.value); }}
                  style={[
                    styles.accentDot,
                    { backgroundColor: opt.color },
                    accent === opt.value && { borderWidth: 2.5, borderColor: opt.color, transform: [{ scale: 1.18 }] },
                  ]}
                >
                  {accent === opt.value && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Language */}
          <View style={[styles.row, rtl && styles.rowRTL]}>
            <View style={[styles.rowIcon, { backgroundColor: `${C.primary}15` }]}>
              <Ionicons name="language" size={15} color={C.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: C.text.primary }]}>{t("profile.language")}</Text>
            <View style={[styles.segmentSmall, { backgroundColor: C.bg.elevated }]}>
              {([["en", "English"], ["ar", "عربي"]] as [AppLanguage, string][]).map(([val, lbl]) => (
                <Pressable
                  key={val}
                  onPress={() => { Haptics.selectionAsync(); setLanguage(val); }}
                  style={[styles.segSmallBtn, language === val && { backgroundColor: C.bg.surface }]}
                >
                  <Text style={[styles.segSmallLabel, {
                    color: language === val ? C.primary : C.text.muted,
                    fontFamily: fontFamilyFor(val === "ar", "400"),
                  }]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Section>

        {/* ── Market ──────────────────────────────────────────────────── */}
        {MARKETS_ENABLED.length > 1 && (
          <Section icon="bar-chart-outline" title={t("profile.market") || (rtl ? "السوق" : "Market")} C={C} rtl={rtl}>
            <View style={[styles.row, rtl && styles.rowRTL]}>
              <View style={[styles.rowIcon, { backgroundColor: `${C.primary}15` }]}>
                <Ionicons name="globe-outline" size={15} color={C.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: C.text.primary }]}>{rtl ? "السوق النشط" : "Active Market"}</Text>
              <View style={[styles.segmentSmall, { backgroundColor: C.bg.elevated }]}>
                {([["egypt", "🇪🇬", rtl ? "مصر" : "Egypt"], ["saudi", "🇸🇦", rtl ? "السعودية" : "Saudi"]] as [AppMarket, string, string][])
                  .filter(([val]) => MARKETS_ENABLED.includes(val))
                  .map(([val, flag, lbl]) => (
                    <Pressable
                      key={val}
                      onPress={() => { Haptics.selectionAsync(); setMarket(val); }}
                      style={[styles.segSmallBtn, market === val && { backgroundColor: C.bg.surface }]}
                    >
                      <Text style={{ fontSize: 12 }}>{flag}</Text>
                      <Text style={[styles.segSmallLabel, {
                        color: market === val ? C.primary : C.text.muted,
                        fontFamily: fontFamilyFor(rtl, "400"),
                      }]}>{lbl}</Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          </Section>
        )}

        {/* ── Notifications ───────────────────────────────────────────── */}
        <Section icon="notifications-outline" title={t("profile.notifications")} C={C} rtl={rtl}>
          <SwitchRow icon="notifications"   label={t("profile.pushNotif")}   value={pushEnabled}    onChange={setPushEnabled}    C={C} rtl={rtl} />
          <SwitchRow icon="trending-up"     label={t("profile.signalAlerts")} value={signalAlerts}  onChange={setSignalAlerts}   C={C} disabled={!pushEnabled} rtl={rtl} />
          <SwitchRow icon="radio"           label={t("profile.liveAlerts")}  value={liveAlerts}     onChange={setLiveAlerts}     C={C} disabled={!pushEnabled} rtl={rtl} />
          <SwitchRow icon="document-text"   label={t("profile.newReports")}  value={researchAlerts} onChange={setResearchAlerts} C={C} disabled={!pushEnabled} last rtl={rtl} />
        </Section>

        {/* ── Account ─────────────────────────────────────────────────── */}
        <Section icon="person-circle-outline" title={t("profile.account")} C={C} rtl={rtl}>
          {/* Watchlist — local bookmarks saved via the stock page "Watch" toggle. */}
          <PressRow icon="bookmark-outline" label={rtl ? "قائمة المتابعة" : "My Watchlist"} C={C} rtl={rtl} onPress={() => router.push("/watchlist")} />
          {user !== null && (
            <>
              <PressRow icon="person-outline" label={t('profile.editProfile')}   C={C} rtl={rtl} onPress={() => router.push('/edit-profile')} />
              <PressRow icon="key-outline"    label={t('profile.changePassword')} C={C} rtl={rtl} onPress={handleChangePassword} />
              <PressRow icon="mail-outline"   label={t('profile.changeEmail')}    C={C} rtl={rtl} value={user?.email?.split('@')[0] || ''} onPress={handleChangeEmail} />
              {/* Delete Account — placed directly under Change Email (per request),
                  kept danger-styled (red) so it still reads as destructive. */}
              <PressRow icon="trash-outline" label={language === 'ar' ? 'حذف الحساب' : 'Delete Account'} C={C} danger rtl={rtl} onPress={handleDeleteAccount} />
            </>
          )}
          <PressRow icon="shield-checkmark-outline" label={t("profile.privacy")} C={C} rtl={rtl}
            onPress={() => Linking.openURL(`https://mubashersignals.com/privacy?lang=${rtl ? "ar" : "en"}`)} />
          <PressRow icon="document-text-outline"    label={t("profile.terms")}   C={C} rtl={rtl}
            onPress={() => Linking.openURL(`https://mubashersignals.com/terms?lang=${rtl ? "ar" : "en"}`)} />
          <PressRow icon="help-circle-outline"      label={t("profile.support")} C={C} rtl={rtl}
            onPress={() => Linking.openURL("mailto:support@mubashersignals.com")} />
          <PressRow icon="log-out-outline"          label={t("profile.signOut")} C={C} danger last rtl={rtl}
            onPress={handleSignOut} />
        </Section>

        <Text style={[styles.version, { color: C.text.muted }]}>
          {`Smart Signals v${Constants.expoConfig?.version ?? "1.0.0"} · Build ${Constants.expoConfig?.ios?.buildNumber ?? "—"} · Powered by Mubasher`}
        </Text>
        {/* OTA bundle identity — instant "which JS is this device running?" check.
            "embedded" = factory bundle from the store binary; otherwise the short
            EAS update id + its publish timestamp. */}
        <Text style={[styles.bundleId, { color: C.text.muted }]}>
          {Updates.updateId
            ? `Bundle ${Updates.updateId.slice(0, 8)}${Updates.createdAt ? ` · ${new Date(Updates.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC` : ""}`
            : "Bundle: embedded"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // paddingTop:0 → no white strip above the accent; the hero's own paddingTop gives spacing.
  scroll:          { paddingHorizontal: Spacing[4], paddingTop: 0, paddingBottom: 100, gap: Spacing[4] },
  // Full-bleed accent header: starts at the very top of the sheet and extends past the
  // horizontal padding to both screen edges, so NO white background shows in the header.
  heroWrap:        { alignItems: "center", paddingTop: Spacing[8], paddingBottom: Spacing[6], marginHorizontal: -Spacing[4] },
  heroGlow:        { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  avatarWrap:      { position: "relative", marginBottom: Spacing[3] },
  avatar:          { width: 88, height: 88, borderRadius: 24, borderWidth: 3 },
  avatarPlaceholder:{ width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarInitial:   { fontSize: 32 },
  avatarBadge:     { position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  heroText:        { alignItems: "center", gap: 3 },
  heroName:        { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  heroEmail:       { fontSize: 13, marginTop: 2 },
  sectionWrap:     { gap: 6 },
  sectionHeader:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  sectionTitle:    { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  sectionCard:     { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  row:             { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowRTL:          { flexDirection: "row-reverse" },
  rowIcon:         { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel:        { flex: 1, fontSize: 14, fontWeight: "500" },
  rowValue:        { fontSize: 13 },
  segmentRow:      { flexDirection: "row", gap: 8, padding: 12 },
  segBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  segLabel:        { fontSize: 13, fontWeight: "600" },
  segmentSmall:    { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  segSmallBtn:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  segSmallLabel:   { fontSize: 11, fontWeight: "600" },
  accentRow:       { flexDirection: "row", gap: 10, alignItems: "center" },
  accentDot:       { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  version:         { textAlign: "center", fontSize: 11, marginTop: 8 },
  bundleId:        { textAlign: "center", fontSize: 10, marginTop: 2, opacity: 0.7 },
});

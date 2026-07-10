/**
 * Smart Signals — ultra-premium auth gate (mobile parity with the web split layout).
 *
 *   ┌────────────────────────────────────┐
 *   │   HERO  (brand-blue gradient)      │  ← ~38% screen, white text, marketing copy
 *   ├────────────────────────────────────┤
 *   │   FORM  (white surface, premium)   │  ← tabs / fields / CTA / extras
 *   └────────────────────────────────────┘
 *
 * Design tokens mirror /web/app/brand/tokens.css exactly:
 *   primary       #0B4DD4   primary-deep   #062373   primary-ink    #08379B
 *   primary-soft  #E4EBFF   primary-softer #F1F4FF
 *   ink           #0A0E1F   ink-2          #2A3147   muted          #626980
 *   border        #ECEEF3   border-strong  #D4D8E2
 *
 * Modes: signin | signup | forgot | otp.  Reached via router.replace from the
 * root gate / onboarding — there is intentionally no dismiss button.
 */
import { useState, useEffect } from "react";
import {
  View, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking,
} from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor,
  FadeIn, FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/constants/theme";
import { fontFamilyFor, displayFontFor } from "@/lib/typography";
import { useAuth } from "@/context/AuthContext";
import { SmartSignalsMark } from "@/components/shared/SmartSignalsMark";
import { localizeAuthError } from "@/lib/auth-errors";

// ── Design tokens (canonical, light theme) ─────────────────────────────────
const BRAND = {
  primary:        "#0B4DD4",
  primaryDeep:    "#062373",
  primaryDeeper:  "#03103D",
  primaryInk:     "#08379B",
  primarySoft:    "#E4EBFF",
  primarySofter:  "#F1F4FF",
  bg:             "#FFFFFF",
  surfaceAlt:     "#F5F6FA",
  ink:            "#0A0E1F",
  ink2:           "#2A3147",
  muted:          "#626980",
  border:         "#ECEEF3",
  borderStrong:   "#D4D8E2",
  red:            "#C53030",
  redSoft:        "#FCE3DE",
  redInk:         "#8A1F19",
} as const;

type Mode = "signin" | "signup" | "forgot";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  terms?: string;
  general?: string;
}

function calcPasswordStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  if (pw.length >= 12 && hasUpper && hasNumber && hasSpecial) return 4;
  if (pw.length >= 10 && hasUpper && hasNumber && hasSpecial) return 3;
  if (hasNumber || hasSpecial) return 2;
  return 1;
}

function strengthLabel(strength: number, isAr: boolean): string {
  if (strength <= 1) return isAr ? "ضعيفة" : "Weak";
  if (strength === 2) return isAr ? "مقبولة" : "Fair";
  if (strength === 3) return isAr ? "قوية" : "Strong";
  return isAr ? "ممتازة" : "Institutional";
}

// ── Premium light-surface input field ───────────────────────────────────────
type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  ff: (w: "400" | "500" | "600" | "700" | "800") => string;
  isAr: boolean;
  secure?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
  keyboardType?: any;
  autoComplete?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  maxLength?: number;
  mono?: boolean;
};

/**
 * Focus glow is driven by a reanimated shared value — NOT React state — so
 * focusing a field NEVER re-renders the TextInput. A setState fired from
 * onFocus re-renders the input on the New Architecture and instantly dismisses
 * the keyboard. Keeping focus state off the render path is what keeps the
 * keyboard open. (Same root-cause as the reanimated-entering bug in build 60.)
 */
function Field({
  icon, label, value, onChangeText, error, ff, isAr,
  secure, toggled, onToggle, keyboardType, autoComplete, autoCapitalize,
  autoCorrect, maxLength, mono,
}: FieldProps) {
  const focus = useSharedValue(0);
  const wrapStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? `${BRAND.red}80`
      : interpolateColor(focus.value, [0, 1], [BRAND.border, `${BRAND.primary}59`]),
    shadowOpacity: focus.value * 0.18,
    transform: [{ translateY: focus.value * -1 }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
  }));

  return (
    <View>
      {/* Label */}
      <Text
        style={[
          s.fieldLabel,
          { fontFamily: ff("700"), textAlign: isAr ? "right" : "left" },
        ]}
      >
        {label}
      </Text>

      {/* Wrapper — soft brand-tinted focus ring on a white card */}
      <View>
        {/* Focus ring (4px primary-softer halo) */}
        <Animated.View pointerEvents="none" style={[s.fieldRing, ringStyle]} />
        <Animated.View
          style={[
            s.field,
            { flexDirection: isAr ? "row-reverse" : "row" },
            wrapStyle,
          ]}
        >
          <View style={s.fieldIconTile}>
            <Ionicons name={icon} size={16} color={BRAND.primaryInk} />
          </View>
          <TextInput
            placeholder={label}
            placeholderTextColor={BRAND.muted}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={secure && !toggled}
            keyboardType={keyboardType}
            autoComplete={autoComplete}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            maxLength={maxLength}
            onFocus={() => { focus.value = withTiming(1, { duration: 180 }); }}
            onBlur={() => { focus.value = withTiming(0, { duration: 180 }); }}
            style={[
              s.fieldInput,
              {
                color: BRAND.ink,
                fontFamily: ff("600"),
                textAlign: isAr ? "right" : "left",
                ...(mono ? { letterSpacing: 6, fontSize: 18 } : {}),
              },
            ]}
          />
          {onToggle && (
            <Pressable onPress={onToggle} hitSlop={10} style={s.fieldEye}>
              <Ionicons
                name={toggled ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={BRAND.muted}
              />
            </Pressable>
          )}
        </Animated.View>
      </View>

      {error ? (
        <Text style={[s.fieldError, { fontFamily: ff("500") }]}>{error}</Text>
      ) : null}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { language, isRTL, setLanguage } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "500" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const df = (w: "400" | "600" | "700" | "800") => displayFontFor(isAr, w);
  const { signInWithPassword, signUp, resetPassword, user } = useAuth();

  const T = (en: string, ar: string) => (isAr ? ar : en);

  // ── State ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"faceID" | "touchID" | null>(null);

  const strength = calcPasswordStrength(password);

  // Mode switcher pill — animated translation, set by onLayout width
  const pillOffset = useSharedValue(0);
  const [switcherWidth, setSwitcherWidth] = useState(0);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillOffset.value }],
  }));

  // ── Effects ────────────────────────────────────────────────────────────
  useEffect(() => { initBiometric(); }, []);
  // When the switcher width is known, animate the pill to the current mode's
  // position. Tab order is reversed in AR (Sign in on the right, Register on
  // the left), so the pill's "left" offset has to follow whichever physical
  // slot the active tab occupies — not a fixed mode→position mapping.
  useEffect(() => {
    if (!switcherWidth) return;
    const tabs = isAr ? (["signup", "signin"] as const) : (["signin", "signup"] as const);
    const idx = tabs.indexOf(mode as "signin" | "signup");
    const target = idx === 1 ? (switcherWidth - 8) / 2 : 0;
    pillOffset.value = withSpring(target, { damping: 18, stiffness: 200 });
  }, [switcherWidth, mode, isAr, pillOffset]);

  async function initBiometric() {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHw || !enrolled) return;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    setBiometricType(isFace ? "faceID" : "touchID");
    setHasBiometric(true);
    const enabled = await AsyncStorage.getItem("@biometric_enabled");
    setBiometricEnabled(enabled === "true");
  }

  async function handleBiometric() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: T("Verify your identity", "تحقق من هويتك"),
      cancelLabel: T("Cancel", "إلغاء"),
      disableDeviceFallback: false,
    });
    if (!result.success) return;
    if (user) {
      router.replace("/tabs");
    } else {
      await AsyncStorage.removeItem("@biometric_enabled");
      setBiometricEnabled(false);
      setErrors({ general: T("Your session has expired. Please sign in again.", "انتهت جلستك. يرجى تسجيل الدخول مجدداً.") });
    }
  }

  function offerBiometric() {
    const label = biometricType === "faceID" ? "Face ID" : "Touch ID";
    Alert.alert(
      T(`Enable ${label}?`, `تفعيل ${label}؟`),
      T(`Sign in faster next time using ${label}.`, `سجّل دخولك بشكل أسرع في المرة القادمة.`),
      [
        { text: T("Not Now", "ليس الآن"), style: "cancel" },
        {
          text: T("Enable", "تفعيل"),
          onPress: async () => {
            await AsyncStorage.setItem("@biometric_enabled", "true");
            setBiometricEnabled(true);
          },
        },
      ],
    );
  }

  function switchMode(m: Mode) {
    Haptics.selectionAsync();
    // The animation is now driven by the useEffect above (which knows about
    // both mode AND isAr), so all this needs to do is move state.
    setMode(m);
    setErrors({});
    setForgotSuccess(false);
  }

  function validateForm(): FormErrors {
    const errs: FormErrors = {};
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) errs.email = T("Email is required.", "البريد الإلكتروني مطلوب.");
    else if (!emailReg.test(email.trim())) errs.email = T("Enter a valid email address.", "أدخل بريدًا إلكترونيًا صحيحًا.");

    if (mode === "signin") {
      if (!password) errs.password = T("Password is required.", "كلمة المرور مطلوبة.");
    }
    if (mode === "signup") {
      if (!fullName.trim()) errs.fullName = T("Full name is required.", "الاسم الكامل مطلوب.");
      else if (fullName.trim().length < 2) errs.fullName = T("Name must be at least 2 characters.", "الاسم يجب أن يكون حرفين على الأقل.");
      if (!password) errs.password = T("Password is required.", "كلمة المرور مطلوبة.");
      else if (password.length < 8) errs.password = T("Password must be at least 8 characters.", "كلمة المرور 8 أحرف على الأقل.");
      if (!confirmPassword) errs.confirmPassword = T("Confirm your password.", "أكّد كلمة المرور.");
      else if (confirmPassword !== password) errs.confirmPassword = T("Passwords do not match.", "كلمتا المرور غير متطابقتين.");
      if (!termsAccepted) errs.terms = T("Accept the Terms and Privacy Policy.", "اقبل الشروط وسياسة الخصوصية.");
    }
    return errs;
  }

  async function submit() {
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (mode === "signin") {
        const r = await signInWithPassword(email.trim(), password);
        if (r.error) { setErrors({ general: localizeAuthError(r.error, isAr) }); return; }
        if (hasBiometric && !biometricEnabled) setTimeout(offerBiometric, 600);
        await AsyncStorage.setItem("@onboarding_done", "true");
        router.replace("/tabs");
      } else if (mode === "signup") {
        const su = await signUp(email.trim(), password, fullName.trim());
        if (su.error) { setErrors({ general: localizeAuthError(su.error, isAr) }); return; }
        const r = await signInWithPassword(email.trim(), password);
        if (r.error) { setErrors({ general: localizeAuthError(r.error, isAr) }); return; }
        if (hasBiometric) setTimeout(offerBiometric, 600);
        await AsyncStorage.setItem("@onboarding_done", "true");
        router.replace("/tabs");
      } else if (mode === "forgot") {
        const r = await resetPassword(email.trim());
        if (r.error) { setErrors({ general: localizeAuthError(r.error, isAr) }); return; }
        setForgotSuccess(true);
      }
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = busy
    ? T("Securing your session…", "جارٍ تأمين جلستك…")
    : mode === "signin"  ? T("Sign in", "تسجيل الدخول")
    : mode === "signup"  ? T("Create account", "إنشاء حساب")
    : T("Send reset link", "إرسال رابط إعادة التعيين");

  const showModeSwitcher = mode === "signin" || mode === "signup";

  const heroHeadline =
    mode === "signin"  ? (isAr ? "مرحبًا بعودتك" : "Welcome back")
  : mode === "signup"  ? (isAr ? "أنشئ حسابك" : "Create your account")
  :                      (isAr ? "إعادة تعيين كلمة المرور" : "Reset password");

  const heroSub =
    mode === "signin"  ? (isAr ? "سجّل الدخول للوصول إلى الأبحاث والتنبيهات وأدوات المتابعة." : "Sign in to access research, alerts, and portfolio tools.")
  : mode === "signup"  ? (isAr ? "أنشئ حسابك مرة واحدة وابدأ تجربة Smart Signals الكاملة." : "Create your account once and unlock the full Smart Signals experience.")
  :                      (isAr ? "سنرسل رابط إعادة التعيين إلى بريدك المسجل." : "We'll send a reset link to your registered email.");

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ─────────────────────────────────────────────────────────────
              HERO — brand-blue gradient panel (mirrors web's left panel)
          ───────────────────────────────────────────────────────────── */}
          <View style={s.hero}>
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDeep, BRAND.primaryDeeper]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle grid overlay — web parity */}
            <View style={s.heroGrid} pointerEvents="none">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <View key={`h${i}`} style={[s.heroGridLine, { top: i * 56 }]} />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <View key={`v${i}`} style={[s.heroGridLineV, { left: i * 56 }]} />
              ))}
            </View>
            {/* Top radial bloom (white) */}
            <View style={s.heroBloomTop} pointerEvents="none" />
            {/* Bottom-right bloom (brand-blue) */}
            <View style={s.heroBloomBR} pointerEvents="none" />

            <SafeAreaView edges={["top"]}>
              <Animated.View
                entering={FadeIn.duration(420)}
                style={[s.brandRow, { flexDirection: isAr ? "row-reverse" : "row", justifyContent: "space-between" }]}
              >
                <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <View style={s.brandTile}>
                    <SmartSignalsMark size={26} ink="#FFFFFF" accent="#9DB6FF" />
                  </View>
                  <View>
                    <Text style={[s.brandWord, { fontFamily: df("800"), textAlign: isAr ? "right" : "left" }]}>
                      Smart Signals
                    </Text>
                    <Text style={[s.brandSub, { fontFamily: ff("600"), textAlign: isAr ? "right" : "left" }]}>
                      {T("Powered by Mubasher", "مقدم من خلال مباشر")}
                    </Text>
                  </View>
                </View>
                {/* Language switch — glass pill, legible on the dark hero */}
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setLanguage(isAr ? "en" : "ar"); }}
                  accessibilityRole="button"
                  accessibilityLabel={isAr ? "Switch to English" : "التبديل إلى العربية"}
                  style={s.langToggle}
                  hitSlop={8}
                >
                  <Ionicons name="language" size={14} color="rgba(255,255,255,0.92)" />
                  <Text style={[s.langToggleText, { fontFamily: df("700") }]}>{isAr ? "EN" : "عربي"}</Text>
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(520).delay(120)} style={s.heroCopy}>
                <Text
                  style={[
                    s.heroHeadline,
                    {
                      fontFamily: df("800"),
                      textAlign: isAr ? "right" : "left",
                      writingDirection: isAr ? "rtl" : "ltr",
                    },
                  ]}
                >
                  {heroHeadline}
                </Text>
                <Text
                  style={[
                    s.heroSubhead,
                    {
                      fontFamily: ff("400"),
                      textAlign: isAr ? "right" : "left",
                      writingDirection: isAr ? "rtl" : "ltr",
                    },
                  ]}
                >
                  {heroSub}
                </Text>
              </Animated.View>
            </SafeAreaView>
          </View>

          {/* ─────────────────────────────────────────────────────────────
              FORM — light surface, premium light-mode field system
          ───────────────────────────────────────────────────────────── */}
          <View style={s.formCard}>
            {/* Mode switcher — in AR the visual order is reversed (Sign in on the
                right, Register on the left) to match the web. We render the tabs
                in reverse order rather than using row-reverse so the absolutely-
                positioned pill's "left" offset still aligns with the visual tab. */}
            {showModeSwitcher && (
              <View
                onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
                style={s.switcher}
              >
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <Animated.View style={[s.switcherPill, pillStyle]}>
                    <LinearGradient
                      colors={[BRAND.primary, BRAND.primaryInk]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
                {(isAr
                  ? (["signup", "signin"] as const)
                  : (["signin", "signup"] as const)
                ).map((tab) => {
                  const active = mode === tab;
                  return (
                    <Pressable key={tab} style={s.switcherTouch} onPress={() => switchMode(tab)}>
                      <Text style={[
                        s.switcherText,
                        { color: active ? "#FFFFFF" : BRAND.primaryInk, fontFamily: ff(active ? "800" : "700") },
                      ]}>
                        {tab === "signin" ? T("Sign in", "دخول") : T("Register", "تسجيل")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* General notice / error banner */}
            {errors.general ? (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={BRAND.redInk} />
                <Text style={[s.errorBannerText, { fontFamily: ff("600"), textAlign: isAr ? "right" : "left" }]}>
                  {errors.general}
                </Text>
              </View>
            ) : null}

            {/* ── Forgot-success state ── */}
            {mode === "forgot" && forgotSuccess ? (
              <View style={s.successBox}>
                <View style={s.successIcon}>
                  <Ionicons name="mail-open-outline" size={28} color={BRAND.primary} />
                </View>
                <Text style={[s.successTitle, { fontFamily: ff("800") }]}>
                  {T("Check your email", "تحقق من بريدك")}
                </Text>
                <Text style={[s.successBody, { fontFamily: ff("400") }]}>
                  {T(`We sent a reset link to ${email.trim()}.`, `أرسلنا رابط إعادة التعيين إلى ${email.trim()}.`)}
                </Text>
                <Pressable onPress={() => switchMode("signin")} style={s.linkRow} hitSlop={8}>
                  <Text style={[s.linkText, { color: BRAND.primary, fontFamily: ff("700") }]}>
                    {T("Back to sign in", "العودة لتسجيل الدخول")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.form}>
                {mode === "signup" && (
                  <Field
                    icon="person-outline"
                    label={T("Full name", "الاسم الكامل")}
                    value={fullName}
                    onChangeText={(v) => { setFullName(v); if (errors.fullName) setErrors((e) => ({ ...e, fullName: undefined })); }}
                    error={errors.fullName}
                    ff={ff} isAr={isAr} autoCapitalize="words" autoComplete="name"
                  />
                )}

                <Field
                  icon="mail-outline"
                  label={T("Email address", "البريد الإلكتروني")}
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                  error={errors.email}
                  ff={ff} isAr={isAr} keyboardType="email-address" autoComplete="email"
                  autoCapitalize="none" autoCorrect={false}
                />

                {(mode === "signin" || mode === "signup") && (
                  <View>
                    <Field
                      icon="lock-closed-outline"
                      label={T("Password", "كلمة المرور")}
                      value={password}
                      onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                      error={errors.password}
                      ff={ff} isAr={isAr} secure toggled={showPassword} onToggle={() => setShowPassword((v) => !v)}
                      autoCapitalize="none" autoCorrect={false}
                    />
                    {mode === "signup" && password.length > 0 && (
                      <View style={s.strengthBlock}>
                        <View style={s.strengthBar}>
                          {[1, 2, 3, 4].map((i) => (
                            <View
                              key={i}
                              style={[
                                s.strengthSeg,
                                { backgroundColor: i <= strength ? BRAND.primary : BRAND.border },
                              ]}
                            />
                          ))}
                        </View>
                        <View style={[s.strengthRow, { flexDirection: isAr ? "row-reverse" : "row" }]}>
                          <Text style={[s.strengthLabel, { color: BRAND.muted, fontFamily: ff("500") }]}>
                            {T("Password strength", "قوة كلمة المرور")}
                          </Text>
                          <Text style={[s.strengthValue, { color: BRAND.ink, fontFamily: ff("700") }]}>
                            {strengthLabel(strength, isAr)}
                          </Text>
                        </View>
                      </View>
                    )}
                    {mode === "signin" && (
                      <Pressable
                        onPress={() => { setMode("forgot"); setErrors({}); setForgotSuccess(false); }}
                        style={[s.forgotLink, { alignSelf: isAr ? "flex-start" : "flex-end" }]}
                        hitSlop={8}
                      >
                        <Text style={[s.forgotText, { color: BRAND.primaryInk, fontFamily: ff("600") }]}>
                          {T("Forgot password?", "نسيت كلمة المرور؟")}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {mode === "signup" && (
                  <Field
                    icon="lock-closed-outline"
                    label={T("Confirm password", "تأكيد كلمة المرور")}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
                    error={errors.confirmPassword}
                    ff={ff} isAr={isAr} secure toggled={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)}
                    autoCapitalize="none" autoCorrect={false}
                  />
                )}

                {mode === "signup" && (
                  <Pressable
                    onPress={() => { setTermsAccepted((v) => !v); if (errors.terms) setErrors((e) => ({ ...e, terms: undefined })); }}
                    style={[s.termsRow, { flexDirection: isAr ? "row-reverse" : "row" }]}
                  >
                    <View style={[
                      s.checkbox,
                      {
                        borderColor: termsAccepted ? BRAND.primary : BRAND.borderStrong,
                        backgroundColor: termsAccepted ? BRAND.primary : "#FFFFFF",
                      },
                    ]}>
                      {termsAccepted && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                    <Text style={[
                      s.termsText,
                      { color: BRAND.ink2, fontFamily: ff("500"), textAlign: isAr ? "right" : "left" },
                    ]}>
                      {T("I agree to the ", "أوافق على ")}
                      <Text onPress={() => Linking.openURL(`https://mubashersignals.com/terms?lang=${isAr ? "ar" : "en"}`)} style={{ color: BRAND.primary, fontFamily: ff("800") }}>
                        {T("Terms", "الشروط")}
                      </Text>
                      {T(" and ", " و")}
                      <Text onPress={() => Linking.openURL(`https://mubashersignals.com/privacy?lang=${isAr ? "ar" : "en"}`)} style={{ color: BRAND.primary, fontFamily: ff("800") }}>
                        {T("Privacy Policy", "سياسة الخصوصية")}
                      </Text>
                    </Text>
                  </Pressable>
                )}
                {errors.terms ? (
                  <Text style={[s.fieldError, { fontFamily: ff("500"), marginTop: -8 }]}>{errors.terms}</Text>
                ) : null}

                {/* Primary CTA */}
                <Pressable
                  onPress={submit}
                  disabled={busy}
                  style={({ pressed }) => [
                    s.cta,
                    {
                      opacity: busy ? 0.78 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[BRAND.primary, BRAND.primaryInk]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.ctaGradient}
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={[s.ctaText, { fontFamily: ff("800") }]}>{ctaLabel}</Text>
                        <Ionicons
                          name={isRTL ? "arrow-back" : "arrow-forward"}
                          size={16}
                          color="#FFFFFF"
                          style={{ marginStart: 6 }}
                        />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Sign-in extras */}
                {mode === "signin" && (
                  <>
                    {hasBiometric && biometricEnabled && (
                      <Pressable onPress={handleBiometric} style={s.biometricBtn}>
                        <Ionicons
                          name={biometricType === "faceID" ? "scan-outline" : "finger-print-outline"}
                          size={18}
                          color={BRAND.primaryInk}
                        />
                        <Text style={[s.biometricText, { fontFamily: ff("700") }]}>
                          {biometricType === "faceID"
                            ? T("Sign in with Face ID", "الدخول بـ Face ID")
                            : T("Sign in with Touch ID", "الدخول بـ Touch ID")}
                        </Text>
                      </Pressable>
                    )}

                  </>
                )}

                {mode === "forgot" && (
                  <Pressable onPress={() => switchMode("signin")} style={s.linkRow} hitSlop={8}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={14} color={BRAND.muted} />
                    <Text style={[s.linkText, { color: BRAND.ink2, fontFamily: ff("700") }]}>
                      {T("Back to sign in", "العودة لتسجيل الدخول")}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND.bg },
  scroll: { flexGrow: 1, paddingBottom: 0 },

  // ── Hero panel ─────────────────────────────────────────────────────
  hero: {
    paddingBottom: 56,
    overflow: "hidden",
    position: "relative",
  },
  heroGrid: { position: "absolute", inset: 0 as any, opacity: 0.08 },
  heroGridLine: {
    position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#FFFFFF",
  },
  heroGridLineV: {
    position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "#FFFFFF",
  },
  heroBloomTop: {
    position: "absolute",
    top: -180, left: "20%", width: 420, height: 420, borderRadius: 220,
    backgroundColor: "rgba(255,255,255,0.10)",
    ...(Platform.OS === "ios" ? { filter: "blur(80px)" as any } : { opacity: 0.45 }),
  },
  heroBloomBR: {
    position: "absolute",
    bottom: -120, right: -80, width: 320, height: 320, borderRadius: 160,
    backgroundColor: "rgba(11,77,212,0.45)",
    ...(Platform.OS === "ios" ? { filter: "blur(60px)" as any } : { opacity: 0.5 }),
  },

  brandRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
  },
  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  langToggleText: { color: "rgba(255,255,255,0.92)", fontSize: 12, letterSpacing: 0.2 },
  brandTile: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  brandWord: { color: "#FFFFFF", fontSize: 17, letterSpacing: -0.3, lineHeight: 22 },
  brandSub: { color: "rgba(255,255,255,0.62)", fontSize: 11, letterSpacing: 0.2, marginTop: 1 },

  heroCopy: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    gap: Spacing[3],
  },
  heroHeadline: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  heroSubhead: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 360,
  },

  // ── Form card ──────────────────────────────────────────────────────
  formCard: {
    flex: 1,
    backgroundColor: BRAND.bg,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
    gap: Spacing[5],
    // soft shadow lifting the card above the hero
    shadowColor: "#0A0E1F",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },

  // ── Mode switcher ──────────────────────────────────────────────────
  switcher: {
    flexDirection: "row",
    height: 54,
    borderRadius: 18,
    padding: 4,
    backgroundColor: BRAND.primarySofter,
    borderWidth: 1,
    borderColor: BRAND.primarySoft,
    overflow: "hidden",
  },
  switcherPill: {
    position: "absolute",
    top: 4, left: 4, bottom: 4, width: "50%",
    borderRadius: 14,
    overflow: "hidden",
    // brand-blue glow under the active pill
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
  switcherTouch: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 1 },
  switcherText: { fontSize: 14 },

  // ── Banners ────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 16,
    backgroundColor: BRAND.redSoft,
    borderWidth: 1, borderColor: `${BRAND.red}33`,
  },
  errorBannerText: { color: BRAND.redInk, fontSize: 13, flex: 1, lineHeight: 18 },

  // ── Form ──────────────────────────────────────────────────────────
  form: { gap: Spacing[4] },

  // Field
  fieldLabel: {
    fontSize: 12,
    color: BRAND.ink,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  fieldRing: {
    position: "absolute",
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 22,
    backgroundColor: BRAND.primarySofter,
  },
  field: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 10,
    // resting micro-shadow — gives the card a "lifted" premium feel
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    // shadowOpacity animated by focus
  },
  fieldIconTile: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND.primarySoft,
  },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: Platform.OS === "ios" ? 16 : 12 },
  fieldEye: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  fieldError: { color: BRAND.redInk, fontSize: 12, marginTop: 6, marginStart: 4 },

  // Password strength
  strengthBlock: { marginTop: 12, gap: 8 },
  strengthBar: { flexDirection: "row", gap: 6 },
  strengthSeg: { flex: 1, height: 5, borderRadius: 3 },
  strengthRow: { justifyContent: "space-between", alignItems: "center" },
  strengthLabel: { fontSize: 12 },
  strengthValue: { fontSize: 12 },

  // Forgot link
  forgotLink: { marginTop: 10, paddingVertical: 2 },
  forgotText: { fontSize: 13 },

  // Resend
  resendRow: { alignItems: "center", marginTop: 12 },
  resendText: { fontSize: 13 },

  // Terms
  termsRow: {
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: BRAND.surfaceAlt,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // CTA
  cta: {
    height: 58,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: Spacing[2],
    // brand-blue projected shadow
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 10,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFFFFF", fontSize: 15, letterSpacing: 0.2 },

  // Biometric
  biometricBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 54, borderRadius: 18,
    backgroundColor: BRAND.surfaceAlt,
    borderWidth: 1, borderColor: BRAND.border,
  },
  biometricText: { color: BRAND.ink, fontSize: 14 },

  // Divider
  dividerRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginVertical: Spacing[1],
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BRAND.border },
  dividerLabel: { color: BRAND.muted, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },

  // Ghost (OTP)
  ghostBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 54, borderRadius: 18,
    borderWidth: 1, borderColor: BRAND.primarySoft, backgroundColor: BRAND.primarySofter,
  },
  ghostText: { color: BRAND.primaryInk, fontSize: 14 },

  // Link row (back-to-signin etc)
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: Spacing[1] },
  linkText: { fontSize: 14 },

  // Success
  successBox: { alignItems: "center", gap: 14, paddingVertical: Spacing[6] },
  successIcon: {
    width: 64, height: 64, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: BRAND.primarySoft,
    borderWidth: 1, borderColor: `${BRAND.primary}26`,
  },
  successTitle: { color: BRAND.ink, fontSize: 20 },
  successBody: { color: BRAND.ink2, fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 300 },
});

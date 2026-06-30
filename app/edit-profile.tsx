import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { useAuth } from "@/context/AuthContext";

export default function EditProfileScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { user, updateFullName, updatePhone, updateEmail } = useAuth();
  const T = (en: string, ar: string) => (isAr ? ar : en);

  if (!user) { router.back(); return null; }

  const currentName =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "";
  const currentPhone = (user?.user_metadata?.phone as string) || "";
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSaveName() {
    if (name.trim().length < 2) {
      setNameError(
        T("Name must be at least 2 characters.", "الاسم يجب أن يكون حرفين على الأقل.")
      );
      return;
    }
    setNameError("");
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Save name + mobile number together (parity with web Personal Info).
      if (name.trim() !== currentName) {
        const r = await updateFullName(name.trim());
        if (r.error) { Alert.alert(T("Error", "خطأ"), r.error); return; }
      }
      if (phone.trim() !== currentPhone) {
        const rp = await updatePhone(phone.trim());
        if (rp.error) { Alert.alert(T("Error", "خطأ"), rp.error); return; }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  function handleChangeEmail() {
    Alert.prompt(
      T("Change Email", "تغيير البريد"),
      T("Enter your new email address:", "أدخل بريدك الإلكتروني الجديد:"),
      async (email) => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Alert.alert(
            T("Invalid Email", "بريد غير صالح"),
            T("Please enter a valid email.", "أدخل بريداً صحيحاً.")
          );
          return;
        }
        const r = await updateEmail(email.trim());
        if (r.error) {
          Alert.alert(T("Error", "خطأ"), r.error);
        } else {
          Alert.alert(
            T("Check Your Email", "تحقق من بريدك"),
            T(
              "A confirmation link has been sent to your new email address.",
              "تم إرسال رابط التأكيد إلى بريدك الجديد."
            )
          );
        }
      },
      "plain-text",
      user?.email || ""
    );
  }

  const nothingChanged = name.trim() === currentName && phone.trim() === currentPhone;
  const saveBtnDisabled = busy || nothingChanged;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={C.text.primary} />
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              { color: C.text.primary, fontFamily: ff("700") },
            ]}
          >
            {T("Edit Profile", "تعديل الملف الشخصي")}
          </Text>
          {/* spacer keeps title centred */}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: C.bg.base },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Display Name ───────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                { color: C.text.secondary, fontFamily: ff("600") },
              ]}
            >
              {T("Display Name", "الاسم")}
            </Text>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError("");
                setSaved(false);
              }}
              placeholder={T("Your full name", "اسمك الكامل")}
              placeholderTextColor={C.text.muted}
              style={[
                styles.input,
                {
                  backgroundColor: C.bg.surface,
                  borderColor: nameError ? "#E4615A" : C.border.subtle,
                  color: C.text.primary,
                  fontFamily: ff("400"),
                  textAlign: isAr ? "right" : "left",
                },
              ]}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            {nameError ? (
              <Text style={styles.fieldError}>{nameError}</Text>
            ) : null}
          </View>

          {/* ── Mobile Number (parity with web Personal Info) ──────── */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: C.text.secondary, fontFamily: ff("600") }]}>
              {T("Mobile Number", "رقم الجوال")}
            </Text>
            <TextInput
              value={phone}
              onChangeText={(t) => { setPhone(t); setSaved(false); }}
              placeholder={T("e.g. +20 100 000 0000", "مثال: ٠١٠٠ ٠٠٠ ٠٠٠٠")}
              placeholderTextColor={C.text.muted}
              keyboardType="phone-pad"
              style={[
                styles.input,
                {
                  backgroundColor: C.bg.surface,
                  borderColor: C.border.subtle,
                  color: C.text.primary,
                  fontFamily: ff("400"),
                  textAlign: isAr ? "right" : "left",
                },
              ]}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
          </View>

          {/* ── Save Button ────────────────────────────────────────── */}
          <Pressable
            onPress={handleSaveName}
            disabled={saveBtnDisabled}
            style={[
              styles.saveBtn,
              {
                backgroundColor: saveBtnDisabled ? C.border.default : C.primary,
              },
              isRTL && { flexDirection: "row-reverse" },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : saved ? (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text
                  style={[styles.saveBtnText, { fontFamily: ff("700") }]}
                >
                  {T("Saved!", "تم الحفظ!")}
                </Text>
              </>
            ) : (
              <Text
                style={[styles.saveBtnText, { fontFamily: ff("700") }]}
              >
                {T("Save Changes", "حفظ التغييرات")}
              </Text>
            )}
          </Pressable>

          {/* ── Divider ────────────────────────────────────────────── */}
          <View
            style={[styles.divider, { backgroundColor: C.border.subtle }]}
          />

          {/* ── Email ──────────────────────────────────────────────── */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                { color: C.text.secondary, fontFamily: ff("600") },
              ]}
            >
              {T("Email Address", "البريد الإلكتروني")}
            </Text>

            {/* Read-only email display */}
            <View
              style={[
                styles.input,
                styles.emailDisplay,
                {
                  backgroundColor: C.bg.surface,
                  borderColor: C.border.subtle,
                },
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <Text
                style={{
                  flex: 1,
                  color: C.text.secondary,
                  fontFamily: ff("400"),
                  fontSize: Typography.base,
                }}
                numberOfLines={1}
              >
                {user?.email || "—"}
              </Text>
              <Ionicons name="lock-closed" size={14} color={C.text.muted} />
            </View>

            {/* Change email link */}
            <Pressable
              onPress={handleChangeEmail}
              style={[styles.changeEmailBtn, isRTL && { flexDirection: "row-reverse" }]}
              hitSlop={8}
            >
              <Ionicons name="mail-outline" size={14} color={C.primary} />
              <Text
                style={[
                  styles.changeEmailText,
                  { color: C.primary, fontFamily: ff("600") },
                ]}
              >
                {T("Change email address", "تغيير البريد الإلكتروني")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.lg,
  },
  scrollContent: {
    padding: Spacing[5],
    gap: Spacing[5],
    paddingBottom: 60,
  },
  fieldGroup: {
    gap: Spacing[2],
  },
  label: {
    fontSize: Typography.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    fontSize: Typography.base,
  },
  emailDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldError: {
    color: "#E4615A",
    fontSize: Typography.xs,
    marginTop: 2,
  },
  saveBtn: {
    height: 54,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing[2],
  },
  saveBtnText: {
    color: "#fff",
    fontSize: Typography.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing[2],
  },
  changeEmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing[1],
  },
  changeEmailText: {
    fontSize: Typography.sm,
  },
});

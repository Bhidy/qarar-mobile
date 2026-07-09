import { ScrollView, View, StyleSheet, Pressable } from "react-native";
import { formatDate } from "@/lib/format-date";
import { displayAuthors } from "@/lib/byline";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { getLogoSvg } from "@/constants/logos";
import { SignalBadge } from "@/components/shared/SignalBadge";

// Mirror of ContentCard's thumbnail gradients so the listing matches the rails.
const cardGradients = ["#0F2050", "#0F1932", "#1E0A38", "#2A1508", "#0A1E30", "#220A14", "#051828", "#162347"];
const gradFor = (id: string) => cardGradients[Math.abs(parseInt(id, 10) || id.charCodeAt(0)) % cardGradients.length];

export default function AllReleasesScreen() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const { ARTICLES, SAUDI_ARTICLES } = useData();
  const isAr = language === "ar";
  const isSaudi = market === "saudi";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const items = (isSaudi ? SAUDI_ARTICLES : ARTICLES) as any[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary, fontFamily: ff("700") }]}>
          {isAr ? "أحدث التقارير والرؤى" : "Latest Reports & Insights"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "لا يوجد محتوى بعد" : "No releases yet"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing[4], gap: Spacing[3] }}>
          {items.map((card) => {
            const title = isAr && card.titleAr ? card.titleAr : card.title;
            const subtitle = isAr && card.subtitleAr ? card.subtitleAr : card.subtitle;
            const logoSvg = card.ticker ? getLogoSvg(card.ticker) : null;
            return (
              <Pressable
                key={card.id}
                onPress={() => router.push({ pathname: "/article/[id]", params: { id: String(card.id) } })}
                style={({ pressed }) => [styles.row, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && styles.rowRTL, pressed && { opacity: 0.85 }]}
              >
                {/* Thumbnail */}
                <View style={[styles.thumb, { backgroundColor: gradFor(String(card.id)) }]}>
                  <View style={[styles.accentLine, { backgroundColor: `${C.primary}40` }]} />
                  {logoSvg ? (
                    <View style={styles.logoWrap}><SvgXml xml={logoSvg} width={40} height={26} /></View>
                  ) : card.ticker ? (
                    <View style={styles.tickerBox}><Text style={styles.tickerBoxText}>{card.ticker}</Text></View>
                  ) : (
                    <Ionicons name={card.type === "video" || card.type === "live" ? "play-circle" : "document-text"} size={28} color="rgba(255,255,255,0.3)" />
                  )}
                  {card.type === "live" || card.type === "video" ? (
                    <View style={isRTL ? { position: "absolute", top: 6, right: 6 } : styles.typeBadge}>
                      {card.type === "live" ? (
                        <View style={[styles.chip, { backgroundColor: "rgba(228,97,90,0.92)" }]}>
                          <View style={styles.liveDot} /><Text style={styles.chipText}>LIVE</Text>
                        </View>
                      ) : (
                        <View style={[styles.chip, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                          <Ionicons name="play" size={8} color="rgba(255,255,255,0.9)" />
                          <Text style={styles.chipText}>{isAr ? "فيديو" : "Video"}</Text>
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>

                {/* Body */}
                <View style={styles.body}>
                  {!!card.tag && (
                    <View style={{ alignSelf: isRTL ? "flex-end" : "flex-start", marginBottom: 4 }}>
                      <SignalBadge signal={card.tag} size="sm" />
                    </View>
                  )}
                  <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("700") }, isRTL && styles.textRight]} numberOfLines={2}>
                    {title}
                  </Text>
                  {!!subtitle && (
                    <Text style={[styles.subtitle, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.textRight]} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  )}
                  <View style={[styles.meta, isRTL && styles.rowRTL]}>
                    <Text style={[styles.metaText, { color: C.text.muted, fontFamily: ff("600") }]} numberOfLines={1}>
                      {displayAuthors(card.author as any, isAr)}
                    </Text>
                    <Text style={[styles.metaText, { color: C.text.muted, fontFamily: ff("400") }]}>{formatDate(card.date)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
          <View style={{ height: Spacing[6] }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Typography.base, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing[2], padding: Spacing[6] },
  emptyText: { fontSize: Typography.base },
  row: { flexDirection: "row", gap: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3], alignItems: "center" },
  rowRTL: { flexDirection: "row-reverse" },
  thumb: { width: 104, height: 78, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" },
  accentLine: { position: "absolute", width: 2, height: "180%", top: "-40%", right: "28%", transform: [{ rotate: "20deg" }] },
  logoWrap: { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  tickerBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.12)" },
  tickerBoxText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  typeBadge: { position: "absolute", top: 6, left: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  chipText: { color: "#fff", fontSize: 8, fontWeight: "700", letterSpacing: 0.4 },
  body: { flex: 1, gap: 3 },
  title: { fontSize: Typography.sm, lineHeight: 19 },
  subtitle: { fontSize: 12, lineHeight: 16 },
  textRight: { textAlign: "right", writingDirection: "rtl" },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2, gap: Spacing[2] },
  metaText: { fontSize: 10, flexShrink: 1 },
});

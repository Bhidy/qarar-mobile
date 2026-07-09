import { useMemo } from "react";
import { formatDate } from "@/lib/format-date";
import { categoryLabel } from "@/lib/news-categories";
import { ScrollView, View, StyleSheet, Pressable, Image, Linking } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { NewsCover } from "@/components/shared/NewsCover";

/** Strip HTML → readable paragraphs (no WebView dependency on mobile). */
function htmlToParagraphs(html?: string | null): string[] {
  if (!html) return [];
  const text = html
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    // Dashes/ellipsis + numeric entities — a raw "&ndash;" was rendering as
    // literal text ("ndash; 1&") inside Arabic news bodies.
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&hellip;/gi, "\u2026")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useColors();
  const { language, isRTL } = useTheme();
  const { NEWS, SAUDI_NEWS } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const item: any = useMemo(
    () => [...(NEWS as any[]), ...(SAUDI_NEWS as any[])].find((n) => String(n.id) === String(id)),
    [NEWS, SAUDI_NEWS, id]
  );

  const title = item ? (isAr && item.titleAr ? item.titleAr : item.title) : "";
  const paragraphs = useMemo(() => {
    if (!item) return [];
    const body = isAr ? item.bodyAr || item.body : item.body || item.bodyAr;
    return htmlToParagraphs(body);
  }, [item, isAr]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{isAr ? "الخبر" : "News"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {!item ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "الخبر غير متوفر" : "Article not found"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing[8] }}>
          <NewsCover id={String(item.id)} image={item.image} ticker={item.ticker} category={item.category} height={200} />
          <View style={styles.body}>
            {!!item.category && (
              <Text style={[styles.kicker, { color: C.primary, fontFamily: ff("700") }, isRTL && styles.right]}>
                {isRTL ? categoryLabel(item.category, true) : categoryLabel(item.category, false).toUpperCase()}
              </Text>
            )}
            <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
              {title}
            </Text>
            <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
              {!!item.date && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>{formatDate(item.date)}</Text>}
              {!!item.source && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>· {item.source}</Text>}
            </View>

            {!!item.ticker && (
              <Pressable
                style={[styles.tickerPill, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}30` }]}
                onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: String(item.ticker) } })}
              >
                <Ionicons name="trending-up" size={13} color={C.primary} />
                <Text style={[styles.tickerText, { color: C.primary, fontFamily: ff("700") }]}>{item.ticker}</Text>
              </Pressable>
            )}

            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <Text
                  key={i}
                  style={[styles.para, { color: C.text.secondary, fontFamily: ff("400") }, isRTL && styles.right]}
                >
                  {p}
                </Text>
              ))
            ) : (
              <Text style={[styles.para, { color: C.text.muted, fontFamily: ff("400") }, isRTL && styles.right]}>
                {isAr ? "النص الكامل غير متوفر بعد." : "The full story text isn't available yet."}
              </Text>
            )}

            {!!item.url && (
              <Pressable
                style={[styles.sourceBtn, { borderColor: C.border.default }]}
                onPress={() => Linking.openURL(item.url)}
              >
                <Text style={[styles.sourceText, { color: C.text.secondary, fontFamily: ff("600") }]}>
                  {isAr ? "اقرأ من المصدر" : "Read at source"}
                </Text>
                <Ionicons name="open-outline" size={15} color={C.text.secondary} />
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Typography.base, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing[2] },
  emptyText: { fontSize: Typography.sm },
  cover: { width: "100%", height: 200, backgroundColor: "#0001" },
  body: { padding: Spacing[4], gap: Spacing[2] },
  kicker: { fontSize: 11, letterSpacing: 1 },
  title: { fontSize: Typography.xl, fontWeight: "800", lineHeight: 30 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginTop: 2 },
  meta: { fontSize: Typography.xs },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  tickerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, marginTop: Spacing[1] },
  tickerText: { fontSize: Typography.xs, fontWeight: "700" },
  para: { fontSize: Typography.sm, lineHeight: 23, marginTop: Spacing[2] },
  sourceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: Spacing[4], paddingVertical: 12, borderRadius: Radius.lg, borderWidth: 1 },
  sourceText: { fontSize: Typography.sm },
});

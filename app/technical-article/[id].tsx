import { useMemo } from "react";
import { ScrollView, View, StyleSheet, Pressable } from "react-native";
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
    .replace(/&ldquo;|&rdquo;/gi, '"');
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

export default function TechnicalArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useColors();
  const { language, isRTL } = useTheme();
  const { TECHNICAL_ARTICLES } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const item = useMemo(
    () => (TECHNICAL_ARTICLES as any[]).find((a) => String(a.id) === String(id)),
    [TECHNICAL_ARTICLES, id]
  );

  const pick = (en?: string, ar?: string) => (isAr ? (ar || en) : (en || ar)) ?? "";
  const title = item ? pick(item.title, item.titleAr) : "";
  const subtitle = item ? pick(item.subtitle, item.subtitleAr) : "";

  const blocks = useMemo(() => {
    if (!item) return [] as { label: string; paras: string[] }[];
    return [
      { label: isAr ? "الجزء الفني" : "Technical Analysis", paras: htmlToParagraphs(pick(item.technicalBody, item.technicalBodyAr)) },
      { label: isAr ? "ملخص حركة السعر" : "Price Movement Summary", paras: htmlToParagraphs(pick(item.priceSummary, item.priceSummaryAr)) },
      { label: isAr ? "تنويه" : "Disclaimer", paras: htmlToParagraphs(pick(item.disclaimer, item.disclaimerAr)), muted: true } as any,
    ].filter((b) => b.paras.length > 0);
  }, [item, isAr]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{isAr ? "مقال فني" : "Technical Article"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {!item ? (
        <View style={styles.empty}>
          <Ionicons name="analytics-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "المقال غير متوفر" : "Article not found"}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing[8] }}>
          <NewsCover image={item.chartImage} ticker={item.ticker} category={"Market"} height={200} />
          <View style={styles.body}>
            {!!item.chartTimeframe && (
              <Text style={[styles.kicker, { color: C.accent.teal, fontFamily: ff("700") }, isRTL && styles.right]}>
                {String(item.chartTimeframe).toUpperCase()}
              </Text>
            )}
            <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: C.text.secondary, fontFamily: ff("400") }, isRTL && styles.right]}>
                {subtitle}
              </Text>
            )}
            <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
              {!!item.date && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>{item.date}</Text>}
              {!!item.analyst && <Text style={[styles.meta, { color: C.text.muted, fontFamily: ff("400") }]}>· {item.analyst}</Text>}
            </View>

            {!!item.ticker && (
              <Pressable
                style={[styles.tickerPill, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}30` }]}
                onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: String(item.ticker) } })}
              >
                <Ionicons name="trending-up" size={13} color={C.primary} />
                <Text style={[styles.tickerText, { color: C.primary, fontFamily: ff("700") }]}>
                  {item.ticker}{item.company ? ` · ${item.company}` : ""}
                </Text>
              </Pressable>
            )}

            {blocks.map((b, bi) => (
              <View key={bi} style={{ marginTop: Spacing[4] }}>
                <Text style={[styles.blockLabel, { color: (b as any).muted ? C.text.muted : C.text.primary, fontFamily: ff("800") }, isRTL && styles.right]}>
                  {b.label}
                </Text>
                {b.paras.map((p: string, i: number) => (
                  <Text
                    key={i}
                    style={[
                      (b as any).muted ? styles.disclaimerPara : styles.para,
                      { color: (b as any).muted ? C.text.muted : C.text.secondary, fontFamily: ff("400") },
                      isRTL && styles.right,
                    ]}
                  >
                    {p}
                  </Text>
                ))}
              </View>
            ))}
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
  body: { padding: Spacing[4], gap: Spacing[2] },
  kicker: { fontSize: 11, letterSpacing: 1 },
  title: { fontSize: Typography.xl, fontWeight: "800", lineHeight: 30 },
  subtitle: { fontSize: Typography.sm, lineHeight: 22, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginTop: 2 },
  meta: { fontSize: Typography.xs },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  tickerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, marginTop: Spacing[1] },
  tickerText: { fontSize: Typography.xs, fontWeight: "700" },
  blockLabel: { fontSize: Typography.md, fontWeight: "800", marginBottom: Spacing[1] },
  para: { fontSize: Typography.sm, lineHeight: 23, marginTop: Spacing[2] },
  disclaimerPara: { fontSize: Typography.xs, lineHeight: 19, marginTop: Spacing[1] },
});

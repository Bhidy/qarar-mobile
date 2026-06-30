import { useMemo, useState } from "react";
import { ScrollView, View, StyleSheet, Pressable, Linking, FlatList } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { useData } from "@/hooks/useData";
import { fontFamilyFor } from "@/lib/typography";
import { WEB_BASE } from "@/constants/site";

// Same-origin proxy fallback for rows ingested before fileUrl was wired (WEB_BASE = canonical site).
function pdfUrl(doc: any): string | null {
  if (doc?.fileUrl) return doc.fileUrl;
  if (doc?.fileGuid) return `${WEB_BASE}/api/research/file?guid=${encodeURIComponent(doc.fileGuid)}`;
  return null;
}

// Type filter parity with web /research — adds macro / earnings / other so the
// chips always reflect every report type the feed produces. Filter chips are
// still surfaced only for types actually present in the docs list.
const TYPE_META: Record<string, { en: string; ar: string; color: (C: any) => string }> = {
  all:         { en: "All",          ar: "الكل",      color: (C) => C.primary },
  fundamental: { en: "Fundamental",  ar: "أساسي",    color: (C) => C.accent.teal },
  technical:   { en: "Technical",    ar: "فني",      color: (C) => C.accent.gold },
  rta:         { en: "RTA",          ar: "RTA",      color: () => "#8b5cf6" },
  daily:       { en: "Daily",        ar: "يومي",     color: (C) => C.accent.gold },
  macro:       { en: "Macro",        ar: "اقتصادي",  color: (C) => C.primary },
  earnings:    { en: "Earnings",     ar: "أرباح",    color: (C) => C.accent.gold },
  other:       { en: "Reports",      ar: "تقارير",   color: (C) => C.primary },
};

function prettyDate(d?: string | null): string {
  if (!d) return "";
  if (/^\d{8}$/.test(d)) {
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${+d.slice(6, 8)} ${M[+d.slice(4, 6) - 1]} ${d.slice(0, 4)}`;
  }
  return d;
}

export default function ResearchScreen() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const { RESEARCH_DOCS } = useData();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const [filter, setFilter] = useState("all");

  // Mubasher's own reports only — the Decypha feed mixes in third-party houses
  // (Okaz, JLL, EY, …) under the same contributor code; Mubasher reports are
  // titled "Mubasher:"/"مباشر:" and carry publisher 1026.
  const isMubasher = (d: any) => {
    const t = `${d.title || ""} ${d.titleAr || ""}`;
    return /mubasher/i.test(t) || t.includes("مباشر") || String(d.publisherId) === "1026";
  };

  // Only reports from 2026-01-01 onward, in the reader's language, newest first.
  const visible = useMemo(() => {
    const want = isAr ? "AR" : "EN";
    return (RESEARCH_DOCS as any[])
      .filter(isMubasher)
      .filter((d) => String(d.reportDate || "") >= "20260101")
      .filter((d) => String(d.lang || "EN").toUpperCase().startsWith(want))
      .sort((a, b) => String(b.reportDate || "").localeCompare(String(a.reportDate || "")));
  }, [RESEARCH_DOCS, isAr]);

  const types = useMemo(() => {
    const set = new Set<string>(["all"]);
    visible.forEach((d) => set.add(d.reportType || "other"));
    return Array.from(set);
  }, [visible]);

  const docs = useMemo(
    () => visible.filter((d) => filter === "all" || (d.reportType || "other") === filter),
    [visible, filter]
  );

  const open = (doc: any) => {
    const url = pdfUrl(doc);
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: C.border.subtle }, isRTL && styles.rowRTL]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]}>{isAr ? "التقارير البحثية" : "Research Reports"}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter chips */}
      <View style={{ borderBottomColor: C.border.subtle, borderBottomWidth: 1 }}>
        <FlatList
          horizontal
          inverted={isRTL}
          data={types}
          keyExtractor={(t) => t}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item: ty }) => {
            const meta = TYPE_META[ty] ?? { en: ty, ar: ty, color: (C: any) => C.text.muted };
            const active = filter === ty;
            const col = meta.color(C);
            return (
              <Pressable
                onPress={() => setFilter(ty)}
                style={[styles.chip, { borderColor: active ? col : C.border.subtle, backgroundColor: active ? `${col}1A` : "transparent" }]}
              >
                <Text style={[styles.chipText, { color: active ? col : C.text.muted, fontFamily: ff("700") }]}>
                  {isAr ? meta.ar : meta.en}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {docs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={28} color={C.text.muted} />
          <Text style={[styles.emptyText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {isAr ? "لا توجد تقارير بعد" : "No research reports yet"}
          </Text>
          <Text style={[styles.emptySub, { color: C.text.muted, fontFamily: ff("400") }]}>
            {isAr ? "تظهر التقارير هنا بمجرد مزامنة موجز مباشر." : "Reports appear once the Mubasher feed syncs."}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing[4], gap: Spacing[3] }}>
          {docs.map((d) => {
            const meta = TYPE_META[d.reportType] ?? { en: d.reportType || "Report", ar: "تقرير", color: (C: any) => C.text.muted };
            const col = meta.color(C);
            const title = isAr && d.titleAr ? d.titleAr : d.title;
            return (
              <Pressable
                key={d.id}
                onPress={() => open(d)}
                style={({ pressed }) => [styles.card, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.cardTop, isRTL && styles.rowRTL]}>
                  <View style={[styles.typeChip, { backgroundColor: `${col}1A` }]}>
                    <Text style={[styles.typeChipText, { color: col, fontFamily: ff("700") }]}>{isAr ? meta.ar : meta.en}</Text>
                  </View>
                  <Text style={[styles.cardDate, { color: C.text.muted, fontFamily: ff("400") }]}>{prettyDate(d.reportDate)}</Text>
                </View>
                <View style={[styles.cardBody, isRTL && styles.rowRTL]}>
                  <View style={[styles.fileIcon, { backgroundColor: `${col}14` }]}>
                    <Ionicons name="document-text" size={18} color={col} />
                  </View>
                  <Text style={[styles.cardTitle, { color: C.text.primary, fontFamily: ff("700") }, isRTL && styles.right]} numberOfLines={3}>
                    {title}
                  </Text>
                </View>
                <View style={[styles.cardFoot, { borderTopColor: C.border.subtle }, isRTL && styles.rowRTL]}>
                  <Text style={[styles.cardMeta, { color: C.text.muted, fontFamily: ff("400") }]} numberOfLines={1}>
                    {[d.contributor, d.ticker].filter(Boolean).join(" · ")}
                  </Text>
                  <View style={[styles.openRow, isRTL && styles.rowRTL]}>
                    <Text style={[styles.openText, { color: col, fontFamily: ff("700") }]}>{isAr ? "فتح PDF" : "Open PDF"}</Text>
                    <Ionicons name="open-outline" size={13} color={col} />
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
  chips: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[2] },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, marginRight: Spacing[2] },
  chipText: { fontSize: Typography.xs, fontWeight: "700" },
  rowRTL: { flexDirection: "row-reverse" },
  right: { textAlign: "right", writingDirection: "rtl" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing[2], padding: Spacing[6] },
  emptyText: { fontSize: Typography.base },
  emptySub: { fontSize: Typography.xs, textAlign: "center" },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing[3] },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  typeChipText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  cardDate: { fontSize: Typography.xs },
  cardBody: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[3] },
  fileIcon: { width: 36, height: 36, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  cardTitle: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1 },
  cardMeta: { flex: 1, fontSize: Typography.xs },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  openText: { fontSize: Typography.xs, fontWeight: "700" },
});

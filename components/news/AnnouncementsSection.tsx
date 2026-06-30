import { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable, FlatList, TextInput, Modal, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { fontFamilyFor } from "@/lib/typography";
import { supabasePublic } from "@/lib/supabase";
import { WEB_BASE } from "@/constants/site";

interface Announcement {
  id: string;
  title: string;
  titleAr?: string | null;
  ticker?: string | null;
  companyName?: string | null;
  date?: string | null;
  publishedTs?: number | null;
  market?: string | null;
}

interface AnnDetail {
  body?: string | null;
  bodyAr?: string | null;
  title?: string | null;
  titleAr?: string | null;
}

async function loadBody(annId: string): Promise<AnnDetail | null> {
  const rawId = annId.startsWith("ann-") ? annId.slice(4) : annId;
  try {
    const res = await fetch(`${WEB_BASE}/api/mubasher/announcement-body?id=${encodeURIComponent(rawId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AnnouncementsSection() {
  const C = useColors();
  const { market, language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Announcement | null>(null);
  const [bodyCache, setBodyCache] = useState<Record<string, AnnDetail | null>>({});
  const [bodyLoading, setBodyLoading] = useState(false);

  useEffect(() => {
    // MUST be supabasePublic — the user-bound `supabase` client carries an
    // `authenticated` JWT, and the `announcements` table grants SELECT only to
    // `anon`, so every signed-in user read returns zero rows (root cause of the
    // empty Announcements tab parity-gap vs. web).
    if (!supabasePublic) { setLoading(false); return; }
    setLoading(true);
    const mkt = market === "usa" ? "usa" : market === "saudi" ? "saudi" : "egypt";
    supabasePublic
      .from("announcements")
      .select("id,title,titleAr,ticker,companyName,date,publishedTs,market")
      .eq("market", mkt)
      .order("publishedTs", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data ?? []) as Announcement[]);
        setLoading(false);
      });
  }, [market]);

  const openAnn = useCallback(async (a: Announcement) => {
    setActive(a);
    if (a.id in bodyCache) return;
    setBodyLoading(true);
    const detail = await loadBody(a.id);
    setBodyCache(prev => ({ ...prev, [a.id]: detail }));
    setBodyLoading(false);
  }, [bodyCache]);

  const closeAnn = useCallback(() => setActive(null), []);

  const visible = items.filter(a => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      (a.titleAr ?? "").includes(query.trim()) ||
      a.ticker?.toLowerCase().includes(q) ||
      a.companyName?.toLowerCase().includes(q)
    );
  });

  const activeDetail = active ? (bodyCache[active.id] ?? null) : null;
  const bodyText = activeDetail
    ? (isAr ? activeDetail.bodyAr || activeDetail.body : activeDetail.body || activeDetail.bodyAr) ?? null
    : null;

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={[s.searchWrap, { borderBottomColor: C.border.subtle }]}>
        <View style={[s.searchBox, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && s.rowRTL]}>
          <Ionicons name="search" size={15} color={C.text.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isAr ? "ابحث في الإفصاحات…" : "Search announcements…"}
            placeholderTextColor={C.text.muted}
            style={[s.input, { color: C.text.primary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left" }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={C.text.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[s.centerText, { color: C.text.muted, fontFamily: ff("400") }]}>
            {isAr ? "جاري التحميل…" : "Loading…"}
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="megaphone-outline" size={36} color={C.text.muted} />
          <Text style={[s.centerText, { color: C.text.muted, fontFamily: ff("600") }]}>
            {query ? (isAr ? "لا توجد نتائج" : "No results") : (isAr ? "لا توجد إفصاحات" : "No announcements yet")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={a => a.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: Spacing[4], paddingBottom: TAB_BAR_CLEARANCE, gap: Spacing[2] }}
          renderItem={({ item: a }) => {
            const title = isAr ? (a.titleAr || a.title) : (a.title || a.titleAr || "");
            return (
              <Pressable
                onPress={() => openAnn(a)}
                style={({ pressed }) => [
                  s.card,
                  { backgroundColor: C.bg.surface, borderColor: C.border.subtle },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <View style={[s.cardRow, isRTL && s.rowRTL]}>
                  <View style={[s.cardIcon, { backgroundColor: C.bg.elevated, borderColor: C.border.subtle }]}>
                    <Ionicons name="business-outline" size={16} color={C.text.muted} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={[s.cardTitle, { color: C.text.primary, fontFamily: ff("600") }, isRTL && s.textRight]}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                    <View style={[s.cardMeta, isRTL && s.rowRTL]}>
                      {a.ticker ? (
                        <View style={[s.tickerPill, { backgroundColor: `${C.primary}14` }]}>
                          <Text style={[s.tickerText, { color: C.primary, fontFamily: ff("700") }]}>
                            {a.ticker}
                          </Text>
                        </View>
                      ) : null}
                      {a.date ? (
                        <Text style={[s.dateText, { color: C.text.muted, fontFamily: ff("400") }]}>
                          {a.date}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={14}
                    color={C.text.muted}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Detail sheet */}
      <Modal
        visible={!!active}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAnn}
      >
        <SafeAreaView style={[s.modal, { backgroundColor: C.bg.base }]} edges={["top"]}>
          <View style={[s.modalHeader, { borderBottomColor: C.border.subtle }, isRTL && s.rowRTL]}>
            <Pressable style={[s.closeBtn, { backgroundColor: C.bg.elevated }]} onPress={closeAnn}>
              <Ionicons name="close" size={18} color={C.text.primary} />
            </Pressable>
            <Text style={[s.modalTitle, { color: C.text.primary, fontFamily: ff("700") }]} numberOfLines={3}>
              {active ? (isAr ? (active.titleAr || active.title) : active.title) : ""}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: TAB_BAR_CLEARANCE, gap: Spacing[3] }} showsVerticalScrollIndicator={false}>
            <View style={[s.metaRow, isRTL && s.rowRTL]}>
              {active?.ticker ? (
                <View style={[s.tickerPill, { backgroundColor: `${C.primary}14` }]}>
                  <Text style={[s.tickerText, { color: C.primary, fontFamily: ff("700") }]}>
                    {active.ticker}
                  </Text>
                </View>
              ) : null}
              {active?.date ? (
                <Text style={[s.dateText, { color: C.text.muted, fontFamily: ff("400") }]}>
                  {active.date}
                </Text>
              ) : null}
            </View>

            {bodyLoading ? (
              <View style={[s.center, { paddingVertical: Spacing[8] }]}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : bodyText ? (
              <Text style={[s.bodyText, { color: C.text.secondary, fontFamily: ff("400") }, isRTL && s.textRight]}>
                {bodyText}
              </Text>
            ) : (
              <Text style={[s.mutedText, { color: C.text.muted, fontFamily: ff("400") }, isRTL && s.textRight]}>
                {isAr ? "لا يوجد تفاصيل إضافية." : "No additional details available."}
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  rowRTL:     { flexDirection: "row-reverse" },
  textRight:  { textAlign: "right", writingDirection: "rtl" },
  searchWrap: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  searchBox:  { flexDirection: "row", alignItems: "center", gap: Spacing[2], height: 42, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing[3] },
  input:      { flex: 1, fontSize: Typography.sm, padding: 0 },
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing[2], padding: Spacing[8] },
  centerText: { fontSize: Typography.sm, textAlign: "center" },
  card:       { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3] },
  cardRow:    { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  cardIcon:   { width: 36, height: 36, borderRadius: Radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cardTitle:  { fontSize: Typography.sm, lineHeight: 19 },
  cardMeta:   { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  tickerPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  tickerText: { fontSize: 11, fontWeight: "700" },
  dateText:   { fontSize: 11 },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: Spacing[2], flexWrap: "wrap" },
  modal:      { flex: 1 },
  modalHeader:{ flexDirection: "row", alignItems: "flex-start", gap: Spacing[3], padding: Spacing[4], borderBottomWidth: 1 },
  closeBtn:   { width: 34, height: 34, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  modalTitle: { flex: 1, fontSize: Typography.base, lineHeight: 22 },
  bodyText:   { fontSize: Typography.sm, lineHeight: 22 },
  mutedText:  { fontSize: Typography.sm, lineHeight: 22 },
});

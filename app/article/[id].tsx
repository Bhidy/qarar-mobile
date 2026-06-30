import { ScrollView, View, StyleSheet, Pressable } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTheme } from "@/context/ThemeContext";
import { Spacing, Radius, Typography } from "@/constants/theme";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { useData } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { RichText, looksLikeHtml } from "@/lib/rich-text";
import { fontFamilyFor } from "@/lib/typography";

export default function ArticleDetail() {
  const C = useColors();
  const { language, isRTL } = useTheme();
  const isAr = language === "ar";
  const ff = (w: "400" | "600" | "700" | "800") => fontFamilyFor(isAr, w);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ARTICLES, SAUDI_ARTICLES } = useData();
  const { premium, user, subscriptionsEnabled } = useAuth();
  // Search both markets so a Saudi article resolves too (ARTICLES is Egypt-only).
  const all = [...ARTICLES, ...SAUDI_ARTICLES];
  // No `?? all[0]` fallback: a stale/deleted id must hit the not-found screen below,
  // not silently render an unrelated report (audit mobile-H1).
  const article = all.find(a => a.id === id);

  // Graceful not-found instead of crashing when the list is empty / id is bad
  if (!article) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: C.border.subtle }]}>
          <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={20} color={C.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text.primary }]} numberOfLines={1}>{isAr ? "الأبحاث" : "Research"}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 }}>
          <Ionicons name="document-text-outline" size={36} color={C.text.muted} />
          <Text style={{ color: C.text.primary, fontWeight: "700", fontSize: 16 }}>{isAr ? "التقرير غير متاح" : "Report not available"}</Text>
          <Text style={{ color: C.text.muted, textAlign: "center" }}>{isAr ? "تعذّر تحميل هذا التقرير. اسحب للتحديث أو حاول مرة أخرى." : "This report could not be loaded. Pull to refresh or try again later."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Null-safe author derivation — never crash on missing/empty author
  const authors = (article.author ?? []).filter(Boolean);
  const authorName = authors.join(" & ") || "Smart Signals Research";
  const authorInitial = (authorName.trim().charAt(0) || "S").toUpperCase();

  const related = all.filter(a => a.id !== article.id && (a.ticker === article.ticker || a.section === article.section)).slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg.base }} edges={["top"]}>
      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: C.border.subtle }]}>
        <Pressable style={[styles.backBtn, { backgroundColor: C.bg.elevated }]} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={20} color={C.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text.primary }]} numberOfLines={1}>
          {article.ticker ?? (isAr ? "الأبحاث" : "Research")}
        </Text>
        <Pressable style={[styles.shareBtn, { backgroundColor: C.bg.elevated }]}>
          <Ionicons name="share-outline" size={18} color={C.text.secondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={[styles.hero, { backgroundColor: C.bg.surface }]}>
          {/* Category + (optional) signal — reading-time chip removed */}
          <View style={[styles.heroMeta, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.catChip, { backgroundColor: `${C.primary}15`, borderColor: `${C.primary}25` }]}>
              <Ionicons
                name={article.type === "video" ? "play" : "document-text"}
                size={10} color={C.primary}
              />
              <Text style={[styles.catChipText, { color: C.primary }]}>
                {article.type === "video" ? (isAr ? "فيديو" : "Video") : (isAr ? "تقرير" : "Report")}
              </Text>
            </View>
            {article.tag && <SignalBadge signal={article.tag} size="sm" />}
          </View>

          {/* Title — reader's language */}
          <Text style={[styles.title, { color: C.text.primary, fontFamily: ff("800"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>
            {isAr && article.titleAr ? article.titleAr : article.title}
          </Text>

          {/* Subtitle — reader's language */}
          {(isAr && article.subtitleAr ? article.subtitleAr : article.subtitle) ? (
            <Text style={[styles.subtitle, { color: C.text.secondary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>
              {isAr && article.subtitleAr ? article.subtitleAr : article.subtitle}
            </Text>
          ) : null}

          {/* Author row */}
          <View style={[styles.authorRow, { borderTopColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.authorAvatar, { backgroundColor: C.primarySoft }]}>
              <Text style={[styles.authorAvatarText, { color: C.primary }]}>
                {authorInitial}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: C.text.primary }]}>
                {authorName}
              </Text>
              {article.authorRole ? (
                <Text style={[styles.authorRole, { color: C.text.muted }]}>{article.authorRole}</Text>
              ) : null}
            </View>
            <Text style={[styles.articleDate, { color: C.text.muted }]}>{article.date}</Text>
          </View>
        </View>

        {/* Ticker pill (if applicable) */}
        {article.ticker ? (
          <View style={[styles.tickerBanner, { backgroundColor: C.bg.elevated, borderBottomColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.tickerPill, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}30` }]}>
              <Text style={[styles.tickerText, { color: C.primary }]}>{article.ticker}</Text>
            </View>
            <Pressable
              style={[styles.stockLink, isRTL && { flexDirection: "row-reverse" }]}
              onPress={() => router.push({ pathname: "/stock/[ticker]", params: { ticker: article.ticker! } })}
            >
              <Text style={[styles.stockLinkText, { color: C.primary }]}>{isAr ? "عرض تفاصيل السهم" : "View Stock Detail"}</Text>
              <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={12} color={C.primary} />
            </Pressable>
          </View>
        ) : null}

        {/* Article body — reader's language; rich HTML or plain paragraphs */}
        <View style={[styles.body, { paddingHorizontal: Spacing[4] }]}>
          {(() => {
            const body = isAr && article.bodyAr ? article.bodyAr : article.body;
            const isReport = article.type === "article";
            // Subscription paywall — ONLY shown when the paid model is live. While it's
            // off, every report is fully open (premium is forced true), so this branch
            // never runs and no payment language is ever shown.
            if (subscriptionsEnabled && isReport && !premium) {
              return (
                <View style={[styles.lockedBox, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <Ionicons name="lock-closed" size={32} color={C.text.muted} />
                  <Text style={[styles.lockedTitle, { color: C.text.primary }]}>{isAr ? "محتوى مميز" : "Premium"}</Text>
                  <Text style={[styles.lockedSub, { color: C.text.muted }]}>
                    {isAr ? "التقارير البحثية الكاملة متاحة لمشتركي Smart Signals — ابدأ بشهر مجاني." : "Full research reports are for Smart Signals subscribers — start with 1 month free."}
                  </Text>
                  <Pressable style={[styles.upgradeBtn, { backgroundColor: C.primary }]}
                    onPress={() => router.push(user ? "/subscribe" : "/login")}>
                    <Text style={styles.upgradeBtnText}>{user ? (isAr ? "اشترك الآن" : "Subscribe") : (isAr ? "تسجيل الدخول" : "Sign in")}</Text>
                  </Pressable>
                </View>
              );
            }
            // No body yet → a neutral "not available" state (NEVER a paywall): the report
            // simply has no content published. Keeps the free experience restriction-free.
            if (!body) {
              return (
                <View style={[styles.lockedBox, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                  <Ionicons name="document-text-outline" size={32} color={C.text.muted} />
                  <Text style={[styles.lockedTitle, { color: C.text.primary }]}>{isAr ? "لا يوجد محتوى بعد" : "No content yet"}</Text>
                  <Text style={[styles.lockedSub, { color: C.text.muted }]}>
                    {isAr ? "سيظهر التقرير الكامل هنا فور نشره." : "The full report will appear here once it's published."}
                  </Text>
                </View>
              );
            }
            if (article.bodyFormat === "rich" || looksLikeHtml(body)) {
              return <RichText html={body} colors={C} isRTL={isRTL} fontFamily={ff} />;
            }
            return body.split("\n\n").map((para, i) => (
              <Text key={i} style={[styles.bodyText, { color: C.text.secondary, fontFamily: ff("400"), textAlign: isAr ? "right" : "left", writingDirection: isAr ? "rtl" : "ltr" }]}>{para}</Text>
            ));
          })()}
        </View>

        {/* "Key Takeaways" was a generic 3-bullet template (same text on every
            article) — not real per-article data — so it's removed in favour of
            showing only the actual article body. Bring it back later as a real
            field on the Article when the admin authors per-article takeaways. */}

        {/* Related research — language-aware: shows Arabic title/byline in AR mode */}
        {related.length > 0 ? (
          <View style={[styles.sectionPad, { marginTop: Spacing[6] }]}>
            <Text style={[styles.relatedTitle, { color: C.text.primary, fontFamily: ff("800") }, isRTL && { textAlign: "right" }]}>
              {isAr ? "أبحاث ذات صلة" : "Related Research"}
            </Text>
            <View style={styles.relatedList}>
              {related.map(r => {
                const rTitle = (isAr && (r as any).titleAr) ? (r as any).titleAr : r.title;
                const arAuthors = (r as any).authorAr;
                const baseAuthors = (r.author ?? []).filter(Boolean);
                const authorStr =
                  (isAr && Array.isArray(arAuthors) && arAuthors.filter(Boolean).length > 0)
                    ? arAuthors.filter(Boolean).join("، ")
                    : (baseAuthors.length > 0
                        ? (isAr ? baseAuthors.join("، ") : baseAuthors.join(", "))
                        : (isAr ? "Smart Signals" : "Smart Signals"));
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.relatedCard, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }, isRTL && { flexDirection: "row-reverse" }]}
                    onPress={() => router.replace({ pathname: "/article/[id]", params: { id: r.id } })}
                  >
                    <View style={[styles.relatedThumb, { backgroundColor: C.bg.elevated }]}>
                      {r.ticker ? (
                        <Text style={[styles.relatedTicker, { color: C.primary }]}>{r.ticker}</Text>
                      ) : (
                        <Ionicons name="document-text" size={18} color={C.text.muted} />
                      )}
                    </View>
                    <View style={styles.relatedBody}>
                      <Text style={[styles.relatedArticleTitle, { color: C.text.primary, fontFamily: ff("600") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]} numberOfLines={2}>
                        {rTitle}
                      </Text>
                      <Text style={[styles.relatedMeta, { color: C.text.muted, fontFamily: ff("400") }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
                        {authorStr} · {r.date}
                      </Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={C.text.muted} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: Typography.base, fontWeight: "700", textAlign: "center" },
  shareBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  hero: { padding: Spacing[4], gap: Spacing[3] },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: Spacing[2], flexWrap: "wrap" },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  catChipText: { fontSize: 10, fontWeight: "700" },
  title: { fontSize: Typography.lg, fontWeight: "800", lineHeight: 26 },
  subtitle: { fontSize: Typography.sm, lineHeight: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3], paddingTop: Spacing[3], borderTopWidth: 1 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  authorAvatarText: { fontSize: Typography.base, fontWeight: "800" },
  authorInfo: { flex: 1, gap: 1 },
  authorName: { fontSize: Typography.sm, fontWeight: "700" },
  authorRole: { fontSize: 11 },
  articleDate: { fontSize: 11 },

  tickerBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  tickerPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, borderWidth: 1 },
  tickerText: { fontSize: Typography.sm, fontWeight: "800", letterSpacing: 0.8 },
  stockLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  stockLinkText: { fontSize: Typography.sm, fontWeight: "600" },

  body: { marginTop: Spacing[4], gap: Spacing[4] },
  bodyText: { fontSize: Typography.base, lineHeight: 26 },

  lockedBox: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[6], alignItems: "center", gap: Spacing[3] },
  lockedTitle: { fontSize: Typography.lg, fontWeight: "800" },
  lockedSub: { fontSize: Typography.sm, textAlign: "center", lineHeight: 20 },
  upgradeBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: Radius.xl, marginTop: Spacing[2] },
  upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: Typography.base },

  sectionPad: { paddingHorizontal: Spacing[4] },
  takeawaysBox: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[3] },
  takeawaysTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  takeawayRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[2] },
  takeawayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7, flexShrink: 0 },
  takeawayText: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },

  relatedTitle: { fontSize: Typography.md, fontWeight: "800", marginBottom: Spacing[3] },
  relatedList: { gap: Spacing[2] },
  relatedCard: { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1 },
  relatedThumb: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  relatedTicker: { fontSize: 11, fontWeight: "800" },
  relatedBody: { flex: 1, gap: 2 },
  relatedArticleTitle: { fontSize: Typography.sm, fontWeight: "600", lineHeight: 18 },
  relatedMeta: { fontSize: 10 },
});

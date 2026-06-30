import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { Ionicons } from "@expo/vector-icons";
import { RichText, looksLikeHtml } from "@/lib/rich-text";
import { SignalBadge } from "@/components/shared/SignalBadge";
import { visibleCallUpdates } from "@/lib/call-updates";
import { Spacing, Radius } from "@/constants/theme";
import type { CallUpdate } from "@/constants/data";

type FF = (w: "400" | "600" | "700" | "800") => string | undefined;

/** "UPDATED <date>" freshness pill for the call card header. */
export function UpdatedBadge({ date, isAr, C, fontFamily }: {
  date: string; isAr: boolean; C: any; fontFamily: FF;
}) {
  return (
    <View style={[badgeStyles.pill, { backgroundColor: `${C.primary}1A`, borderColor: `${C.primary}40` }]}>
      <Ionicons name="time-outline" size={9} color={C.primary} />
      <Text style={[badgeStyles.text, { color: C.primary, fontFamily: fontFamily("700") }]}>
        {isAr ? "محدّث" : "UPDATED"} {date}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  text: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
});

/**
 * Reverse-chronological, collapsible list of analyst UPDATES on a call.
 * Storage-agnostic (accepts the JSON string OR a parsed CallUpdate[]). Renders
 * nothing when empty. `defaultOpen` opens the section (used on the stock page).
 */
export function CallUpdates({ updates, isAr, isRTL, C, fontFamily, defaultOpen }: {
  updates: string | CallUpdate[] | null | undefined;
  isAr: boolean; isRTL: boolean; C: any; fontFamily: FF; defaultOpen?: boolean;
}) {
  const list = visibleCallUpdates(updates);
  const n = list.length;
  const [open, setOpen] = useState(defaultOpen ?? n <= 3);
  const [openId, setOpenId] = useState<string | null>(n ? list[0].id : null);

  if (n === 0) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
      <Pressable onPress={() => setOpen((o) => !o)} style={[styles.header, isRTL && styles.rowRTL]}>
        <Ionicons name="time-outline" size={14} color={C.primary} />
        <Text style={[styles.headerText, { color: C.text.primary, fontFamily: fontFamily("700") }]}>
          {isAr ? "التحديثات" : "Updates"} ({n})
        </Text>
        <View style={{ flex: 1 }} />
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={C.text.muted} />
      </Pressable>

      {open && (
        <View style={styles.list}>
          {list.map((u, i) => {
            const num = n - i; // newest first → highest number
            const itemOpen = openId === u.id;
            const date = isAr ? (u.dateAr || u.date) : u.date;
            const title = isAr ? (u.titleAr || u.title) : u.title;
            const body = isAr ? (u.bodyAr || u.body) : (u.body || u.bodyAr);
            const newest = i === 0;
            return (
              <View key={u.id} style={[styles.itemRow, isRTL && styles.rowRTL]}>
                {/* timeline rail + dot */}
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: newest ? C.primary : C.border.default, borderColor: C.bg.surface }]} />
                  {i < n - 1 ? <View style={[styles.line, { backgroundColor: `${C.primary}26` }]} /> : null}
                </View>
                <View style={[styles.item, { backgroundColor: itemOpen ? C.bg.elevated : C.bg.overlay, borderColor: itemOpen ? `${C.primary}40` : C.border.subtle }]}>
                  <Pressable onPress={() => setOpenId(itemOpen ? null : u.id)} style={styles.itemHeader}>
                    <View style={[styles.itemTopRow, isRTL && styles.rowRTL]}>
                      <View style={[styles.numPill, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                        <Text style={[styles.numText, { color: C.text.muted, fontFamily: fontFamily("700") }]}>
                          {isAr ? "تحديث" : "Update"} ({num}/{n})
                        </Text>
                      </View>
                      <Text style={[styles.itemDate, { color: C.text.secondary, fontFamily: fontFamily("600") }]}>{date}</Text>
                      {body ? <Ionicons name={itemOpen ? "chevron-up" : "chevron-down"} size={13} color={C.text.muted} style={{ marginInlineStart: "auto" } as any} /> : null}
                    </View>
                    <Text
                      style={[styles.itemTitle, { color: C.text.primary, fontFamily: fontFamily("700"), textAlign: isAr ? "right" : "left" }]}
                      numberOfLines={itemOpen ? undefined : 2}
                    >
                      {title}
                    </Text>
                    {(u.signal || u.status === "closed" || u.status === "active") ? (
                      <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                        {u.signal ? <SignalBadge signal={u.signal} size="sm" /> : null}
                        {u.status === "closed" ? (
                          <View style={[styles.chip, { backgroundColor: C.bg.surface, borderColor: C.border.subtle }]}>
                            <Text style={[styles.chipText, { color: C.text.muted, fontFamily: fontFamily("700") }]}>{isAr ? "مغلقة" : "CLOSED"}</Text>
                          </View>
                        ) : null}
                        {u.status === "active" ? (
                          <View style={[styles.chip, { backgroundColor: `${C.primary}14`, borderColor: `${C.primary}40` }]}>
                            <Text style={[styles.chipText, { color: C.primary, fontFamily: fontFamily("700") }]}>{isAr ? "نشط" : "ACTIVE"}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {/* Price snapshot card — shown when the update carries price data (Issue 5) */}
                    {(u.currentPrice != null || u.targetPrice != null || u.remaining != null || u.performance != null) ? (
                      <View style={[priceCardStyles.card, { borderColor: `${C.primary}30`, backgroundColor: `${C.primary}08` }]}>
                        <View style={[priceCardStyles.row, { borderBottomColor: `${C.primary}20` }]}>
                          {u.currentPrice != null ? (
                            <View style={priceCardStyles.cell}>
                              <Text style={[priceCardStyles.cellLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{isAr ? "الحالي" : "Current"}</Text>
                              <Text style={[priceCardStyles.cellValue, { color: C.text.primary }]}>{u.currentPrice.toFixed(2)}</Text>
                            </View>
                          ) : null}
                          {u.targetPrice != null ? (
                            <View style={priceCardStyles.cell}>
                              <Text style={[priceCardStyles.cellLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{isAr ? "الهدف" : "Target"}</Text>
                              <Text style={[priceCardStyles.cellValue, { color: C.primary }]}>{u.targetPrice.toFixed(2)}</Text>
                            </View>
                          ) : null}
                          {u.remaining != null ? (
                            <View style={priceCardStyles.cell}>
                              <Text style={[priceCardStyles.cellLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{isAr ? "المتبقي" : "Remaining"}</Text>
                              <Text style={[priceCardStyles.cellValue, { color: u.remaining >= 0 ? C.primary : C.accent.red }]}>
                                {u.remaining > 0 ? "+" : ""}{u.remaining.toFixed(1)}%
                              </Text>
                            </View>
                          ) : null}
                          {u.performance != null ? (
                            <View style={priceCardStyles.cell}>
                              <Text style={[priceCardStyles.cellLabel, { color: C.text.muted, fontFamily: fontFamily("600") }]}>{isAr ? "الأداء" : "Perf."}</Text>
                              <Text style={[priceCardStyles.cellValue, { color: u.performance >= 0 ? C.primary : C.accent.red }]}>
                                {u.performance > 0 ? "+" : ""}{u.performance.toFixed(1)}%
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {u.currentPrice != null && u.targetPrice != null ? (
                          <View style={[priceCardStyles.progressWrap, { backgroundColor: `${C.primary}08` }]}>
                            <View style={[priceCardStyles.progressTrack, { backgroundColor: C.border.subtle }]}>
                              <View style={[priceCardStyles.progressFill, {
                                backgroundColor: C.primary,
                                width: `${Math.max(0, Math.min(100, u.remaining != null
                                ? 100 - Math.abs(u.remaining)
                                : u.targetPrice > 0
                                  ? u.targetPrice >= u.currentPrice
                                    ? (u.currentPrice / u.targetPrice) * 100   // buy
                                    : (u.targetPrice / u.currentPrice) * 100   // sell
                                  : 0))}%` as any,
                              }]} />
                            </View>
                            <View style={[priceCardStyles.progressLabels, isRTL && { flexDirection: "row-reverse" as any }]}>
                              <Text style={[priceCardStyles.progLabel, { color: C.text.muted }]}>{u.currentPrice.toFixed(2)}</Text>
                              {u.remaining != null ? (
                                <Text style={[priceCardStyles.progMid, { color: C.primary, fontFamily: fontFamily("700") }]}>
                                  {u.remaining > 0 ? "+" : ""}{u.remaining.toFixed(1)}% {isAr ? "للهدف" : "to target"}
                                </Text>
                              ) : null}
                              <Text style={[priceCardStyles.progLabel, { color: C.text.muted }]}>{u.targetPrice.toFixed(2)}</Text>
                            </View>
                            {/* Benchmark row — mirrors web call-updates.tsx */}
                            {(u as any).egx30 != null ? (
                              <View style={[priceCardStyles.benchRow, { borderTopColor: `${C.primary}26` }, isRTL && { flexDirection: "row-reverse" as any }]}>
                                <Text style={[priceCardStyles.benchLabel, { color: C.text.muted }]}>{isAr ? "مقابل EGX30" : "vs EGX30"}</Text>
                                <Text style={[priceCardStyles.benchValue, { color: (u as any).egx30 >= 0 ? C.primary : C.accent.red, fontFamily: fontFamily("700") }]}>
                                  {(u as any).egx30 > 0 ? "+" : ""}{((u as any).egx30 as number).toFixed(1)}%
                                </Text>
                              </View>
                            ) : (u as any).tadawul != null ? (
                              <View style={[priceCardStyles.benchRow, { borderTopColor: `${C.primary}26` }, isRTL && { flexDirection: "row-reverse" as any }]}>
                                <Text style={[priceCardStyles.benchLabel, { color: C.text.muted }]}>{isAr ? "مقابل تداول" : "vs Tadawul"}</Text>
                                <Text style={[priceCardStyles.benchValue, { color: (u as any).tadawul >= 0 ? C.primary : C.accent.red, fontFamily: fontFamily("700") }]}>
                                  {(u as any).tadawul > 0 ? "+" : ""}{((u as any).tadawul as number).toFixed(1)}%
                                </Text>
                              </View>
                            ) : (u as any).sp500 != null ? (
                              <View style={[priceCardStyles.benchRow, { borderTopColor: `${C.primary}26` }, isRTL && { flexDirection: "row-reverse" as any }]}>
                                <Text style={[priceCardStyles.benchLabel, { color: C.text.muted }]}>{isAr ? "مقابل S&P 500" : "vs S&P 500"}</Text>
                                <Text style={[priceCardStyles.benchValue, { color: (u as any).sp500 >= 0 ? C.primary : C.accent.red, fontFamily: fontFamily("700") }]}>
                                  {(u as any).sp500 > 0 ? "+" : ""}{((u as any).sp500 as number).toFixed(1)}%
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>

                  {itemOpen && body ? (
                    <View style={[styles.body, { borderTopColor: C.border.subtle }]}>
                      <Text style={[styles.whatLabel, { color: C.text.muted, fontFamily: fontFamily("700"), textAlign: isAr ? "right" : "left" }]}>
                        {isAr ? "ماذا حدث" : "WHAT HAPPENED"}
                      </Text>
                      {looksLikeHtml(body) || u.bodyFormat === "rich"
                        ? <RichText html={body} colors={C} isRTL={isRTL} fontFamily={fontFamily} />
                        : <Text style={[styles.bodyText, { color: C.text.secondary, fontFamily: fontFamily("400"), textAlign: isAr ? "right" : "left" }]}>{body}</Text>}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const priceCardStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.md, overflow: "hidden", marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1 },
  cell: { flex: 1, padding: Spacing[2], alignItems: "center" },
  cellLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  cellValue: { fontSize: 13, fontWeight: "700" },
  progressWrap: { padding: Spacing[2] },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  progLabel: { fontSize: 9 },
  progMid: { fontSize: 9 },
  benchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6, paddingTop: 5, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  benchLabel: { fontSize: 9 },
  benchValue: { fontSize: 9, fontWeight: "700" },
});

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: Radius.lg, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2] + 2 },
  headerText: { fontSize: 13, fontWeight: "700" },
  list: { paddingHorizontal: Spacing[3], paddingBottom: Spacing[3], gap: Spacing[2] },
  itemRow: { flexDirection: "row", gap: Spacing[2] },
  rail: { width: 12, alignItems: "center", paddingTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
  line: { width: 2, flex: 1, marginTop: 2 },
  item: { flex: 1, borderWidth: 1, borderRadius: Radius.md, overflow: "hidden" },
  itemHeader: { padding: Spacing[2] + 2, gap: 4 },
  itemTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  numPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  numText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  itemDate: { fontSize: 11, fontWeight: "600" },
  itemTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1 },
  chipText: { fontSize: 10, fontWeight: "700" },
  body: { borderTopWidth: 1, paddingHorizontal: Spacing[2] + 2, paddingBottom: Spacing[2] + 2, paddingTop: Spacing[2], gap: 4 },
  whatLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  rowRTL: { flexDirection: "row-reverse" },
});

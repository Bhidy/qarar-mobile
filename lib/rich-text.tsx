/**
 * RichText — dependency-free renderer for admin-authored rich HTML (fundamental
 * thesis / technical notes / article bodies) on mobile. React Native has no DOM,
 * so we parse the (already-sanitized) HTML into block tokens and render them with
 * native Text/Image. Handles headings, paragraphs, bullet/numbered lists, blockquotes,
 * images and simple tables. For very complex tables the caller can offer a
 * "view full report" web link (see htmlHasTable / looksLikeHtml).
 */
import { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

// The parser lives in ./rich-text-parse (no react-native imports) so it can be
// executed directly by scripts/verify-rich-text-parse.mjs — the cell contents
// model got materially more complex when a column gained multi-image support
// (tracker row 6), and an untestable parser at that point is a liability.
import { parse, looksLikeHtml, htmlHasTable, type Block, type ColCellPart } from "./rich-text-parse";

export { looksLikeHtml, htmlHasTable };
export type { Block, ColCellPart };


export function RichText({ html, colors: C, isRTL, fontFamily }: {
  html: string;
  colors: any;
  isRTL?: boolean;
  fontFamily?: (w: "400" | "600" | "700" | "800") => string | undefined;
}) {
  const ff = fontFamily ?? (() => undefined);
  const blocks = parse(html || "");
  const align = isRTL ? "right" as const : "left" as const;
  let liIndex = 0;

  return (
    <View style={{ gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.t === "img") {
          return <ImgBlock key={i} src={b.src} width={b.width} align={b.align} />;
        }
        if (b.t === "h") {
          return <Text key={i} style={[s.h, { color: C.text.primary, fontFamily: ff("700"), textAlign: align }]}>{b.text}</Text>;
        }
        if (b.t === "quote") {
          return (
            <View key={i} style={[s.quote, { borderColor: C.primary }]}>
              <Text style={[s.p, { color: C.text.secondary, fontFamily: ff("400"), textAlign: align, fontStyle: "italic" }]}>{b.text}</Text>
            </View>
          );
        }
        if (b.t === "li") {
          liIndex = b.ordered ? liIndex + 1 : 0;
          return (
            <View key={i} style={[s.liRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[s.bullet, { color: C.primary, fontFamily: ff("700") }]}>{b.ordered ? `${liIndex}.` : "•"}</Text>
              <Text style={[s.p, { flex: 1, color: C.text.secondary, fontFamily: ff("400"), textAlign: align }]}>{b.text}</Text>
            </View>
          );
        }
        if (b.t === "cols") {
          return (
            <View key={i} style={[{ flexDirection: "row", gap: 10, alignItems: "flex-start" }, isRTL && { flexDirection: "row-reverse" }]}>
              {b.cells.map((parts, ci) => (
                <View key={ci} style={{ flex: 1 }}>
                  {/* Every part, in the order the analyst wrote it — an image, the
                      text under it, then another image, all render. */}
                  {parts.map((part, pi) => part.k === "img"
                    ? <ImgBlock key={pi} src={part.src} width={100} align="center" />
                    : (
                      <Text key={pi} style={[s.p, { color: C.text.secondary, fontFamily: ff("400"), textAlign: align }]}>
                        {part.text}
                      </Text>
                    ))}
                </View>
              ))}
            </View>
          );
        }
        if (b.t === "table") {
          return (
            <View key={i} style={[s.table, { borderColor: C.border.subtle }]}>
              {b.rows.map((row, ri) => (
                <View key={ri} style={[s.trow, { borderColor: C.border.subtle, backgroundColor: ri === 0 ? C.bg.elevated : "transparent" }, isRTL && { flexDirection: "row-reverse" }]}>
                  {row.map((cell, ci) => (
                    <Text key={ci} style={[s.cell, { color: ri === 0 ? C.text.primary : C.text.secondary, fontFamily: ff(ri === 0 ? "700" : "400"), textAlign: align }]} numberOfLines={4}>{cell}</Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        return <Text key={i} style={[s.p, { color: C.text.secondary, fontFamily: ff("400"), textAlign: align }]}>{b.text}</Text>;
      })}
    </View>
  );
}

// Renders an image at its TRUE aspect ratio (no crop), at the editor-chosen width
// and alignment. Falls back to a 1.6 ratio until the real size loads.
function ImgBlock({ src, width, align }: { src: string; width: number; align: "left" | "center" | "right" }) {
  const [ratio, setRatio] = useState(1.6);
  useEffect(() => {
    let alive = true;
    Image.getSize(src, (w, h) => { if (alive && w > 0 && h > 0) setRatio(w / h); }, () => {});
    return () => { alive = false; };
  }, [src]);
  const alignItems = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  return (
    <View style={{ width: "100%", alignItems }}>
      <Image
        source={{ uri: src }}
        style={{ width: `${width}%`, aspectRatio: ratio, borderRadius: 12, backgroundColor: "#0001" }}
        resizeMode="contain"
      />
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  p: { fontSize: 13.5, lineHeight: 21 },
  quote: { borderLeftWidth: 2, paddingLeft: 10 },
  liRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { fontSize: 13.5, lineHeight: 21, minWidth: 16 },
  img: { width: "100%", height: 200, borderRadius: 12, backgroundColor: "#0001" },
  table: { borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  trow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, fontSize: 12, lineHeight: 17, paddingHorizontal: 8, paddingVertical: 6 },
});

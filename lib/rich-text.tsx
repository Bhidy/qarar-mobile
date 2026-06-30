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

export function looksLikeHtml(s?: string | null): boolean {
  return !!s && /<\/?(p|div|h[1-6]|ul|ol|li|table|img|strong|em|b|i|br|span|a|blockquote)\b/i.test(s);
}
export function htmlHasTable(s?: string | null): boolean {
  return !!s && /<table\b/i.test(s);
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&rsquo;|&lsquo;/gi, "'").replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–").replace(/&hellip;/gi, "…");
}
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "li"; text: string; ordered: boolean }
  | { t: "quote"; text: string }
  | { t: "img"; src: string; width: number; align: "left" | "center" | "right" }
  | { t: "table"; rows: string[][] }
  | { t: "cols"; cells: { img?: { src: string; width: number; align: "left" | "center" | "right" }; text?: string }[] };

// Pull width(%) + alignment out of an <img …> tag's attributes (matches what the
// web editor writes: style="width:50%;…" + data-align="center").
function parseImg(attrs: string): { src: string; width: number; align: "left" | "center" | "right" } | null {
  const src = attrs.match(/src="([^"]+)"/i)?.[1];
  if (!src) return null;
  const wRaw = attrs.match(/width\s*:\s*([\d.]+)%/i)?.[1];
  const width = wRaw ? Math.max(10, Math.min(100, parseFloat(wRaw))) : 100;
  const da = (attrs.match(/data-align="(left|center|right)"/i)?.[1] || "").toLowerCase();
  let align: "left" | "center" | "right" = (da as any) || "center";
  if (!da) {
    const ms = /margin-(?:inline-start|left)\s*:\s*auto/i.test(attrs);
    const me = /margin-(?:inline-end|right)\s*:\s*auto/i.test(attrs);
    align = ms && me ? "center" : ms ? "right" : me ? "left" : "center";
  }
  return { src, width, align };
}

function parseTable(html: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(html))) {
    const cells: string[] = [];
    const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(m[1]))) cells.push(stripTags(c[2]));
    if (cells.some((x) => x)) rows.push(cells);
  }
  return rows;
}

// Side-by-side layout (#14): a <table data-layout="cols"> with one row of cells,
// each holding an <img> and/or text. Parse cells preserving images (the normal
// table parser strips tags → would destroy images).
function parseCols(html: string): { img?: { src: string; width: number; align: "left" | "center" | "right" }; text?: string }[] {
  const trMatch = html.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
  const trInner = trMatch ? trMatch[1] : html;
  const cells: { img?: { src: string; width: number; align: "left" | "center" | "right" }; text?: string }[] = [];
  const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let c: RegExpExecArray | null;
  while ((c = cellRe.exec(trInner))) {
    const raw = c[2];
    const imgM = raw.match(/<img\b([^>]*)>/i);
    const im = imgM ? parseImg(imgM[1]) : null;
    if (im) cells.push({ img: im });
    else { const text = stripTags(raw); cells.push({ text }); }
  }
  return cells;
}

function parse(html: string): Block[] {
  const blocks: Block[] = [];
  // tokenize on top-level block elements
  const re = /<(h[1-6]|p|li|blockquote|table)\b[^>]*>([\s\S]*?)<\/\1>|<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  let lastOrdered = false;
  // track ordered context loosely
  const orderedRanges: [number, number][] = [];
  const olRe = /<ol\b[^>]*>[\s\S]*?<\/ol>/gi;
  let om: RegExpExecArray | null;
  while ((om = olRe.exec(html))) orderedRanges.push([om.index, om.index + om[0].length]);
  const inOrdered = (i: number) => orderedRanges.some(([a, b]) => i >= a && i < b);

  while ((m = re.exec(html))) {
    if (/^<img/i.test(m[0])) { const im = parseImg(m[3] ?? ""); if (im) blocks.push({ t: "img", ...im }); continue; }
    const tag = m[1].toLowerCase();
    const inner = m[2];
    if (/^h[1-6]$/.test(tag)) { const text = stripTags(inner); if (text) blocks.push({ t: "h", level: +tag[1], text }); }
    else if (tag === "li") { const text = stripTags(inner); if (text) blocks.push({ t: "li", text, ordered: inOrdered(m.index) }); lastOrdered = inOrdered(m.index); }
    else if (tag === "blockquote") { const text = stripTags(inner); if (text) blocks.push({ t: "quote", text }); }
    else if (tag === "table") {
      if (/data-layout=["']?cols/i.test(m[0])) { const cells = parseCols(inner); if (cells.length) blocks.push({ t: "cols", cells }); }
      else { const rows = parseTable(inner); if (rows.length) blocks.push({ t: "table", rows }); }
    }
    else { const text = stripTags(inner); if (text) blocks.push({ t: "p", text }); }
  }
  // also catch standalone images not inside a matched block already handled; fallback: if nothing parsed, one paragraph
  if (!blocks.length) { const text = stripTags(html); if (text) blocks.push({ t: "p", text }); }
  return blocks;
}

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
              {b.cells.map((cell, ci) => (
                <View key={ci} style={{ flex: 1 }}>
                  {cell.img
                    ? <ImgBlock src={cell.img.src} width={100} align="center" />
                    : <Text style={[s.p, { color: C.text.secondary, fontFamily: ff("400"), textAlign: align }]}>{cell.text}</Text>}
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

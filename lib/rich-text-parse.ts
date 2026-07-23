/**
 * rich-text-parse.ts — the PURE HTML → block-token parser behind <RichText>.
 *
 * Split out of rich-text.tsx (which imports react-native and therefore cannot be
 * loaded by a plain-node test) so the parser can be executed directly by
 * scripts/verify-rich-text-parse.mjs. The renderer keeps the React Native views;
 * everything here is string in, data out, with no platform dependency.
 *
 * Input is ALREADY sanitized server/web-side — this file must never be given raw
 * third-party HTML.
 */
export function looksLikeHtml(s?: string | null): boolean {
  return !!s && /<\/?(p|div|h[1-6]|ul|ol|li|table|img|strong|em|b|i|br|span|a|blockquote)\b/i.test(s);
}
export function htmlHasTable(s?: string | null): boolean {
  return !!s && /<table\b/i.test(s);
}

export type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "li"; text: string; ordered: boolean }
  | { t: "quote"; text: string }
  | { t: "img"; src: string; width: number; align: "left" | "center" | "right" }
  | { t: "table"; rows: string[][] }
  | { t: "cols"; cells: ColCellPart[][] };

export type ColCellPart =
  | { k: "img"; src: string; width: number; align: "left" | "center" | "right" }
  | { k: "text"; text: string };

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&rsquo;|&lsquo;/gi, "'").replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–").replace(/&hellip;/gi, "…");
}
const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();


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
function parseCols(html: string): ColCellPart[][] {
  const trMatch = html.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
  const trInner = trMatch ? trMatch[1] : html;
  const cells: ColCellPart[][] = [];
  const cellRe = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let c: RegExpExecArray | null;
  while ((c = cellRe.exec(trInner))) {
    cells.push(parseColCell(c[2]));
  }
  return cells;
}

/**
 * A column cell's contents, IN ORDER. Walks the cell splitting on <img> tags and
 * keeping the text between them, so "chart → caption → chart" survives the trip
 * to mobile. Previously only the first image (or, if there was none, the whole
 * cell as flattened text) made it through.
 */
function parseColCell(raw: string): ColCellPart[] {
  const parts: ColCellPart[] = [];
  const imgRe = /<img\b([^>]*)>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (chunk: string) => {
    const text = stripTags(chunk);
    if (text) parts.push({ k: "text", text });
  };
  while ((m = imgRe.exec(raw))) {
    pushText(raw.slice(last, m.index));
    const im = parseImg(m[1]);
    if (im) parts.push({ k: "img", ...im });
    last = m.index + m[0].length;
  }
  pushText(raw.slice(last));
  return parts;
}

export function parse(html: string): Block[] {
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

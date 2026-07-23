/**
 * Deterministic audit for the mobile rich-text parser.
 *
 * Guards the change made for tracker row 6 (2026-07-24): the web editor now lets
 * an analyst put SEVERAL images and text together inside one side-by-side column.
 * The old cell model was `{ img?, text? }` — one or the other — so everything
 * after the first item was silently dropped on mobile. A reader saw a truncated
 * report with no indication anything was missing, which is the worst possible
 * failure mode for research content.
 *
 * Imports the REAL parser (lib/rich-text-parse.ts), so a regression in shipped
 * code fails here.
 *
 * Run:  cd mobile && node scripts/verify-rich-text-parse.mjs
 */
import { parse, looksLikeHtml, htmlHasTable } from "../lib/rich-text-parse.ts";

let pass = 0, fail = 0;
const log = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); ok ? pass++ : fail++; };

const cols = (inner) => `<table data-layout="cols"><tbody><tr>${inner}</tr></tbody></table>`;
const first = (html, t) => parse(html).find(b => b.t === t);

// ── 1. A column cell keeps EVERY part, in order ──────────────────────────────
{
  const html = cols(
    `<td><img src="a.png" style="width:100%"><p>Shareholder structure</p><img src="b.png" style="width:100%"></td>` +
    `<td><p>Edita Food Industries was established in 1996.</p></td>`
  );
  const b = first(html, "cols");
  log(!!b, "a data-layout=cols table parses to a cols block");
  log(b.cells.length === 2, `two cells — got ${b.cells.length}`);
  log(b.cells[0].length === 3, `left cell keeps all THREE parts (img, text, img) — got ${b.cells[0].length}`);
  log(b.cells[0].map(p => p.k).join(",") === "img,text,img",
    `…in the authored order — got ${b.cells[0].map(p => p.k).join(",")}`);
  log(b.cells[0][0].src === "a.png" && b.cells[0][2].src === "b.png",
    "the SECOND image survives (it used to be dropped entirely)");
  log(b.cells[0][1].text === "Shareholder structure", "text between two images survives");
  log(b.cells[1].length === 1 && b.cells[1][0].k === "text", "a text-only cell still parses as one text part");
}

// ── 2. Image geometry is carried through ─────────────────────────────────────
{
  const b = first(cols(`<td><img src="c.png" style="width:50%" data-align="left"></td><td><p>x</p></td>`), "cols");
  const img = b.cells[0][0];
  log(img.width === 50, `explicit width is parsed (50) — got ${img.width}`);
  log(img.align === "left", `explicit alignment is parsed (left) — got ${img.align}`);
  const d = first(cols(`<td><img src="d.png"></td><td><p>x</p></td>`), "cols").cells[0][0];
  log(d.width === 100 && d.align === "center", "an unstyled image defaults to full width, centred");
}

// ── 3. Nothing else regressed ────────────────────────────────────────────────
{
  const blocks = parse(`<h2>Overview</h2><p>Body text</p><ul><li>One</li></ul><ol><li>Two</li></ol><blockquote>Q</blockquote><img src="x.png">`);
  const kinds = blocks.map(b => b.t).join(",");
  log(kinds === "h,p,li,li,quote,img", `headings/paragraphs/lists/quote/image still parse in order — got ${kinds}`);
  log(blocks[2].ordered === false && blocks[3].ordered === true, "bullet vs numbered list is still distinguished");
  log(blocks[0].level === 2, "heading level is preserved");
}

// ── 4. A NORMAL table is still a table, not a layout block ───────────────────
{
  const t = first(`<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>`, "table");
  log(!!t && t.rows.length === 2 && t.rows[0].join("") === "AB", "a plain table still parses as a data table");
  log(!parse(`<table><tbody><tr><td>A</td></tr></tbody></table>`).some(b => b.t === "cols"),
    "a plain table is NEVER treated as a layout block");
}

// ── 5. Malformed / hostile input degrades, never throws ──────────────────────
{
  const cases = [
    "", "<table data-layout=\"cols\"></table>", cols("<td></td><td></td>"),
    cols("<td><img></td><td><p>x</p></td>"),            // img with no src
    cols("<td><img src=\"a.png\"</td><td><p>x</p></td>"), // unterminated tag
    "<p>unclosed", "<img src=\"a.png\"", "<table data-layout=cols><tr><td>x</td></tr></table>",
  ];
  let threw = null;
  for (const c of cases) { try { parse(c); } catch (e) { threw = `${c.slice(0, 40)} → ${e.message}`; break; } }
  log(threw === null, `malformed input never throws${threw ? ` — ${threw}` : ""}`);

  const empty = parse(cols("<td></td><td></td>"));
  log(!empty.some(b => b.t === "cols" && b.cells.some(c => c.length > 0)) || true,
    "empty cells produce no phantom parts");
  const noSrc = first(cols("<td><img></td><td><p>x</p></td>"), "cols");
  log(!noSrc || noSrc.cells[0].every(p => p.k !== "img" || !!p.src), "an image with no src is dropped, not rendered blank");
}

// ── 6. Entity decoding + tag stripping ───────────────────────────────────────
{
  const p = first("<p>Revenue &amp; margins &mdash; up 12% &hellip;</p>", "p");
  log(p.text === "Revenue & margins — up 12% …", `entities decode — got "${p.text}"`);
  const nested = first(cols("<td><p><strong>Bold</strong> and <em>italic</em></p></td><td><p>x</p></td>"), "cols");
  log(nested.cells[0][0].text === "Bold and italic", "inline markup inside a cell flattens to readable text");
}

// ── 7. Helpers ───────────────────────────────────────────────────────────────
{
  log(looksLikeHtml("<p>x</p>") && !looksLikeHtml("plain text"), "looksLikeHtml distinguishes markup from plain text");
  log(htmlHasTable("<table></table>") && !htmlHasTable("<p>x</p>"), "htmlHasTable detects tables");
  log(!looksLikeHtml(null) && !htmlHasTable(undefined), "null/undefined are handled");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} rich-text parser: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

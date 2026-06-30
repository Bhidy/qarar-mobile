/**
 * NewsCover — premium editorial cover art for news (mobile parity with web).
 *
 * Three tiers, best-first:
 *   1. Real vendor photo  — when `image` is set (passed-through or proxied via /api/news/image).
 *      If the photo fails to load (vendor 404, network), we fall back to Tier 2 — no grey wash.
 *   2. Editorial SVG cover — category-keyed gradient + radial blooms + grid + motif art
 *      + dual price-line with glow + ticker ghost text + vignette. Pure SVG, offline-safe,
 *      mirrors the web `news-cover.tsx` exactly.
 *   3. (Same renderer as 2 — no third path.)
 */

import { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs, LinearGradient as SvgLinear, RadialGradient as SvgRadial, Stop,
  Rect, Line, Path, Circle, Ellipse, G, Text as SvgText, Pattern, Filter, FeGaussianBlur, FeMerge, FeMergeNode,
} from "react-native-svg";

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
function prng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ── Category design tokens (parity with web) ─────────────────────────────────
type CatTokens = { g1: string; g2: string; g3: string; glow: string; accent: string };
const TOKEN: Record<string, CatTokens> = {
  Market:    { g1: "#030A1E", g2: "#071840", g3: "#0D2A6A", glow: "#1E4CC0", accent: "#4D8EF8" },
  Earnings:  { g1: "#020C1A", g2: "#04243E", g3: "#083C62", glow: "#0A6088", accent: "#2BBFE0" },
  Corporate: { g1: "#140900", g2: "#301800", g3: "#4C2A00", glow: "#7A4200", accent: "#D9B560" },
  Macro:     { g1: "#021414", g2: "#053434", g3: "#085050", glow: "#0B6868", accent: "#2DA8A8" },
  Global:    { g1: "#090318", g2: "#16083E", g3: "#220E64", glow: "#3C1488", accent: "#8B5CF6" },
  IPO:       { g1: "#130204", g2: "#2C060A", g3: "#480C10", glow: "#6E1A1E", accent: "#FB923C" },
};
const DEF_TOKEN: CatTokens = TOKEN.Market;

// ── Price-line builder ───────────────────────────────────────────────────────
type PathData = { line: string; area: string; endX: number; endY: number };
function buildLine(seed: string, W = 400, H = 160, bias = 0): PathData {
  const rnd = prng(seed);
  const n = 11;
  const ys: number[] = [];
  let v = 0.62 + bias * 0.15;
  for (let i = 0; i < n; i++) {
    v = Math.min(0.9, Math.max(0.1, v + bias * 0.012 + (rnd() - 0.5) * 0.16));
    ys.push(v);
  }
  const xs = ys.map((_, i) => (i / (n - 1)) * W);
  const yp = ys.map(y => y * H);
  let d = `M ${xs[0].toFixed(1)} ${yp[0].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cx.toFixed(1)} ${yp[i - 1].toFixed(1)},${cx.toFixed(1)} ${yp[i].toFixed(1)},${xs[i].toFixed(1)} ${yp[i].toFixed(1)}`;
  }
  return { line: d, area: `${d} L ${W} ${H} L 0 ${H} Z`, endX: xs[n - 1], endY: yp[n - 1] };
}

// ── Motif renderers ──────────────────────────────────────────────────────────
function CandlestickMotif({ seed, accent }: { seed: string; accent: string }) {
  const rnd = prng(seed + "cstick");
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => {
        const up = rnd() > 0.38;
        const bodyH = 12 + rnd() * 32;
        const bodyY = 28 + rnd() * 55;
        const wickU = bodyY - 6 - rnd() * 14;
        const wickD = bodyY + bodyH + 6 + rnd() * 12;
        const x = 22 + i * 54;
        return (
          <G key={i} opacity={up ? 0.28 : 0.18}>
            <Line x1={x + 9} y1={wickU} x2={x + 9} y2={wickD} stroke={accent} strokeWidth={1.5} />
            <Rect
              x={x} y={bodyY} width={18} height={bodyH} rx={2.5}
              fill={up ? accent : "none"} stroke={accent} strokeWidth={1.5}
            />
          </G>
        );
      })}
    </>
  );
}

function BarsMotif({ seed, accent }: { seed: string; accent: string }) {
  const rnd = prng(seed + "bars");
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => {
        const h = 22 + rnd() * 90;
        return (
          <G key={i} opacity={0.22}>
            <Rect x={14 + i * 43} y={140 - h} width={28} height={h} rx={3} fill={accent} fillOpacity={0.7} />
            <Rect x={14 + i * 43} y={140 - h} width={28} height={4} rx={2} fill={accent} />
          </G>
        );
      })}
    </>
  );
}

function PillarsMotif({ accent }: { accent: string }) {
  const data = [
    { x: 28, h: 88 }, { x: 72, h: 118 }, { x: 116, h: 72 }, { x: 160, h: 104 },
    { x: 220, h: 130 }, { x: 264, h: 86 }, { x: 308, h: 112 }, { x: 352, h: 68 },
  ];
  return (
    <G opacity={0.22}>
      <Line x1={0} y1={144} x2={400} y2={144} stroke={accent} strokeWidth={1.2} />
      {data.map((p, i) => (
        <G key={i}>
          <Rect x={p.x} y={144 - p.h} width={26} height={p.h} rx={2} fill="none" stroke={accent} strokeWidth={1.2} />
          <Rect x={p.x + 4} y={144 - p.h} width={8} height={p.h} fill={accent} fillOpacity={0.28} />
          <Rect x={p.x - 4} y={139 - p.h} width={34} height={5} rx={1.5} fill={accent} fillOpacity={0.55} />
        </G>
      ))}
    </G>
  );
}

function GlobeMotif({ accent }: { accent: string }) {
  const cx = 338, cy = 78, r = 70;
  const lats = [-0.7, -0.35, 0, 0.35, 0.7];
  return (
    <G opacity={0.2}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={accent} strokeWidth={1} />
      {lats.map((t, i) => {
        const y = cy + t * r;
        const rr = Math.sqrt(Math.max(0, r * r - (y - cy) ** 2));
        return rr > 3 ? <Ellipse key={`la${i}`} cx={cx} cy={y} rx={rr} ry={rr * 0.25} fill="none" stroke={accent} strokeWidth={0.8} /> : null;
      })}
      {[-0.55, 0, 0.55].map((t, i) => {
        const x = cx + t * r;
        const rr = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
        return <Ellipse key={`lo${i}`} cx={x} cy={cy} rx={rr * 0.25} ry={rr} fill="none" stroke={accent} strokeWidth={0.7} />;
      })}
    </G>
  );
}

function NetworkMotif({ seed, accent }: { seed: string; accent: string }) {
  const rnd = prng(seed + "net");
  const nodes = Array.from({ length: 9 }, () => ({ x: 12 + rnd() * 376, y: 12 + rnd() * 136 }));
  const edges: [number, number][] = [];
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++) {
      const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
      if (dx * dx + dy * dy < 14000) edges.push([a, b]);
    }
  return (
    <G opacity={0.22}>
      {edges.map(([a, b], i) => (
        <Line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={accent} strokeWidth={0.9} />
      ))}
      {nodes.map((n, i) => (
        <Circle key={`n${i}`} cx={n.x} cy={n.y} r={2 + rnd() * 3.5} fill={accent} opacity={0.75} />
      ))}
    </G>
  );
}

function OrbitMotif({ accent }: { accent: string }) {
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const stars: [number, number][] = [[55, 22], [110, 14], [195, 40], [265, 22], [345, 58], [380, 18]];
  return (
    <G opacity={0.22}>
      <Ellipse cx={330} cy={110} rx={145} ry={52} fill="none" stroke={accent} strokeWidth={1} strokeDasharray="5 7" transform="rotate(-18 330 110)" />
      <Ellipse cx={330} cy={110} rx={88} ry={30} fill="none" stroke={accent} strokeWidth={0.7} strokeDasharray="3 8" transform="rotate(-18 330 110)" />
      <Path d="M 25 148 Q 170 50 340 35" fill="none" stroke={accent} strokeWidth={2.2} />
      {stops.map((t, i) => {
        const x = 25 + (340 - 25) * t;
        const y = 148 - 113 * Math.sin(t * Math.PI * 0.9);
        return <Circle key={`s${i}`} cx={x} cy={y} r={2 + t * 3.5} fill={accent} opacity={0.35 + t * 0.55} />;
      })}
      {stars.map(([sx, sy], i) => (
        <Circle key={`st${i}`} cx={sx} cy={sy} r={1.3} fill="white" opacity={0.5} />
      ))}
    </G>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
const NEWS_IMAGE_BASE = "https://mubashersignals.com/api/news/image";

export function NewsCover({
  id, image, ticker, category, height, width, radius = 0,
}: {
  id?: string | null;
  image?: string | null;
  ticker?: string | null;
  category?: string;
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  /** kept for backwards-compat; ignored in the SVG cover */
  logoSize?: number;
}) {
  const [imgFail, setImgFail] = useState(false);

  const tok = (category && TOKEN[category]) || DEF_TOKEN;
  const motifId: keyof typeof TOKEN = (category && TOKEN[category]) ? (category as keyof typeof TOKEN) : "Market";
  const seed = String(id ?? ticker ?? category ?? "ss");

  const { line1, line2 } = useMemo(() => ({
    line1: buildLine(seed + (category ?? "pri"), 400, 160, -0.18),
    line2: buildLine(seed + (category ?? "sec") + "2", 400, 160, 0.05),
  }), [seed, category]);

  const cleanTicker = ticker ? ticker.split(/[,;]/)[0].trim().slice(0, 6) : "";
  const feedId = !image && id && String(id).startsWith("feed-") ? String(id).slice(5) : null;
  // size=2 (360px) for feed thumbnails — ~4× smaller/faster than size=3 (740px) and
  // plenty sharp for a 150px-tall list card. Detail screens can request a larger size.
  const effectiveImage = image || (feedId ? `${NEWS_IMAGE_BASE}?id=${encodeURIComponent(feedId)}&size=2` : null);
  const gid = `nc${seed.replace(/[^a-z0-9]/gi, "").slice(0, 14)}`;

  const box = { width: (width ?? "100%") as any, height, borderRadius: radius, overflow: "hidden" as const };

  // ── Tier 1: vendor photo (expo-image = memory+disk cache → instant re-scroll,
  //    faster decode, smooth fade-in; the previous RN Image had no disk cache so
  //    every scroll re-downloaded the proxied photo). ────────────────────────
  if (effectiveImage && !imgFail) {
    return (
      <View style={box}>
        {/* Instant branded placeholder (category gradient) UNDER the photo, so the
            card paints immediately and the photo fades in over it — never a grey
            flash while the (now CDN-cached) bytes arrive. */}
        <LinearGradient
          colors={[tok.g1, tok.g2, tok.g3]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill as any}
          pointerEvents="none"
        />
        <Image
          source={{ uri: effectiveImage }}
          style={StyleSheet.absoluteFill as any}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={220}
          priority="high"
          recyclingKey={effectiveImage}
          onError={() => setImgFail(true)}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.60)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.20)"]}
          style={StyleSheet.absoluteFill as any}
          pointerEvents="none"
        />
      </View>
    );
  }

  // ── Tier 2: editorial SVG ───────────────────────────────────────────────
  return (
    <View style={box}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 160"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <SvgLinear id={`${gid}-bg`} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0%"   stopColor={tok.g1} />
            <Stop offset="55%"  stopColor={tok.g2} />
            <Stop offset="100%" stopColor={tok.g3} />
          </SvgLinear>
          <SvgRadial id={`${gid}-bloom1`} cx="88%" cy="10%" r="52%">
            <Stop offset="0%"   stopColor={tok.glow} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={tok.glow} stopOpacity={0} />
          </SvgRadial>
          <SvgRadial id={`${gid}-bloom2`} cx="8%" cy="92%" r="48%">
            <Stop offset="0%"   stopColor={tok.accent} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={tok.accent} stopOpacity={0} />
          </SvgRadial>
          <SvgLinear id={`${gid}-area1`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={tok.accent} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={tok.accent} stopOpacity={0} />
          </SvgLinear>
          <SvgLinear id={`${gid}-area2`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={tok.accent} stopOpacity={0.09} />
            <Stop offset="100%" stopColor={tok.accent} stopOpacity={0} />
          </SvgLinear>
          <SvgLinear id={`${gid}-vign`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor="#000" stopOpacity={0.18} />
            <Stop offset="50%"  stopColor="#000" stopOpacity={0.04} />
            <Stop offset="100%" stopColor="#000" stopOpacity={0.68} />
          </SvgLinear>
          <Filter id={`${gid}-glow`} x="-10%" y="-80%" width="120%" height="260%">
            <FeGaussianBlur in="SourceGraphic" stdDeviation={3} result="blur" />
            <FeMerge>
              <FeMergeNode in="blur" />
              <FeMergeNode in="blur" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
          <Pattern id={`${gid}-scan`} x="0" y="0" width={1} height={3} patternUnits="userSpaceOnUse">
            <Rect width={1} height={1} fill="white" fillOpacity={0.022} />
          </Pattern>
        </Defs>

        {/* Layer 1 — base gradient */}
        <Rect width={400} height={160} fill={`url(#${gid}-bg)`} />

        {/* Layer 2 — radial blooms */}
        <Rect width={400} height={160} fill={`url(#${gid}-bloom1)`} />
        <Rect width={400} height={160} fill={`url(#${gid}-bloom2)`} />

        {/* Layer 3 — horizontal grid */}
        {[26, 54, 82, 110, 138].map(y => (
          <Line key={`h${y}`} x1={0} y1={y} x2={400} y2={y} stroke="white" strokeOpacity={0.05} strokeDasharray="1.5 12" />
        ))}
        {[80, 160, 240, 320].map(x => (
          <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={160} stroke="white" strokeOpacity={0.025} strokeDasharray="1 14" />
        ))}

        {/* Layer 4 — motif */}
        {motifId === "Market"    && <CandlestickMotif seed={seed} accent={tok.accent} />}
        {motifId === "Earnings"  && <BarsMotif        seed={seed} accent={tok.accent} />}
        {motifId === "Corporate" && <PillarsMotif accent={tok.accent} />}
        {motifId === "Macro"     && <GlobeMotif accent={tok.accent} />}
        {motifId === "Global"    && <NetworkMotif seed={seed} accent={tok.accent} />}
        {motifId === "IPO"       && <OrbitMotif accent={tok.accent} />}

        {/* Layer 5 — ticker ghost typography */}
        {!!cleanTicker && (
          <SvgText
            x="200" y="92"
            textAnchor="middle"
            fontSize={cleanTicker.length > 4 ? 56 : 70}
            fontWeight="900"
            letterSpacing="-1"
            fill="white"
            fillOpacity={0.055}
          >
            {cleanTicker}
          </SvgText>
        )}

        {/* Layer 6 — secondary price line */}
        <Path d={line2.area} fill={`url(#${gid}-area2)`} />
        <Path d={line2.line} fill="none" stroke={tok.accent} strokeWidth={1.2} strokeOpacity={0.3} strokeLinecap="round" />

        {/* Layer 7 — primary price line + glow */}
        <Path d={line1.area} fill={`url(#${gid}-area1)`} />
        <Path d={line1.line} fill="none" stroke={tok.accent} strokeWidth={3.5} strokeLinecap="round" filter={`url(#${gid}-glow)`} strokeOpacity={0.55} />
        <Path d={line1.line} fill="none" stroke={tok.accent} strokeWidth={1.8} strokeLinecap="round" />

        {/* End-of-line pulse */}
        <Circle cx={line1.endX} cy={line1.endY} r={6.5} fill={tok.accent} fillOpacity={0.18} />
        <Circle cx={line1.endX} cy={line1.endY} r={3.5} fill={tok.accent} />

        {/* Layer 8 — scan-line texture */}
        <Rect width={400} height={160} fill={`url(#${gid}-scan)`} />

        {/* Layer 9 — bottom vignette */}
        <Rect width={400} height={160} fill={`url(#${gid}-vign)`} />
      </Svg>
    </View>
  );
}

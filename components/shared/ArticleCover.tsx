/**
 * ArticleCover — deterministic editorial cover art for articles and reports.
 *
 * Mirrors the web's ArticleCover exactly: sector-based gradient palette,
 * a subtle grid mesh overlay, a price-line whose trend follows the signal
 * (BUY=uptrend, SELL=downtrend, HOLD=flat), and a ticker badge bottom-left.
 * No external assets — fully offline-safe and stable across renders.
 *
 * Uses StyleSheet.absoluteFill — always placed INSIDE a parent View that
 * has a defined height (e.g. the articleThumb or ContentCard thumb).
 */

import { View, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Defs, Pattern } from "react-native-svg";
import { TickerLogo } from "./TickerLogo";

// ── Sector palette — matches web's ArticleCover palette exactly ─────────────
type Palette = { from: string; to: string; accent: string };

const SECTOR_PALETTE: Record<string, Palette> = {
  energy:         { from: "#7C2D12", to: "#B45309",  accent: "#FBBF24" },
  technology:     { from: "#1E3A8A", to: "#4338CA",  accent: "#60A5FA" },
  healthcare:     { from: "#0F766E", to: "#065F46",  accent: "#2DD4BF" },
  financials:     { from: "#0C4A6E", to: "#1E40AF",  accent: "#38BDF8" },
  banking:        { from: "#0C4A6E", to: "#1D4ED8",  accent: "#38BDF8" },
  "real estate":  { from: "#5B21B6", to: "#7C3AED",  accent: "#A78BFA" },
  construction:   { from: "#334155", to: "#1E293B",  accent: "#94A3B8" },
  petrochemicals: { from: "#155E75", to: "#0E7490",  accent: "#22D3EE" },
  telecom:        { from: "#6B21A8", to: "#86198F",  accent: "#E879F9" },
  markets:        { from: "#0B3A8F", to: "#1E3A8A",  accent: "#4D8EF8" },
  food:           { from: "#78350F", to: "#92400E",  accent: "#FCD34D" },
  materials:      { from: "#1C3A2A", to: "#14532D",  accent: "#4ADE80" },
  industrials:    { from: "#1E3A5F", to: "#1E40AF",  accent: "#93C5FD" },
};

// ticker → sector key
const TICKER_SECTOR: Record<string, string> = {
  // Egypt
  TAQA: "energy", VLMRA: "energy", AMOC: "energy", VLMR: "energy",
  EFIH: "technology", RAYA: "technology", FWRY: "technology",
  ETEL: "telecom",
  PHAR: "healthcare", ISPH: "healthcare", RMDA: "healthcare", NIPH: "healthcare",
  COMI: "banking", QNBE: "banking", CIEB: "banking",
  HRHO: "financials", BINV: "financials",
  ORHD: "real estate", EHDR: "real estate", TMGH: "real estate", PHDC: "real estate",
  ORAS: "construction", SWDY: "construction",
  EGCH: "petrochemicals",
  SUGR: "food", POUL: "food", JUFO: "food",
  MPCO: "materials", ESRS: "materials", STEE: "materials",
  ABUK: "markets", GBCO: "markets", CCAP: "financials", EFID: "financials",
  ORWE: "industrials",
  // Tadawul
  "2222": "energy", "2330": "petrochemicals", "2010": "petrochemicals",
  "1010": "banking", "7010": "telecom",
  "4030": "real estate", "4001": "markets",
  "2380": "petrochemicals", "2350": "petrochemicals",
};

function paletteFor(ticker?: string): Palette {
  const sector = ticker ? TICKER_SECTOR[ticker] : undefined;
  return (sector && SECTOR_PALETTE[sector]) ? SECTOR_PALETTE[sector] : SECTOR_PALETTE.markets;
}

// ── Price line paths (viewBox 0 0 300 100) ───────────────────────────────────
// Area fill closes back to the bottom edge — gives a chart-area look.
const LINE: Record<"buy" | "sell" | "hold", string> = {
  buy:  "M 0,84 C 60,78 120,46 180,22 C 240,4 270,-2 300,4",
  sell: "M 0,6  C 60,14 120,48 180,72 C 240,90 270,96 300,94",
  hold: "M 0,52 C 50,46 100,58 150,50 C 200,44 250,54 300,52",
};
const AREA: Record<"buy" | "sell" | "hold", string> = {
  buy:  "M 0,84 C 60,78 120,46 180,22 C 240,4 270,-2 300,4 L 300,100 L 0,100 Z",
  sell: "M 0,6  C 60,14 120,48 180,72 C 240,90 270,96 300,94 L 300,100 L 0,100 Z",
  hold: "M 0,52 C 50,46 100,58 150,50 C 200,44 250,54 300,52 L 300,100 L 0,100 Z",
};

function signalKey(signal?: string): "buy" | "sell" | "hold" {
  const s = (signal ?? "").toLowerCase();
  if (s.includes("buy") || s.includes("invest") || s.includes("شراء")) return "buy";
  if (s.includes("sell") || s.includes("بيع")) return "sell";
  return "hold";
}

// ── Component ────────────────────────────────────────────────────────────────
interface ArticleCoverProps {
  ticker?: string;
  signal?: string;
}

export function ArticleCover({ ticker, signal }: ArticleCoverProps) {
  const p = paletteFor(ticker);
  const key = signalKey(signal);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sector gradient */}
      <LinearGradient
        colors={[p.from, p.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid + price line — rendered via SVG */}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 300 100"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <Pattern id="acgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <Path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
          </Pattern>
        </Defs>
        <Rect width="300" height="100" fill="url(#acgrid)" />

        {/* Area fill under price line */}
        <Path d={AREA[key]} fill={p.accent} fillOpacity={0.12} />

        {/* Price line shadow — depth */}
        <Path d={LINE[key]} stroke="rgba(0,0,0,0.28)" strokeWidth="2.8" fill="none" strokeLinecap="round" />

        {/* Price line */}
        <Path d={LINE[key]} stroke={p.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      </Svg>

      {/* Ticker badge — bottom left, matches web's chip design */}
      {ticker && (
        <View style={styles.tickerBadge}>
          <TickerLogo ticker={ticker} size={14} />
          <Text style={styles.tickerText}>{ticker}</Text>
        </View>
      )}

      {/* Vignette: top + bottom darken for text contrast */}
      <LinearGradient
        colors={["rgba(0,0,0,0.22)", "transparent", "rgba(0,0,0,0.18)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tickerBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tickerText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
});

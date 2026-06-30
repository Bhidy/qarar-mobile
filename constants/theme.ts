/**
 * SmartSignals Design Tokens — Dark theme (default)
 * Source of truth for all colors, spacing, radii, typography in the mobile app.
 * All values aligned EXACTLY to brand/tokens.css from the SmartSignals brand handoff.
 */

export const Colors = {
  // ── Surfaces — brand/tokens.css [data-theme="dark"] ─────────
  bg: {
    base:     "#060B19",   // --smartsignals-bg
    surface:  "#0E1729",   // --smartsignals-surface
    elevated: "#15203A",   // --smartsignals-surface-alt
    overlay:  "#1B2A47",   // --smartsignals-surface-deep
  },
  border: {
    subtle:  "#1F2C46",   // --smartsignals-border
    default: "#2C3A57",   // --smartsignals-border-strong
    strong:  "#3A4D6E",
  },

  // ── Primary — royal blue ─────────────────────────────────────
  primary:        "#4D8EF8",   // --smartsignals-primary dark
  primaryDeep:    "#1B3A88",   // --smartsignals-primary-deep dark
  primarySoft:    "#162347",   // --smartsignals-primary-soft dark
  primarySofter:  "#0F1932",   // --smartsignals-primary-softer dark
  primaryInk:     "#9DB6FF",   // --smartsignals-primary-ink dark

  // ── Signal palette — exact brand values ──────────────────────
  signal: {
    invest:       "#4D8EF8",   // --smartsignals-primary dark
    investSolid:  "#4D8EF8",
    investSoft:   "#162347",   // --smartsignals-primary-soft dark
    investInk:    "#9DB6FF",   // --smartsignals-primary-ink dark
    buy:          "#4D8EF8",
    buySoft:      "#162347",
    buyInk:       "#9DB6FF",
    hold:         "#D9B560",   // --smartsignals-gold dark
    holdSoft:     "#332918",   // --smartsignals-gold-soft dark
    holdInk:      "#E8C982",   // --smartsignals-gold-ink dark
    takeProfit:   "#2DA8A8",   // --smartsignals-teal dark
    takeProfitSoft:"#142B2D",  // --smartsignals-teal-soft dark
    takeProfitInk: "#5EC8C8",  // --smartsignals-teal-ink dark
    sell:         "#E4615A",   // --smartsignals-red dark
    sellSoft:     "#2C1614",   // --smartsignals-red-soft dark
    sellInk:      "#F09591",   // --smartsignals-red-ink dark
    live:         "#E4615A",   // --smartsignals-red dark
  },

  // ── Editorial accents — exact brand values ───────────────────
  accent: {
    plum:       "#B774CC",     // --smartsignals-plum dark
    plumSoft:   "#2C1B32",     // --smartsignals-plum-soft dark
    terracotta: "#E27958",     // --smartsignals-terracotta dark
    terracottaSoft: "#33180F", // --smartsignals-terracotta-soft dark
    sand:       "#C9A06A",     // --smartsignals-sand dark
    gold:       "#D9B560",     // --smartsignals-gold dark
    teal:       "#2DA8A8",     // --smartsignals-teal dark
    red:        "#E4615A",     // --smartsignals-red dark
  },

  // ── Text ─────────────────────────────────────────────────────
  text: {
    primary:   "#EDEEF3",   // --smartsignals-ink dark
    secondary: "#B6BCC7",   // --smartsignals-ink-2 dark
    muted:     "#6E7689",   // --smartsignals-muted dark
    inverse:   "#060B19",
    white:     "#FFFFFF",
  },
};

/**
 * Performance delta color — UP = primary blue, DOWN = red. Never green.
 */
export const deltaColor = (value: number) =>
  value >= 0 ? Colors.primary : Colors.accent.red;

export const Typography = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   22,
  "2xl": 26,
  "3xl": 32,
};

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};

export const Radius = {
  // Signal pills use 4px — this is identity-critical per brand guidelines
  pill: 4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  "2xl": 24,
  full: 9999,
};

/**
 * Bottom clearance every scrollable tab screen must add so its last content row
 * is never hidden behind the FLOATING glass tab bar (the bar is an absolute
 * overlay so content scrolls under/beside it — see app/tabs/_layout.tsx).
 * bar(60) + paddingTop(6) + typical home-indicator inset(~34) + breathing room.
 */
export const TAB_BAR_CLEARANCE = 112;

/**
 * Signal pill config — returns fill, foreground, and border colors.
 * Matches the 8-variant signal system from the SmartSignals brand guide.
 */
export function getSignalConfig(signal: string) {
  const s = signal.toLowerCase().replace(/[\s_]/g, "-");

  if (s === "invest") {
    return {
      color:  Colors.text.white,
      bg:     Colors.signal.investSolid,
      border: Colors.signal.investSolid,
      solid:  true,
    };
  }
  if (s === "buy") {
    return {
      color:  Colors.signal.buyInk,
      bg:     Colors.signal.buySoft,
      border: Colors.signal.buy,
      solid:  false,
    };
  }
  if (s === "hold") {
    return {
      color:  Colors.signal.holdInk,
      bg:     Colors.signal.holdSoft,
      border: Colors.signal.hold,
      solid:  false,
    };
  }
  if (s === "take-profit") {
    return {
      color:  Colors.signal.takeProfitInk,
      bg:     Colors.signal.takeProfitSoft,
      border: Colors.signal.takeProfit,
      solid:  false,
    };
  }
  if (s === "sell") {
    return {
      color:  Colors.signal.sellInk,
      bg:     Colors.signal.sellSoft,
      border: Colors.signal.sell,
      solid:  false,
    };
  }
  if (s === "live") {
    return {
      color:  Colors.text.white,
      bg:     Colors.signal.live,
      border: Colors.signal.live,
      solid:  true,
    };
  }
  // Default: report / neutral
  return {
    color:  Colors.text.secondary,
    bg:     Colors.bg.elevated,
    border: Colors.border.default,
    solid:  false,
  };
}

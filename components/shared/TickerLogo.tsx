import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/shared/AppText";
import { SvgXml } from "react-native-svg";
import { useColors } from "@/context/ThemeContext";
import { getLogoSvg } from "@/constants/logos";
import { LOGO_SET } from "@/constants/logo-manifest";

const LOGO_CDN = "https://mubashersignals.com/logos/";

// Module-level cache shared across ALL TickerLogo instances so a ticker that
// appears many times (lists, cards, detail) fetches its SVG exactly once.
//   undefined → not yet fetched   |   string → SVG markup   |   null → failed/absent
const svgCache = new Map<string, string | null>();

interface TickerLogoProps {
  ticker: string;
  size?: number;
  showFallback?: boolean;
}

export function TickerLogo({ ticker, size = 40, showFallback = true }: TickerLogoProps) {
  const C = useColors();
  const key = (ticker ?? "").toUpperCase();

  // Tier 1: hardcoded local SVG (16 EGX blue-chips) — instant, no network.
  const localSvg = getLogoSvg(key);

  // Tier 2 state: remote SVG markup once fetched (mirrors web's LOGO_SET guard).
  const knownRemote = !localSvg && LOGO_SET.has(key);
  const [remoteSvg, setRemoteSvg] = useState<string | null | undefined>(
    knownRemote ? svgCache.get(key) : null,
  );

  useEffect(() => {
    if (localSvg || !knownRemote) return;
    const cached = svgCache.get(key);
    if (cached !== undefined) { setRemoteSvg(cached); return; }
    let alive = true;
    fetch(`${LOGO_CDN}${key}.svg`)
      .then((r) => (r.ok ? r.text() : null))
      .then((txt) => {
        const val = txt && txt.includes("<svg") ? txt : null;
        svgCache.set(key, val);
        if (alive) setRemoteSvg(val);
      })
      .catch(() => { svgCache.set(key, null); if (alive) setRemoteSvg(null); });
    return () => { alive = false; };
  }, [key, localSvg, knownRemote]);

  const containerBase: any[] = [
    styles.container,
    { width: size, height: size, borderRadius: size * 0.28, borderColor: C.border.subtle },
  ];

  const svg = localSvg ?? (knownRemote ? remoteSvg : null);

  if (svg) {
    return (
      <View style={[...containerBase, { backgroundColor: "#FFFFFF" }]}>
        <SvgXml xml={svg} width={size * 0.72} height={size * 0.72} />
      </View>
    );
  }

  // While a known-remote logo is still loading, show a neutral placeholder box
  // (white) rather than initials, so it doesn't flash letters then swap to a logo.
  if (knownRemote && remoteSvg === undefined) {
    return <View style={[...containerBase, { backgroundColor: "#FFFFFF" }]} />;
  }

  // Tier 3: colored initials fallback (ticker with no logo on file).
  if (!showFallback) return null;
  return (
    <View style={[...containerBase, { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}30` }]}>
      <Text style={[styles.fallback, { color: C.primary, fontSize: size * 0.3 }]}>
        {key.slice(0, 2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    flexShrink: 0,
  },
  fallback: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

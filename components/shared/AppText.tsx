import { Text as RNText, type TextProps, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

/**
 * RTL-aware Text. Drop-in replacement for react-native's Text:
 *   import { Text } from "@/components/shared/AppText";
 *
 * In Arabic mode it applies `textAlign: "right"` + `writingDirection: "rtl"` as a
 * BASE style. Any explicit alignment passed by the caller (textAlign: "center" /
 * "left", etc.) is layered AFTER and therefore always wins — so this only fills in
 * the default for the (many) text nodes that never specified an alignment. This is
 * what makes Arabic right-alignment global and impossible to miss, without breaking
 * any intentionally centered/left text.
 */
export function Text({ style, ...rest }: TextProps) {
  const { isRTL } = useTheme();
  if (!isRTL) return <RNText style={style} {...rest} />;
  // GLOBAL Arabic line-height guard (forever-fix for the "overlapping title" class
  // of bug): Cairo's tall ascenders/descenders need ≥ ~1.45× lineHeight — tighter
  // values make WRAPPED Arabic lines render on top of each other (e.g. the
  // Fundamental Featured-card title, lineHeight 24 @ fontSize 18 = 1.33×). Only a
  // genuinely-broken ratio is corrected (to 1.5×), so intentionally tight latin
  // layouts and single-line chips are untouched.
  const flat = StyleSheet.flatten(style) as { fontSize?: unknown; lineHeight?: unknown } | undefined;
  const fs = typeof flat?.fontSize === "number" ? flat.fontSize : undefined;
  const lh = typeof flat?.lineHeight === "number" ? flat.lineHeight : undefined;
  const fix = fs && lh && lh < fs * 1.45 ? { lineHeight: Math.ceil(fs * 1.5) } : undefined;
  return <RNText style={[rtl.base, style, fix]} {...rest} />;
}

const rtl = StyleSheet.create({
  base: { textAlign: "right", writingDirection: "rtl" },
});

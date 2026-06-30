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
  return <RNText style={[rtl.base, style]} {...rest} />;
}

const rtl = StyleSheet.create({
  base: { textAlign: "right", writingDirection: "rtl" },
});

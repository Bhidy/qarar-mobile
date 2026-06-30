import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * SmartSignals "Decisive Q" mark — the geometric brand mark.
 * Circle (the market) + ascending diagonal + accent dot (moment of conviction).
 *
 * Matches the canonical SVG at brand/smartsignals-mark.svg:
 *   viewBox="0 0 64 64"
 *   circle cx=24 cy=24 r=18  stroke=ink  strokeWidth=2.6
 *   path   M 37 37 L 58 58   stroke=ink  strokeWidth=2.6
 *   circle cx=58 cy=58 r=4   fill=primary
 */
interface SmartSignalsMarkProps {
  size?: number;
  /** Stroke colour for circle + diagonal — defaults to brand ink */
  ink?: string;
  /** Fill colour for the accent dot — defaults to brand primary blue */
  accent?: string;
}

export function SmartSignalsMark({
  size = 32,
  ink = "#0A0E1F",
  accent = "#0B4DD4",
}: SmartSignalsMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Circle — the market (lens, top-left) */}
      <Circle
        cx={24}
        cy={24}
        r={18}
        stroke={ink}
        strokeWidth={2.6}
        fill="none"
      />
      {/* Descending diagonal — magnifier handle pointing down */}
      <Path
        d="M 37 37 L 58 58"
        stroke={ink}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {/* Accent dot — moment of decision (handle tip) */}
      <Circle cx={58} cy={58} r={4} fill={accent} />
    </Svg>
  );
}

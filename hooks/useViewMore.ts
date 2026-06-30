import { useCallback, useState } from "react";

/**
 * Caps a long list at `step` rows (default 5) and reveals `step` more on demand.
 * Keeps tall sections (analyst calls, reports) short and scannable instead of an
 * endless wall of cards. Pair with <ViewMoreButton/> for the matching control.
 *
 *   const calls = useViewMore(activeCalls);          // shows first 5
 *   {calls.items.map(renderRow)}
 *   <ViewMoreButton {...calls} />                     // "View 5 more" / "Show less"
 */
export function useViewMore<T>(data: T[], step = 5) {
  const [visible, setVisible] = useState(step);

  const items = data.slice(0, visible);
  const remaining = Math.max(0, data.length - visible);
  const canExpand = remaining > 0;
  // "expanded" = the user has revealed beyond the initial page and nothing is left.
  const expanded = visible > step && !canExpand;
  const nextCount = Math.min(step, remaining);

  const expand = useCallback(() => setVisible((v) => v + step), [step]);
  const collapse = useCallback(() => setVisible(step), [step]);

  return { items, remaining, canExpand, expanded, nextCount, step, expand, collapse };
}

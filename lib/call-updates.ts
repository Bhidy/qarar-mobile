import type { CallUpdate } from "@/constants/data";

/**
 * Mobile mirror of web/lib/call-updates.ts. Parses the JSON-string `updates`
 * column defensively (try/catch → []), hides soft-deleted entries, and sorts
 * reverse-chronologically by the immutable ISO `createdAt` (NEVER by the
 * human `date` string). Shared by the mobile CallUpdates component + screens.
 */
export function parseCallUpdates(raw: string | CallUpdate[] | null | undefined): CallUpdate[] {
  if (!raw) return [];
  let arr: unknown;
  if (Array.isArray(raw)) arr = raw;
  else {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (u): u is CallUpdate => !!u && typeof u === "object" && typeof (u as any).id === "string",
  );
}

/** Parse an ISO createdAt to ms; unparseable/missing sorts as oldest (-Infinity). */
function createdAtMs(u: CallUpdate): number {
  const t = Date.parse(u.createdAt ?? "");
  return Number.isNaN(t) ? -Infinity : t;
}

export function visibleCallUpdates(raw: string | CallUpdate[] | null | undefined): CallUpdate[] {
  return parseCallUpdates(raw)
    .filter((u) => !u.deleted)
    // newest first by parsed timestamp; stable id tie-break for same-instant updates.
    .sort((a, b) => (createdAtMs(b) - createdAtMs(a)) || String(b.id).localeCompare(String(a.id)));
}

export function latestUpdateDate(raw: string | CallUpdate[] | null | undefined): string | undefined {
  const v = visibleCallUpdates(raw);
  return v.length ? v[0].date : undefined;
}

/**
 * Effective status of a call, considering the latest update's status as an override.
 * If the most recent update that carries a status says "active", the call is treated as
 * active even if the call-level status is "closed" (and vice-versa). Falls back to the
 * call's own status when no update carries a status override.
 */
export function effectiveStatus(
  callStatus: string | undefined,
  updates: string | CallUpdate[] | null | undefined,
): "active" | "closed" {
  const list = visibleCallUpdates(updates);
  const override = list.find((u) => (u as any).status === "active" || (u as any).status === "closed")?.status as string | undefined;
  if (override) return override as "active" | "closed";
  return String(callStatus ?? "active").toLowerCase() === "closed" ? "closed" : "active";
}

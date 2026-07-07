// Single source of truth for turning a notification's `data` payload into an
// in-app route. Used by BOTH the push-tap handler (app/_layout.tsx) and the
// in-app Inbox tap (app/inbox.tsx) so every notification — push or list,
// today or future — resolves to the SAME correct destination.
//
// Resolution order:
//   1. `url` (canonical deep-link path the web push builders now always send).
//   2. Discriminated fields (type + id/newsId/articleId/ticker) — back-compat for
//      older notifications already delivered, and for the in-app Inbox model.
// Returns the path string, or null when nothing is resolvable (caller decides the
// fallback — we never silently send the user "home").
//
// PURE: no react-native / expo-router imports, so it is unit-testable in Node.

export type NotifData = Record<string, any> | null | undefined;

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

// Normalize a server-supplied path: drop hash, collapse "/tabs/index" → "/tabs",
// strip a trailing slash. Guarantees a leading "/".
function normalizePath(p: string): string {
  let out = p.split("#")[0].split("?")[0];
  out = out.replace(/\/index$/, "");
  if (out.length > 1) out = out.replace(/\/+$/, "");
  if (!out.startsWith("/")) out = `/${out}`;
  return out || "/tabs";
}

export function resolveNotificationPath(data: NotifData): string | null {
  if (!data || typeof data !== "object") return null;

  // 1) Explicit canonical path wins.
  const rawUrl = str(data.url || data.route || data.path || data.link || data.deeplink);
  if (rawUrl.startsWith("/")) return normalizePath(rawUrl);

  // 2) Discriminated fallback for lean / legacy payloads.
  const type = str(data.type).toLowerCase();
  const id = str(data.id || data.contentId);
  const articleId = str(data.articleId || data.articleid);
  const ticker = str(data.ticker);
  const isTechArticle = type === "technical_article" || type === "technical-article";
  const taId = isTechArticle ? (id || articleId) : "";
  const isFundArticle = type === "fundamental_article" || type === "fundamental-article";
  const faId = isFundArticle ? (id || articleId) : "";
  const newsId = str(data.newsId) || (type === "news" ? id : "");

  if (taId) return `/technical-article/${taId}`;
  if (faId) return `/fundamental-article/${faId}`;
  if (newsId) return `/news/${newsId}`;
  if (articleId) return `/article/${articleId}`;
  if (ticker) return `/stock/${ticker}`;
  if (type === "portfolio") return "/tabs";

  return null;
}

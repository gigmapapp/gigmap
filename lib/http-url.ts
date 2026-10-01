/**
 * An http(s) URL that is safe to put in an href.
 * Other schemes, relative paths, and unparseable strings are dropped.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;
  return url.href;
}

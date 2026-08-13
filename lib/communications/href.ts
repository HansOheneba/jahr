/** Normalize user-entered URLs for TipTap marks and email links. */
export function normalizeEmailHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "https://" || trimmed === "http://") {
    return null;
  }
  if (trimmed.startsWith("mailto:")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("www.")) {
    return `https://${trimmed}`;
  }
  // Bare domains / paths users often paste without a scheme.
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

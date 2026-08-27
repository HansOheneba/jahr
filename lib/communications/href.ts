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
  // Bare email addresses, which people paste far more often than mailto: links.
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(trimmed)) {
    return `mailto:${trimmed}`;
  }
  // Bare domains / paths users often paste without a scheme.
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

/**
 * Same as normalizeEmailHref, but also accepts single-label hosts such as
 * `intranet` or `intranet:8080`. Unknown schemes stay rejected so the editor
 * can never write a `javascript:` href into a document.
 */
export function normalizeEditorHref(href: string): string | null {
  const normalized = normalizeEmailHref(href);
  if (normalized) return normalized;

  const trimmed = href.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }
  return `https://${trimmed}`;
}

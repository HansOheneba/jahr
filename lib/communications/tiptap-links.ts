import type { JSONContent } from "@/lib/communications/types";
import { normalizeEmailHref } from "@/lib/communications/href";

export interface ExtractedLink {
  href: string;
  label: string;
}

function attrHref(attrs: JSONContent["attrs"]): string | undefined {
  if (!attrs || typeof attrs !== "object") return undefined;
  const href = (attrs as Record<string, unknown>).href;
  return typeof href === "string" ? href : undefined;
}

/** Walk TipTap JSON and collect every link mark (normalized hrefs). */
export function extractLinksFromTipTap(doc: JSONContent): ExtractedLink[] {
  const found: ExtractedLink[] = [];
  const seen = new Set<string>();

  function walk(node: JSONContent) {
    if (node.type === "text" && typeof node.text === "string" && node.marks) {
      for (const mark of node.marks) {
        if (mark.type !== "link") continue;
        const href = normalizeEmailHref(attrHref(mark.attrs) ?? "");
        if (!href || seen.has(href)) continue;
        seen.add(href);
        found.push({
          href,
          label: node.text.trim() || href,
        });
      }
    }
    for (const child of node.content ?? []) {
      walk(child);
    }
  }

  walk(doc);
  return found;
}

/**
 * Ensure TipTap JSON is plain, serializable data and link hrefs are absolute.
 * Call this before sending bodyJson across the server-action boundary.
 */
export function sanitizeTipTapJson(value: JSONContent): JSONContent {
  const plain = JSON.parse(JSON.stringify(value)) as JSONContent;

  function walk(node: JSONContent) {
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type !== "link" || !mark.attrs) continue;
        const raw =
          typeof mark.attrs.href === "string" ? mark.attrs.href : "";
        const href = normalizeEmailHref(raw);
        if (href) {
          mark.attrs = { ...mark.attrs, href };
        }
      }
    }
    for (const child of node.content ?? []) {
      walk(child);
    }
  }

  walk(plain);
  return plain;
}

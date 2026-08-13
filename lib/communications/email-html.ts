import { normalizeEmailHref } from "@/lib/communications/href";
import {
  extractLinksFromTipTap,
  sanitizeTipTapJson,
} from "@/lib/communications/tiptap-links";
import type { JSONContent } from "@/lib/communications/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function attrRecord(
  attrs: JSONContent["attrs"],
): Record<string, unknown> | null {
  if (!attrs || typeof attrs !== "object") return null;
  return attrs as Record<string, unknown>;
}

function attrString(
  attrs: JSONContent["attrs"],
  key: string,
): string | undefined {
  const value = attrRecord(attrs)?.[key];
  return typeof value === "string" ? value : undefined;
}

function attrNumber(
  attrs: JSONContent["attrs"],
  key: string,
): number | undefined {
  const value = attrRecord(attrs)?.[key];
  return typeof value === "number" ? value : undefined;
}

function renderMarks(text: string, marks: JSONContent["marks"]): string {
  let html = escapeHtml(text);
  if (!marks || marks.length === 0) {
    return html;
  }

  const ordered = [...marks].sort((left, right) => {
    if (left.type === "link") return 1;
    if (right.type === "link") return -1;
    return 0;
  });

  for (const mark of ordered) {
    switch (mark.type) {
      case "bold":
        html = `<strong style="font-weight:600">${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "link": {
        const href = normalizeEmailHref(attrString(mark.attrs, "href") ?? "");
        if (href) {
          // Explicit underline + color; many clients strip bare <a> styling.
          html = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#0B57D0;text-decoration:underline"><u style="color:#0B57D0">${html}</u></a>`;
        }
        break;
      }
      default:
        break;
    }
  }

  return html;
}

function renderInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type === "mention") {
        const label =
          attrString(node.attrs, "label") ?? attrString(node.attrs, "id") ?? "";
        return label ? `<strong>@${escapeHtml(label)}</strong>` : "";
      }
      if (node.type === "text" && typeof node.text === "string") {
        return renderMarks(node.text, node.marks);
      }
      return renderInline(node.content);
    })
    .join("");
}

function renderBlock(node: JSONContent): string {
  switch (node.type) {
    case "blockquote":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr><td style="border-left:3px solid #55A8FD;padding:8px 0 8px 14px;color:#667085;font-size:14px;line-height:22px;font-style:italic">${(node.content ?? []).map(renderBlock).join("") || "&nbsp;"}</td></tr></table>`;
    case "bulletList":
      return `<ul style="margin:0 0 12px;padding-left:22px;color:#1C1C1C;font-size:14px;line-height:22px">${(node.content ?? []).map(renderBlock).join("")}</ul>`;
    case "orderedList":
      return `<ol style="margin:0 0 12px;padding-left:22px;color:#1C1C1C;font-size:14px;line-height:22px">${(node.content ?? []).map(renderBlock).join("")}</ol>`;
    case "listItem":
      return `<li style="margin:0 0 4px">${(node.content ?? [])
        .map((child) => {
          if (child.type === "paragraph") {
            return renderInline(child.content) || "&nbsp;";
          }
          return renderBlock(child);
        })
        .join("")}</li>`;
    case "paragraph":
      return `<p style="margin:0 0 12px;color:#1C1C1C;font-size:14px;line-height:22px">${renderInline(node.content) || "<br />"}</p>`;
    case "heading": {
      const levelValue = attrNumber(node.attrs, "level");
      const level =
        typeof levelValue === "number" &&
        levelValue >= 1 &&
        levelValue <= 3
          ? levelValue
          : 2;
      const size = level === 3 ? "15px" : "17px";
      return `<h${level} style="margin:0 0 12px;color:#171717;font-size:${size};font-weight:600;line-height:24px">${renderInline(node.content)}</h${level}>`;
    }
    default:
      return renderInline(node.content);
  }
}

function linksFooter(doc: JSONContent): string {
  const links = extractLinksFromTipTap(doc);
  if (links.length === 0) return "";

  const items = links
    .map(
      (link) =>
        `<li style="margin:0 0 6px"><a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" style="color:#0B57D0;text-decoration:underline">${escapeHtml(link.label)}</a><br /><span style="color:#667085;font-size:12px">${escapeHtml(link.href)}</span></li>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;background:#F8F9FA;border:1px solid #E3E8EF;border-radius:12px"><tr><td style="padding:12px 14px"><p style="margin:0 0 8px;color:#171717;font-size:12px;font-weight:600;line-height:18px">Links</p><ul style="margin:0;padding-left:18px">${items}</ul></td></tr></table>`;
}

/** Convert TipTap JSON into a conservative email-safe HTML fragment. */
export function tipTapJsonToEmailHtml(doc: JSONContent): string {
  const plain = sanitizeTipTapJson(doc);
  const blocks = plain.content ?? [];
  return `${blocks.map(renderBlock).join("")}${linksFooter(plain)}`;
}

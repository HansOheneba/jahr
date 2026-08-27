import { normalizeEmailHref } from "@/lib/communications/href";
import { sanitizeTipTapJson } from "@/lib/communications/tiptap-links";
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

const MONO_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

function renderMarks(text: string, marks: JSONContent["marks"]): string {
  let html = escapeHtml(text);
  if (!marks || marks.length === 0) {
    return html;
  }

  const types = new Set(marks.map((mark) => mark.type));

  if (types.has("code")) {
    html = `<code style="font-family:${MONO_FONT_FAMILY};font-size:13px;background:#F1F3F7;border:1px solid #E3E8EF;border-radius:4px;padding:1px 4px">${html}</code>`;
  }
  if (types.has("italic")) {
    html = `<em style="font-style:italic">${html}</em>`;
  }
  if (types.has("bold")) {
    html = `<strong style="font-weight:700">${html}</strong>`;
  }

  // Clients sanitize away <u> and <s>, so decorations ship as one inline style.
  const decorations: string[] = [];
  if (types.has("underline")) decorations.push("underline");
  if (types.has("strike")) decorations.push("line-through");
  if (decorations.length > 0) {
    html = `<span style="text-decoration:${decorations.join(" ")}">${html}</span>`;
  }

  const linkMark = marks.find((mark) => mark.type === "link");
  if (linkMark) {
    const href = normalizeEmailHref(attrString(linkMark.attrs, "href") ?? "");
    if (href) {
      const linkDecoration = types.has("strike")
        ? "underline line-through"
        : "underline";
      html = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#0B57D0;text-decoration:${linkDecoration};word-break:break-word">${html}</a>`;
    }
  }

  return html;
}

/** Code blocks hold plain text; marks inside them are ignored by TipTap. */
function codeBlockText(node: JSONContent): string {
  return (node.content ?? [])
    .map((child) => (typeof child.text === "string" ? child.text : ""))
    .join("");
}

function renderInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type === "mention") {
        const label =
          attrString(node.attrs, "label") ?? attrString(node.attrs, "id") ?? "";
        return label
          ? `<span style="color:#0B4FBF;font-weight:600">@${escapeHtml(label)}</span>`
          : "";
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
    case "blockquote": {
      // Quoted paragraphs need the muted italic styling inline, not on the cell.
      const quoted =
        (node.content ?? [])
          .map((child) =>
            child.type === "paragraph"
              ? `<p style="margin:0 0 8px;color:#667085;font-size:14px;line-height:22px;font-style:italic">${renderInline(child.content) || "<br />"}</p>`
              : renderBlock(child),
          )
          .join("") || "&nbsp;";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr><td style="border-left:3px solid #55A8FD;padding:8px 0 2px 14px">${quoted}</td></tr></table>`;
    }
    case "codeBlock":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr><td style="background:#F8F9FA;border:1px solid #E3E8EF;border-radius:8px;padding:12px 14px"><pre style="margin:0;color:#171717;font-family:${MONO_FONT_FAMILY};font-size:13px;line-height:20px;white-space:pre-wrap">${escapeHtml(codeBlockText(node))}</pre></td></tr></table>`;
    case "horizontalRule":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr><td style="border-top:1px solid #E3E8EF;font-size:0;line-height:1">&nbsp;</td></tr></table>`;
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

/** Convert TipTap JSON into a conservative email-safe HTML fragment. */
export function tipTapJsonToEmailHtml(doc: JSONContent): string {
  const plain = sanitizeTipTapJson(doc);
  const blocks = plain.content ?? [];
  return blocks.map(renderBlock).join("");
}

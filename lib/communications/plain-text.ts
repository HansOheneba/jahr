import {
  cloneTipTapJson,
  type JSONContent,
} from "@/lib/communications/types";

function nodePlainText(node: JSONContent): string {
  if (node.type === "hardBreak") {
    return "\n";
  }

  if (node.type === "mention") {
    const attrs =
      node.attrs && typeof node.attrs === "object"
        ? (node.attrs as Record<string, unknown>)
        : null;
    const label =
      typeof attrs?.label === "string"
        ? attrs.label
        : typeof attrs?.id === "string"
          ? attrs.id
          : "";
    return label ? `@${label}` : "";
  }

  if (typeof node.text === "string") {
    return node.text;
  }

  const children = node.content ?? [];
  const joined = children.map(nodePlainText).join("");

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote" ||
    node.type === "codeBlock" ||
    node.type === "listItem"
  ) {
    return joined ? `${joined}\n` : "\n";
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return joined.endsWith("\n") ? joined : `${joined}\n`;
  }

  return joined;
}

/** Extract plain text from TipTap JSON for email text + DB `body` excerpt. */
export function tipTapJsonToPlainText(doc: JSONContent): string {
  const plain = cloneTipTapJson(doc);
  return nodePlainText(plain).replace(/\n{3,}/g, "\n\n").trim();
}

export function isTipTapDocEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc) return true;
  return tipTapJsonToPlainText(doc).length === 0;
}

/** Wrap legacy plain text into a TipTap document. */
export function plainTextToTipTapDoc(text: string): JSONContent {
  const lines = text.split("\n");
  return {
    type: "doc",
    content:
      lines.length === 0
        ? [{ type: "paragraph" }]
        : lines.map((line) =>
            line.length === 0
              ? { type: "paragraph" }
              : {
                  type: "paragraph",
                  content: [{ type: "text", text: line }],
                },
          ),
  };
}

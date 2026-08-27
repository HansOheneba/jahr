import { normalizeEmailHref } from "@/lib/communications/href";
import type { JSONContent } from "@/lib/communications/types";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: JSONContent | null | undefined;
  fallbackPlainText?: string;
  className?: string;
  clamp?: boolean;
  /** Render link marks as styled text (no `<a>`). Use inside a parent link. */
  staticLinks?: boolean;
}

interface RenderOptions {
  staticLinks: boolean;
}

function renderMarks(
  text: string,
  marks: JSONContent["marks"],
  keyBase: string,
  options: RenderOptions,
): React.ReactNode {
  let node: React.ReactNode = text;
  if (!marks) return node;

  marks.forEach((mark, index) => {
    const key = `${keyBase}-${mark.type}-${index}`;
    switch (mark.type) {
      case "bold":
        node = <strong key={key}>{node}</strong>;
        break;
      case "italic":
        node = <em key={key}>{node}</em>;
        break;
      case "underline":
        node = <u key={key}>{node}</u>;
        break;
      case "strike":
        node = <s key={key}>{node}</s>;
        break;
      case "code":
        node = (
          <code
            key={key}
            className="rounded-sm border border-border bg-muted px-1 py-0.5 font-mono text-[0.8125rem]"
          >
            {node}
          </code>
        );
        break;
      case "link": {
        const href =
          typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
        const normalized = normalizeEmailHref(href);
        if (normalized) {
          node = options.staticLinks ? (
            <span
              key={key}
              className="font-medium text-[#0B4FBF] underline underline-offset-2"
            >
              {node}
            </span>
          ) : (
            <a
              key={key}
              href={normalized}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#0B4FBF] underline underline-offset-2"
            >
              {node}
            </a>
          );
        }
        break;
      }
      default:
        break;
    }
  });

  return node;
}

function renderInline(
  nodes: JSONContent[] | undefined,
  keyPrefix: string,
  options: RenderOptions,
): React.ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "hardBreak") {
      return <br key={key} />;
    }
    if (node.type === "mention") {
      const label =
        typeof node.attrs?.label === "string"
          ? node.attrs.label
          : typeof node.attrs?.id === "string"
            ? node.attrs.id
            : "";
      return (
        <span
          key={key}
          className="rounded-sm bg-[color-mix(in_srgb,#0070F3_12%,white)] px-1 py-0.5 font-medium text-[#0B4FBF]"
        >
          @{label}
        </span>
      );
    }
    if (node.type === "text" && typeof node.text === "string") {
      return (
        <span key={key}>{renderMarks(node.text, node.marks, key, options)}</span>
      );
    }
    return (
      <span key={key}>{renderInline(node.content, key, options)}</span>
    );
  });
}

function renderBlock(
  node: JSONContent,
  index: number,
  options: RenderOptions,
): React.ReactNode {
  const key = `block-${index}`;
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="my-1">
          {renderInline(node.content, key, options)}
        </p>
      );
    case "heading": {
      const level =
        typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      const className = cn(
        "my-1.5 font-medium tracking-tight text-foreground",
        level === 3 ? "text-sm" : "text-base",
      );
      if (level === 3) {
        return (
          <h4 key={key} className={className}>
            {renderInline(node.content, key, options)}
          </h4>
        );
      }
      return (
        <h3 key={key} className={className}>
          {renderInline(node.content, key, options)}
        </h3>
      );
    }
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-2 border-l-[3px] border-[#55A8FD] pl-3 text-muted-foreground italic"
        >
          {(node.content ?? []).map((child, childIndex) =>
            renderBlock(child, childIndex, options),
          )}
        </blockquote>
      );
    case "bulletList":
      return (
        <ul key={key} className="my-1.5 list-disc space-y-0.5 pl-5">
          {(node.content ?? []).map((child, childIndex) =>
            renderBlock(child, childIndex, options),
          )}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="my-1.5 list-decimal space-y-0.5 pl-5">
          {(node.content ?? []).map((child, childIndex) =>
            renderBlock(child, childIndex, options),
          )}
        </ol>
      );
    case "listItem":
      return (
        <li key={key}>
          {(node.content ?? []).map((child, childIndex) =>
            renderBlock(child, childIndex, options),
          )}
        </li>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="my-2 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-[0.8125rem] whitespace-pre-wrap"
        >
          {(node.content ?? [])
            .map((child) => (typeof child.text === "string" ? child.text : ""))
            .join("")}
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="my-3 border-border" />;
    default:
      return (
        <div key={key}>{renderInline(node.content, key, options)}</div>
      );
  }
}

export function MessageContent({
  content,
  fallbackPlainText,
  className,
  clamp = false,
  staticLinks = false,
}: MessageContentProps) {
  const renderOptions: RenderOptions = { staticLinks: staticLinks };
  const hasDoc =
    content &&
    content.type === "doc" &&
    Array.isArray(content.content) &&
    content.content.length > 0;

  if (!hasDoc) {
    if (!fallbackPlainText?.trim()) return null;
    return (
      <div
        className={cn(
          "whitespace-pre-wrap text-sm text-muted-foreground",
          clamp && "line-clamp-3",
          className,
        )}
      >
        {fallbackPlainText}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-muted-foreground [&_li]:font-medium [&_strong]:font-semibold [&_strong]:text-foreground",
        clamp && "line-clamp-3 overflow-hidden",
        className,
      )}
    >
      {content.content!.map((node, index) =>
        renderBlock(node, index, renderOptions),
      )}
    </div>
  );
}

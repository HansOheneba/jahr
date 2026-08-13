"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeEmailHref } from "@/lib/communications/href";
import { cn } from "@/lib/utils";

interface RichTextToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              "text-muted-foreground",
              active && "bg-secondary text-foreground",
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function setLink(editor: Editor) {
  const previous = editor.getAttributes("link").href;
  const url = window.prompt(
    "Link URL",
    typeof previous === "string" && previous.length > 0
      ? previous
      : "https://",
  );
  if (url === null) return;
  const trimmed = url.trim();
  if (trimmed === "" || trimmed === "https://" || trimmed === "http://") {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  const href = normalizeEmailHref(trimmed) ?? trimmed;
  editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

export function RichTextToolbar({ editor, disabled }: RichTextToolbarProps) {
  if (!editor) return null;

  const busy = disabled || !editor.isEditable;

  return (
    <TooltipProvider delay={200}>
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5"
        role="toolbar"
        aria-label="Formatting"
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          disabled={busy}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          disabled={busy}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          disabled={busy}
          onClick={() => setLink(editor)}
        >
          <Link2 />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        <ToolbarButton
          label="Undo"
          disabled={busy || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={busy || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          disabled={busy}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <RemoveFormatting />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

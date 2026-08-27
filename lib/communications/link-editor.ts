import type { Editor } from "@tiptap/react";

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Apply a normalized href to the current selection, or insert linked text. */
export function applyEditorLink(
  editor: Editor,
  href: string,
  label?: string,
): boolean {
  const { empty } = editor.state.selection;

  if (empty && !editor.isActive("link")) {
    const display = label?.trim() || href;
    return editor
      .chain()
      .focus()
      .insertContent(
        `<a href="${escapeHtmlAttr(href)}">${escapeHtmlText(display)}</a>`,
      )
      .run();
  }

  if (editor.isActive("link")) {
    return editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href })
      .run();
  }

  return editor.chain().focus().setLink({ href }).run();
}

export function removeEditorLink(editor: Editor): boolean {
  return editor.chain().focus().extendMarkRange("link").unsetLink().run();
}

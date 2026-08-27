"use client";

import { Paperclip } from "lucide-react";
import { useId, useMemo, useRef } from "react";
import { AttachmentList } from "@/components/communications/attachment-list";
import { RichTextEditor } from "@/components/communications/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ANNOUNCEMENT_TAXONOMY,
  getTypesForCategory,
  type AnnouncementCategory,
  type AnnouncementType,
} from "@/lib/announcements/categories";
import {
  ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES,
  MAX_ANNOUNCEMENT_ATTACHMENT_BYTES,
  type JSONContent,
  type MentionCandidate,
  type PendingAttachment,
} from "@/lib/communications/types";
import { cn } from "@/lib/utils";

const ATTACHMENT_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ...ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES,
].join(",");

interface MessageComposerProps {
  title: string;
  onTitleChange: (value: string) => void;
  category: AnnouncementCategory;
  onCategoryChange: (value: AnnouncementCategory) => void;
  announcementType: AnnouncementType;
  onAnnouncementTypeChange: (value: AnnouncementType) => void;
  bodyJson: JSONContent;
  onBodyChange: (value: JSONContent) => void;
  pendingAttachments: PendingAttachment[];
  onPendingAttachmentsChange: (files: PendingAttachment[]) => void;
  mentionCandidates: MentionCandidate[];
  audienceSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  error?: string | null;
  success?: string | null;
  disabled?: boolean;
  onSubmitShortcut?: () => void;
  className?: string;
}

export function MessageComposer({
  title,
  onTitleChange,
  category,
  onCategoryChange,
  announcementType,
  onAnnouncementTypeChange,
  bodyJson,
  onBodyChange,
  pendingAttachments,
  onPendingAttachmentsChange,
  mentionCandidates,
  audienceSlot,
  footerSlot,
  error,
  success,
  disabled,
  onSubmitShortcut,
  className,
}: MessageComposerProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryItems = ANNOUNCEMENT_TAXONOMY.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  const typeOptions = useMemo(
    () => getTypesForCategory(category),
    [category],
  );

  const typeItems = typeOptions.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const next: PendingAttachment[] = [...pendingAttachments];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_ANNOUNCEMENT_ATTACHMENT_MIME_TYPES.has(file.type)) {
        continue;
      }
      if (file.size > MAX_ANNOUNCEMENT_ATTACHMENT_BYTES) {
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        fileName: file.name,
        mimeType: file.type,
        byteSize: file.size,
      });
    }
    onPendingAttachmentsChange(next);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="comms-category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  if (!value) return;
                  const nextCategory = value as AnnouncementCategory;
                  onCategoryChange(nextCategory);
                  const nextTypes = getTypesForCategory(nextCategory);
                  const stillValid = nextTypes.some(
                    (item) => item.id === announcementType,
                  );
                  if (!stillValid && nextTypes[0]) {
                    onAnnouncementTypeChange(nextTypes[0].id);
                  }
                }}
                items={categoryItems}
                disabled={disabled}
              >
                <SelectTrigger id="comms-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_TAXONOMY.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comms-type">Type</Label>
              <Select
                value={announcementType}
                onValueChange={(value) => {
                  if (value) onAnnouncementTypeChange(value as AnnouncementType);
                }}
                items={typeItems}
                disabled={disabled}
              >
                <SelectTrigger id="comms-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comms-title">Subject</Label>
            <Input
              id="comms-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Welcome Michael Mensah to the Marketing team"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comms-body">Message</Label>
            <RichTextEditor
              value={bodyJson}
              onChange={onBodyChange}
              mentionCandidates={mentionCandidates}
              disabled={disabled}
              onSubmitShortcut={onSubmitShortcut}
              aria-label="Announcement content"
            />
            <p className="text-xs text-muted-foreground">
              Type @ to mention a colleague. ⌘/Ctrl+Enter publishes.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                className="sr-only"
                multiple
                accept={ATTACHMENT_ACCEPT}
                disabled={disabled}
                onChange={(event) => handleFilesSelected(event.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
                Attach files
              </Button>
              <p className="text-xs text-muted-foreground">
                PDF, Word, or images up to 10 MB.
              </p>
            </div>
            <AttachmentList
              pending={pendingAttachments}
              onRemovePending={(id) =>
                onPendingAttachmentsChange(
                  pendingAttachments.filter((file) => file.id !== id),
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {audienceSlot}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-success" role="status">
          {success}
        </p>
      ) : null}

      {footerSlot}
    </div>
  );
}

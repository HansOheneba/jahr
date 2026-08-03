"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { deleteDocument, uploadDocument } from "@/lib/documents/actions";
import {
  EMPLOYEE_UPLOAD_KINDS,
  HR_UPLOAD_KINDS,
  MAX_DOCUMENT_BYTES,
  defaultTitleForKind,
} from "@/lib/documents/kinds";
import {
  DOCUMENT_KIND_LABELS,
  type DocumentKind,
  type EmployeeDocument,
} from "@/lib/types/employee";
import { cn } from "@/lib/utils";

const FILE_ACCEPT =
  ".pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function formatUploadedAt(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsManager({
  employeeId,
  viewerId,
  documents,
  canManageHrDocs = false,
  title = "Your documents",
  description = "Upload CVs, IDs, and certificates. HR can add contracts and NDAs.",
}: {
  employeeId: string;
  viewerId: string;
  documents: EmployeeDocument[];
  canManageHrDocs?: boolean;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<DocumentKind>(
    canManageHrDocs ? "appointment_letter" : "cv",
  );
  const [docTitle, setDocTitle] = useState(
    defaultTitleForKind(canManageHrDocs ? "appointment_letter" : "cv"),
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const kindOptions = useMemo(() => {
    if (!canManageHrDocs) {
      return [...EMPLOYEE_UPLOAD_KINDS];
    }

    return [
      ...HR_UPLOAD_KINDS,
      ...EMPLOYEE_UPLOAD_KINDS.filter(
        (value) => !(HR_UPLOAD_KINDS as readonly string[]).includes(value),
      ),
    ];
  }, [canManageHrDocs]);

  const selectItems = useMemo(
    () =>
      kindOptions.map((option) => ({
        value: option,
        label: DOCUMENT_KIND_LABELS[option],
      })),
    [kindOptions],
  );

  function resetForm() {
    const nextKind = canManageHrDocs ? "appointment_letter" : "cv";
    setKind(nextKind);
    setDocTitle(defaultTitleForKind(nextKind));
    setFile(null);
    setDragActive(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }

    if (next.size > MAX_DOCUMENT_BYTES) {
      setError("Files must be 10 MB or smaller.");
      setFile(null);
      return;
    }

    setError(null);
    setFile(next);
  }

  function handleKindChange(value: string | null) {
    if (!value) return;
    const nextKind = value as DocumentKind;
    setKind(nextKind);
    setDocTitle((current) => {
      const previousDefault = defaultTitleForKind(kind);
      return current.trim() === "" || current === previousDefault
        ? defaultTitleForKind(nextKind)
        : current;
    });
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    selectFile(dropped);
  }

  function handleUpload() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError("Files must be 10 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.set("employeeId", employeeId);
    formData.set("kind", kind);
    formData.set("title", docTitle.trim());
    formData.set("file", file);

    setError(null);
    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function handleDelete(documentId: string) {
    setError(null);
    setDeletingId(documentId);
    startTransition(async () => {
      const result = await deleteDocument(documentId);
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {error && !open ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          documents.map((doc) => {
            const removable =
              canManageHrDocs ||
              !doc.uploaded_by ||
              doc.uploaded_by === viewerId;
            const busy = pending && deletingId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_KIND_LABELS[doc.kind]}
                      {doc.file_name ? ` · ${doc.file_name}` : ""}
                      {` · ${formatUploadedAt(doc.created_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {doc.storage_path || doc.file_url ? (
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${doc.title}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      )}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <Badge variant="outline" className="rounded-md font-normal">
                      Awaiting file
                    </Badge>
                  )}
                  {removable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => handleDelete(doc.id)}
                      aria-label={`Delete ${doc.title}`}
                    >
                      {busy ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Upload document</SheetTitle>
            <SheetDescription>
              {canManageHrDocs
                ? "Add appointment letters, NDAs, contracts, or personal files."
                : "Add your CV, ID, certificates, or other personal documents."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="document-kind">Type</Label>
              <Select
                value={kind}
                onValueChange={handleKindChange}
                items={selectItems}
              >
                <SelectTrigger id="document-kind" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DOCUMENT_KIND_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-title">Title</Label>
              <Input
                id="document-title"
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-file">File</Label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors",
                  dragActive
                    ? "border-accent-blue bg-accent-blue/5"
                    : "border-border bg-secondary/40 hover:border-foreground/25 hover:bg-secondary/70",
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-md border border-border bg-card">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                {file ? (
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} · Drop a new file to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      Drag and drop, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, or image · max 10 MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="document-file"
                  type="file"
                  accept={FILE_ACCEPT}
                  className="sr-only"
                  onChange={(event) => {
                    selectFile(event.target.files?.[0] ?? null);
                  }}
                />
              </div>
            </div>
          </div>

          <SheetFooter>
            {error && open ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button
              type="button"
              onClick={handleUpload}
              disabled={pending || !file}
              className="gap-2"
            >
              {pending && !deletingId ? <Spinner /> : null}
              Upload
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

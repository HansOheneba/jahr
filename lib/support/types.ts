/** Ideas and bug reports raised by employees about the portal itself. */
export const SUPPORT_REQUEST_KINDS = [
  {
    id: "idea",
    label: "I have an idea",
    listLabel: "Idea",
    description: "A feature or improvement.",
    detailsPlaceholder: "What should we add, and who would use it?",
  },
  {
    id: "help",
    label: "Report a bug",
    listLabel: "Bug report",
    description: "Something is broken or not working.",
    detailsPlaceholder:
      "What you tried, what happened, and which page or feature.",
  },
] as const;

export type SupportRequestKind = (typeof SUPPORT_REQUEST_KINDS)[number]["id"];

export const SUPPORT_REQUEST_STATUSES = [
  { id: "new", label: "New" },
  { id: "in_review", label: "In review" },
  { id: "done", label: "Done" },
  { id: "declined", label: "Not planned" },
] as const;

export type SupportRequestStatus =
  (typeof SUPPORT_REQUEST_STATUSES)[number]["id"];

export const SUPPORT_SUBJECT_MAX_LENGTH = 120;
export const SUPPORT_DETAILS_MAX_LENGTH = 4000;

export interface SupportRequestPerson {
  id: string;
  name: string;
}

export interface SupportRequest {
  id: string;
  kind: SupportRequestKind;
  subject: string;
  details: string;
  status: SupportRequestStatus;
  createdAt: string;
  submitter: SupportRequestPerson | null;
  reviewer: SupportRequestPerson | null;
  reviewedAt: string | null;
}

export function getSupportRequestKind(kind: SupportRequestKind) {
  return (
    SUPPORT_REQUEST_KINDS.find((option) => option.id === kind) ??
    SUPPORT_REQUEST_KINDS[0]
  );
}

export function supportRequestKindLabel(kind: SupportRequestKind): string {
  return getSupportRequestKind(kind).listLabel;
}

export function supportRequestStatusLabel(
  status: SupportRequestStatus,
): string {
  return (
    SUPPORT_REQUEST_STATUSES.find((option) => option.id === status)?.label ??
    status
  );
}

export function isSupportRequestKind(
  value: string,
): value is SupportRequestKind {
  return SUPPORT_REQUEST_KINDS.some((option) => option.id === value);
}

export function isSupportRequestStatus(
  value: string,
): value is SupportRequestStatus {
  return SUPPORT_REQUEST_STATUSES.some((option) => option.id === value);
}

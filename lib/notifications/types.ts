export type NotificationKind =
  | "leave_request"
  | "leave_decision"
  | "performance_review"
  | "document"
  | "announcement"
  | "reminder";

export type NotificationActor = {
  name: string;
  gender?: "male" | "female" | null;
  avatarUrl?: string | null;
};

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  unread: boolean;
  createdAt: string;
  actor: NotificationActor | null;
  /** Bold lead name / subject when present */
  subject: string | null;
  body: string;
  /** Optional actions for actionable items */
  actions?: Array<"approve" | "decline">;
  href?: string;
};

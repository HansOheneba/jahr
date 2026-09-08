import { render } from "@react-email/render";
import { AnnouncementEmail } from "@/emails/announcement";
import {
  announcementTypeLabel,
  type AnnouncementType,
} from "@/lib/announcements/categories";
import { tipTapJsonToEmailHtml } from "@/lib/communications/email-html";
import type { JSONContent } from "@/lib/communications/types";
import {
  EMAIL_BRAND,
  EMAIL_CONFIDENTIALITY,
  getPortalUrl,
} from "@/lib/email/config";
import {
  formatFromAddress,
  sendEmail,
  type EmailAttachment,
} from "@/lib/email/resend";

export interface AnnouncementEmailContent {
  title: string;
  /** Plain-text body for the text/plain alternative. */
  body: string;
  bodyJson: JSONContent;
  announcementType: AnnouncementType;
  /** Omitted while previewing an unpublished draft. */
  announcementId?: string;
  publishedAtLabel: string;
  attachmentNames?: string[];
}

export interface PreparedAnnouncementEmail {
  subject: string;
  html: string;
  text: string;
}

/** The HTML mail clients receive. Shared by the send path and composer preview. */
export async function renderAnnouncementEmailHtml(
  input: AnnouncementEmailContent,
): Promise<string> {
  return render(
    AnnouncementEmail({
      title: input.title,
      bodyHtml: tipTapJsonToEmailHtml(input.bodyJson),
      typeLabel: announcementTypeLabel(input.announcementType),
      publishedAtLabel: input.publishedAtLabel,
      attachmentNames: input.attachmentNames ?? [],
      ctaHref: getPortalUrl(
        input.announcementId
          ? `/announcements/${input.announcementId}`
          : "/announcements",
      ),
    }),
  );
}

/**
 * Render subject, HTML, and text once so a broadcast to many recipients does
 * not re-render the same email per person.
 */
export async function buildAnnouncementEmail(
  input: AnnouncementEmailContent,
): Promise<PreparedAnnouncementEmail> {
  const typeLabel = announcementTypeLabel(input.announcementType);
  const attachmentNames = input.attachmentNames ?? [];

  const attachmentNote =
    attachmentNames.length === 0
      ? []
      : [
          `${attachmentNames.length} attachment${
            attachmentNames.length === 1 ? "" : "s"
          } included: ${attachmentNames.join(", ")}.`,
          "",
        ];

  const text = [
    input.title,
    typeLabel,
    `Published ${input.publishedAtLabel}`,
    "",
    input.body,
    "",
    ...attachmentNote,
    `View in portal: ${getPortalUrl(
      input.announcementId
        ? `/announcements/${input.announcementId}`
        : "/announcements",
    )}`,
    "",
    EMAIL_BRAND.productName,
    "",
    EMAIL_CONFIDENTIALITY.body,
  ].join("\n");

  return {
    subject: `[${typeLabel}] ${input.title}`,
    html: await renderAnnouncementEmailHtml(input),
    text,
  };
}

export async function sendAnnouncementEmail(input: {
  to: string;
  email: PreparedAnnouncementEmail;
  attachments?: EmailAttachment[];
}): Promise<void> {
  await sendEmail({
    to: input.to,
    from: formatFromAddress("JA Group Internal Comms"),
    subject: input.email.subject,
    text: input.email.text,
    html: input.email.html,
    attachments: input.attachments,
  });
}

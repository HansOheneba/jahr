import { render } from "@react-email/render";
import { AnnouncementEmail } from "@/emails/announcement";
import type { AnnouncementType } from "@/lib/announcements/categories";
import {
  announcementCategoryLabel,
  announcementTypeLabel,
  getAnnouncementCategory,
} from "@/lib/announcements/categories";
import { extractLinksFromTipTap } from "@/lib/communications/tiptap-links";
import { tipTapJsonToEmailHtml } from "@/lib/communications/email-html";
import type { JSONContent } from "@/lib/communications/types";
import { EMAIL_BRAND, getPortalUrl } from "@/lib/email/config";
import {
  formatFromAddress,
  sendEmail,
  type EmailAttachment,
} from "@/lib/email/resend";

export async function sendAnnouncementEmail(input: {
  to: string;
  title: string;
  body: string;
  bodyJson: JSONContent;
  announcementType: AnnouncementType;
  announcementId: string;
  publishedAtLabel: string;
  attachments?: EmailAttachment[];
}): Promise<void> {
  const attachments = input.attachments ?? [];
  const attachmentNames = attachments.map((file) => file.filename);
  const typeLabel = announcementTypeLabel(input.announcementType);
  const categoryLabel = announcementCategoryLabel(
    getAnnouncementCategory(input.announcementType),
  );
  const attachmentNote =
    attachmentNames.length === 0
      ? null
      : `${attachmentNames.length} attachment${
          attachmentNames.length === 1 ? "" : "s"
        } included: ${attachmentNames.join(", ")}.`;

  const bodyHtml = tipTapJsonToEmailHtml(input.bodyJson);
  const links = extractLinksFromTipTap(input.bodyJson);
  const linksText =
    links.length === 0
      ? []
      : [
          "Links:",
          ...links.map((link) => `- ${link.label}: ${link.href}`),
          "",
        ];

  const textParts = [
    input.title,
    `Category: ${categoryLabel}`,
    `Type: ${typeLabel}`,
    "",
    input.body,
    "",
    ...linksText,
    ...(attachmentNote ? [attachmentNote, ""] : []),
    `Published: ${input.publishedAtLabel}`,
    "",
    `View in portal: ${getPortalUrl(`/announcements/${input.announcementId}`)}`,
    "",
    EMAIL_BRAND.productName,
  ];

  // Pre-render so Resend gets plain HTML (keeps <a href> intact).
  const html = await render(
    AnnouncementEmail({
      title: input.title,
      bodyHtml,
      categoryLabel,
      typeLabel,
      publishedAtLabel: input.publishedAtLabel,
      attachmentNames,
      ctaHref: getPortalUrl(`/announcements/${input.announcementId}`),
    }),
  );

  await sendEmail({
    to: input.to,
    from: formatFromAddress("JA Group Internal Comms"),
    subject: `[${typeLabel}] ${input.title}`,
    text: textParts.join("\n"),
    html,
    attachments,
  });
}

import { AnnouncementEmail } from "@/emails/announcement";
import { EMAIL_BRAND, getPortalUrl } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/resend";

export async function sendAnnouncementEmail(input: {
  to: string;
  title: string;
  body: string;
  publishedAtLabel: string;
}): Promise<void> {
  const dashboardUrl = getPortalUrl("/dashboard");

  await sendEmail({
    to: input.to,
    subject: input.title,
    text: [
      input.title,
      "",
      input.body,
      "",
      `Published: ${input.publishedAtLabel}`,
      "",
      `View in portal: ${dashboardUrl}`,
      "",
      EMAIL_BRAND.productName,
    ].join("\n"),
    react: AnnouncementEmail({
      title: input.title,
      body: input.body,
      publishedAtLabel: input.publishedAtLabel,
    }),
  });
}

import type { ReactNode } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromAddress =
  process.env.RESEND_FROM_EMAIL ?? "JA Group TMS <noreply@no-reply.celerey.co>";

function getClient(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

/** Keep the configured mailbox, swap only the display name. */
export function formatFromAddress(displayName: string): string {
  const angle = defaultFromAddress.match(/<([^>]+)>/);
  const email =
    angle?.[1]?.trim() ||
    (defaultFromAddress.includes("@")
      ? defaultFromAddress.trim()
      : "noreply@no-reply.celerey.co");
  return `${displayName} <${email}>`;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  react?: ReactNode;
  html?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

/** Transactional email. Logs failures; does not throw into leave/comms flows. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY missing - skipped send to", input.to);
    return;
  }

  try {
    let html = input.html;
    if (!html && input.react) {
      html = await render(input.react);
    }

    const { data, error } = await client.emails.send({
      from: input.from ?? defaultFromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(html ? { html } : {}),
      ...(input.attachments && input.attachments.length > 0
        ? {
            attachments: input.attachments.map((file) => ({
              filename: file.filename,
              content: file.content,
              contentType: file.contentType,
            })),
          }
        : {}),
    });

    if (error) {
      console.error("[email] Resend error:", error.message, {
        to: input.to,
        subject: input.subject,
      });
      return;
    }

    console.info("[email] sent", { to: input.to, id: data?.id });
  } catch (error) {
    console.error("[email] Failed to send:", error);
  }
}

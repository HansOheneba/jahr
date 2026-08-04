import type { ReactNode } from "react";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM_EMAIL ?? "JA Group TMS <noreply@no-reply.celerey.co>";

function getClient(): Resend | null {
  if (!resendApiKey) {
    return null;
  }
  return new Resend(resendApiKey);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  react?: ReactNode;
}

/** Fire-and-forget transactional email. Never throws - leave flow must not fail on mail. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn("[email] RESEND_API_KEY missing - skipped send to", input.to);
    return;
  }

  try {
    const { error } = await client.emails.send({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.react ? { react: input.react } : {}),
    });

    if (error) {
      console.error("[email] Resend error:", error.message);
    }
  } catch (error) {
    console.error("[email] Failed to send:", error);
  }
}

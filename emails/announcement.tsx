import { Text } from "react-email";
import {
  BrandedEmail,
  EmailIntro,
  EmailNote,
  emailFontFamily,
} from "./shared";
import { EMAIL_CONFIDENTIALITY, getPortalUrl } from "../lib/email/config";

export interface AnnouncementEmailProps {
  title: string;
  /** Email-safe HTML fragment derived from TipTap JSON (not stored). */
  bodyHtml: string;
  categoryLabel: string;
  typeLabel: string;
  publishedAtLabel: string;
  attachmentNames?: string[];
  ctaHref?: string;
}

export function AnnouncementEmail({
  title,
  bodyHtml,
  categoryLabel,
  typeLabel,
  publishedAtLabel,
  attachmentNames = [],
  ctaHref = getPortalUrl("/announcements"),
}: AnnouncementEmailProps) {
  return (
    <BrandedEmail
      preview={`${typeLabel}: ${title}`}
      eyebrow={`Internal Comms · ${categoryLabel} · ${typeLabel}`}
      heading={title}
      ctaLabel="Open in portal"
      ctaHref={ctaHref}
      disclaimer={EMAIL_CONFIDENTIALITY.body}
    >
      <EmailIntro>
        A new announcement was published for your team.
      </EmailIntro>
      <div
        style={bodyShell}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
      {attachmentNames.length > 0 ? (
        <div style={attachmentBox}>
          <Text style={attachmentHeading}>
            {attachmentNames.length === 1
              ? "Attachment"
              : "Attachments"}
          </Text>
          {attachmentNames.map((name) => (
            <Text key={name} style={attachmentItem}>
              {name}
            </Text>
          ))}
          <Text style={attachmentHint}>
            Files are attached to this email. You can also download them from
            the dashboard.
          </Text>
        </div>
      ) : null}
      <EmailNote>Published {publishedAtLabel}</EmailNote>
    </BrandedEmail>
  );
}

const bodyShell = {
  color: "#1C1C1C",
  fontFamily: emailFontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  width: "100%",
} as const;

const attachmentBox = {
  backgroundColor: "#F8F9FA",
  border: "1px solid #E3E8EF",
  borderRadius: "12px",
  margin: "0 0 16px",
  padding: "12px 14px",
};

const attachmentHeading = {
  color: "#171717",
  fontFamily: emailFontFamily,
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: "18px",
  margin: "0 0 8px",
};

const attachmentItem = {
  color: "#1C1C1C",
  fontFamily: emailFontFamily,
  fontSize: "13px",
  fontWeight: 500,
  lineHeight: "20px",
  margin: "0 0 4px",
};

const attachmentHint = {
  color: "#667085",
  fontFamily: emailFontFamily,
  fontSize: "12px",
  lineHeight: "18px",
  margin: "8px 0 0",
};

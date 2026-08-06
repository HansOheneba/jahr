import { Text } from "react-email";
import {
  BrandedEmail,
  EmailIntro,
  EmailNote,
  emailFontFamily,
} from "./shared";
import { getPortalUrl } from "../lib/email/config";

export interface AnnouncementEmailProps {
  title: string;
  body: string;
  publishedAtLabel: string;
}

export function AnnouncementEmail({
  title,
  body,
  publishedAtLabel,
}: AnnouncementEmailProps) {
  return (
    <BrandedEmail
      preview={title}
      eyebrow="Internal Comms"
      heading={title}
      ctaLabel="Open dashboard"
      ctaHref={getPortalUrl("/dashboard")}
    >
      <EmailIntro>
        A new announcement was published for your team.
      </EmailIntro>
      <Text style={bodyStyle}>{body}</Text>
      <EmailNote>Published {publishedAtLabel}</EmailNote>
    </BrandedEmail>
  );
}

const bodyStyle = {
  color: "#1C1C1C",
  fontFamily: emailFontFamily,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
  whiteSpace: "pre-wrap" as const,
};

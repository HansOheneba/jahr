import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import {
  EMAIL_BRAND,
  getEmailHandsUrl,
  getEmailLogoWhiteUrl,
} from "../lib/email/config";

export const emailFontFamily =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Georgia is the most widely installed serif, matching the signature tagline. */
const taglineFontFamily = 'Georgia, "Times New Roman", Times, serif';

export interface EmailDetailRow {
  label: string;
  value: string;
}

interface BrandedEmailProps {
  preview: string;
  eyebrow: string;
  heading: string;
  children: ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  logoUrl?: string;
  /** Confidentiality notice under the sign-off. */
  disclaimer?: string;
}

export function BrandedEmail({
  preview,
  eyebrow,
  heading,
  children,
  ctaLabel,
  ctaHref,
  logoUrl = getEmailLogoWhiteUrl(),
  disclaimer,
}: BrandedEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <style>{`
          @media only screen and (min-width: 600px) {
            .email-container {
              max-width: ${EMAIL_BRAND.contentWidthDesktop}px !important;
            }
            .email-body {
              padding-left: 32px !important;
              padding-right: 32px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body} className="email-body">
        <Container style={container} className="email-container">
          <Section style={brandBand}>
            <Row>
              <Column>
                <Img
                  src={logoUrl}
                  width={EMAIL_BRAND.logoWhiteWidth}
                  height={EMAIL_BRAND.logoWhiteHeight}
                  alt={EMAIL_BRAND.companyName}
                  style={brandLogo}
                />
              </Column>
              <Column style={brandEyebrowCell}>
                <Text style={brandEyebrow}>{eyebrow}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={card}>
            <Heading as="h1" style={headingStyle}>
              {heading}
            </Heading>

            {children}

            {ctaLabel && ctaHref ? (
              <Section style={ctaSection}>
                <Button href={ctaHref} style={ctaButton}>
                  {ctaLabel}
                </Button>
              </Section>
            ) : null}
          </Section>

          <Section style={signature}>
            <Row>
              <Column style={signatureImageCell}>
                <Img
                  src={getEmailHandsUrl()}
                  width={72}
                  height={72}
                  alt=""
                  style={signatureImage}
                />
              </Column>
              <Column>
                <Text style={signatureTagline}>{EMAIL_BRAND.tagline}</Text>
                <Text style={signatureMeta}>
                  {EMAIL_BRAND.companyName}
                  <br />
                  {EMAIL_BRAND.footerLine}
                </Text>
              </Column>
            </Row>
          </Section>

          {disclaimer ? (
            <Section style={disclaimerSection}>
              <Text style={disclaimerText}>{disclaimer}</Text>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export function EmailIntro({ children }: { children: ReactNode }) {
  return <Text style={intro}>{children}</Text>;
}

/** Small caps line under the heading, for category / type style context. */
export function EmailMeta({ children }: { children: ReactNode }) {
  return <Text style={meta}>{children}</Text>;
}

export function EmailDetails({ rows }: { rows: EmailDetailRow[] }) {
  return (
    <Section style={detailsCard}>
      {rows.map((row, index) => (
        <Section
          key={row.label}
          style={index === rows.length - 1 ? detailRowLast : detailRow}
        >
          <Text style={detailLabel}>{row.label}</Text>
          <Text style={detailValue}>{row.value}</Text>
        </Section>
      ))}
    </Section>
  );
}

export function EmailNote({ children }: { children: ReactNode }) {
  return <Text style={note}>{children}</Text>;
}

const body: CSSProperties = {
  backgroundColor: EMAIL_BRAND.background,
  fontFamily: emailFontFamily,
  margin: 0,
  padding: "32px 16px",
};

const container: CSSProperties = {
  margin: "0 auto",
  maxWidth: `${EMAIL_BRAND.contentWidth}px`,
  width: "100%",
};

const brandBand: CSSProperties = {
  backgroundColor: EMAIL_BRAND.navy,
  borderRadius: "12px 12px 0 0",
  padding: "20px 28px",
};

const brandLogo: CSSProperties = {
  display: "block",
  height: `${EMAIL_BRAND.logoWhiteHeight}px`,
  width: `${EMAIL_BRAND.logoWhiteWidth}px`,
};

const brandEyebrowCell: CSSProperties = {
  textAlign: "right",
  verticalAlign: "middle",
};

const brandEyebrow: CSSProperties = {
  color: EMAIL_BRAND.gold,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  lineHeight: "16px",
  margin: 0,
  textTransform: "uppercase",
};

const card: CSSProperties = {
  backgroundColor: EMAIL_BRAND.surface,
  borderLeft: `1px solid ${EMAIL_BRAND.border}`,
  borderRight: `1px solid ${EMAIL_BRAND.border}`,
  borderBottom: `1px solid ${EMAIL_BRAND.border}`,
  padding: "32px 28px",
};

const headingStyle: CSSProperties = {
  color: EMAIL_BRAND.text,
  fontSize: "24px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: "32px",
  margin: "0 0 12px",
};

const meta: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  lineHeight: "16px",
  margin: "0 0 20px",
  textTransform: "uppercase",
};

const intro: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const detailsCard: CSSProperties = {
  backgroundColor: EMAIL_BRAND.softSurface,
  border: `1px solid ${EMAIL_BRAND.border}`,
  borderRadius: "12px",
  margin: "0 0 24px",
  padding: "16px 18px",
};

const detailRow: CSSProperties = {
  borderBottom: `1px solid ${EMAIL_BRAND.border}`,
  margin: "0 0 12px",
  padding: "0 0 12px",
};

const detailRowLast: CSSProperties = {
  margin: 0,
  padding: 0,
};

const detailLabel: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  lineHeight: "16px",
  margin: "0 0 4px",
  textTransform: "uppercase",
};

const detailValue: CSSProperties = {
  color: EMAIL_BRAND.text,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "20px",
  margin: 0,
};

const note: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
};

const ctaSection: CSSProperties = {
  margin: "20px 0 0",
  textAlign: "center",
};

const ctaButton: CSSProperties = {
  backgroundColor: EMAIL_BRAND.navy,
  borderRadius: "6px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "20px",
  padding: "12px 20px",
  textDecoration: "none",
};

const signature: CSSProperties = {
  backgroundColor: EMAIL_BRAND.navy,
  borderRadius: "0 0 12px 12px",
  padding: "20px 28px",
};

const signatureImageCell: CSSProperties = {
  verticalAlign: "middle",
  width: "88px",
};

const signatureImage: CSSProperties = {
  borderRadius: "6px",
  display: "block",
  height: "72px",
  width: "72px",
};

const signatureTagline: CSSProperties = {
  color: EMAIL_BRAND.gold,
  fontFamily: taglineFontFamily,
  fontSize: "20px",
  lineHeight: "26px",
  margin: "0 0 6px",
};

const signatureMeta: CSSProperties = {
  color: EMAIL_BRAND.onNavyMuted,
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};

const disclaimerSection: CSSProperties = {
  padding: "20px 8px 0",
};

const disclaimerText: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "11px",
  lineHeight: "16px",
  margin: 0,
};

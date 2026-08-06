import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";
import {
  EMAIL_BRAND,
  getEmailLogoUrl,
  getPortalUrl,
} from "../lib/email/config";

export const emailFontFamily =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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
}

export function BrandedEmail({
  preview,
  eyebrow,
  heading,
  children,
  ctaLabel,
  ctaHref,
  logoUrl = getEmailLogoUrl(),
}: BrandedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              width={EMAIL_BRAND.logoWidth}
              height={EMAIL_BRAND.logoHeight}
              alt="JA Group"
              style={logo}
            />
          </Section>

          <Section style={card}>
            <Text style={eyebrowStyle}>{eyebrow}</Text>
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

            <Hr style={divider} />

            <Text style={portalHint}>
              Or open{" "}
              <Link href={getPortalUrl("/")} style={inlineLink}>
                {EMAIL_BRAND.productName}
              </Link>{" "}
              in your browser.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerBrand}>{EMAIL_BRAND.productName}</Text>
            <Text style={footerText}>
              {EMAIL_BRAND.companyName}
              <br />
              {EMAIL_BRAND.footerLine}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailIntro({ children }: { children: ReactNode }) {
  return <Text style={intro}>{children}</Text>;
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
  padding: "40px 16px",
};

const container: CSSProperties = {
  margin: "0 auto",
  maxWidth: "520px",
  width: "100%",
};

const header: CSSProperties = {
  padding: "0 8px 24px",
  textAlign: "center",
};

const logo: CSSProperties = {
  display: "block",
  height: `${EMAIL_BRAND.logoHeight}px`,
  margin: "0 auto",
  width: `${EMAIL_BRAND.logoWidth}px`,
};

const card: CSSProperties = {
  backgroundColor: EMAIL_BRAND.surface,
  border: `1px solid ${EMAIL_BRAND.border}`,
  borderRadius: "12px",
  padding: "32px 28px",
};

const eyebrowStyle: CSSProperties = {
  color: EMAIL_BRAND.accent,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  lineHeight: "16px",
  margin: "0 0 8px",
  textTransform: "uppercase",
};

const headingStyle: CSSProperties = {
  color: EMAIL_BRAND.text,
  fontSize: "24px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  lineHeight: "32px",
  margin: "0 0 12px",
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
  margin: "24px 0 0",
  textAlign: "center",
};

const ctaButton: CSSProperties = {
  backgroundColor: EMAIL_BRAND.text,
  borderRadius: "6px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "20px",
  padding: "12px 20px",
  textDecoration: "none",
};

const divider: CSSProperties = {
  borderColor: EMAIL_BRAND.border,
  borderTop: `1px solid ${EMAIL_BRAND.border}`,
  margin: "24px 0 16px",
};

const portalHint: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

const inlineLink: CSSProperties = {
  color: EMAIL_BRAND.accent,
  textDecoration: "underline",
};

const footer: CSSProperties = {
  padding: "24px 8px 0",
};

const footerBrand: CSSProperties = {
  color: EMAIL_BRAND.text,
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: "18px",
  margin: "0 0 4px",
  textAlign: "center",
};

const footerText: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  textAlign: "center",
};

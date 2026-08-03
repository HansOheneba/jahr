import type { CSSProperties } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";
import { EMAIL_BRAND, getEmailLogoUrl } from "../lib/email/config";

export interface LoginOtpEmailProps {
  displayName: string;
  code: string;
  expiresInMinutes?: number;
  logoUrl?: string;
}

const fontFamily =
  'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function LoginOtpEmail({
  displayName,
  code,
  expiresInMinutes = 10,
  logoUrl = getEmailLogoUrl(),
}: LoginOtpEmailProps) {
  const digits = code.replace(/\D/g, "").slice(0, 6).split("");
  const preview = `${code} is your JA Group HR sign-in code`;

  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              width={160}
              height={35}
              alt="JA Group"
              style={logo}
            />
          </Section>

          <Section style={card}>
            <Text style={eyebrow}>Sign in</Text>
            <Heading as="h1" style={heading}>
              Your one-time code
            </Heading>
            <Text style={intro}>
              Hi {displayName}, use this code to finish signing in to{" "}
              {EMAIL_BRAND.productName}.
            </Text>

            <Section style={codeSection}>
              <Row>
                {digits.map((digit, index) => (
                  <Column key={`${digit}-${index}`} style={digitColumn}>
                    <Text style={digitBox}>{digit}</Text>
                  </Column>
                ))}
              </Row>
            </Section>

            <Text style={expiry}>
              This code expires in{" "}
              <span style={expiryStrong}>{expiresInMinutes} minutes</span>.
            </Text>

            <Hr style={divider} />

            <Text style={securityNote}>
              If you didn&apos;t request this code, you can safely ignore this
              email. Someone else may have typed your address by mistake.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              {EMAIL_BRAND.productName}
              <br />
              Secure workplace access for JA Group teams.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default function LoginOtpEmailPreview() {
  return (
    <LoginOtpEmail displayName="Alex" code="482916" expiresInMinutes={10} />
  );
}

const body: CSSProperties = {
  backgroundColor: EMAIL_BRAND.background,
  fontFamily,
  margin: 0,
  padding: "40px 16px",
};

const container: CSSProperties = {
  margin: "0 auto",
  maxWidth: "480px",
  width: "100%",
};

const header: CSSProperties = {
  padding: "0 8px 24px",
  textAlign: "left",
};

const logo: CSSProperties = {
  display: "block",
  height: "35px",
  width: "160px",
};

const card: CSSProperties = {
  backgroundColor: EMAIL_BRAND.surface,
  border: `1px solid ${EMAIL_BRAND.border}`,
  borderRadius: "12px",
  padding: "32px 28px",
};

const eyebrow: CSSProperties = {
  color: EMAIL_BRAND.accent,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  lineHeight: "16px",
  margin: "0 0 8px",
  textTransform: "uppercase",
};

const heading: CSSProperties = {
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
  margin: "0 0 28px",
};

const codeSection: CSSProperties = {
  backgroundColor: EMAIL_BRAND.softSurface,
  border: `1px solid ${EMAIL_BRAND.border}`,
  borderRadius: "12px",
  margin: "0 0 20px",
  padding: "20px 12px",
};

const digitColumn: CSSProperties = {
  padding: "0 4px",
  width: `${100 / 6}%`,
};

const digitBox: CSSProperties = {
  backgroundColor: EMAIL_BRAND.surface,
  border: `1px solid ${EMAIL_BRAND.border}`,
  borderRadius: "6px",
  color: EMAIL_BRAND.text,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: "28px",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: "48px",
  margin: 0,
  textAlign: "center",
};

const expiry: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 24px",
  textAlign: "center",
};

const expiryStrong: CSSProperties = {
  color: EMAIL_BRAND.text,
  fontWeight: 600,
};

const divider: CSSProperties = {
  borderColor: EMAIL_BRAND.border,
  borderTop: `1px solid ${EMAIL_BRAND.border}`,
  margin: "0 0 20px",
};

const securityNote: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

const footer: CSSProperties = {
  padding: "24px 8px 0",
};

const footerText: CSSProperties = {
  color: EMAIL_BRAND.mutedText,
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  textAlign: "center",
};

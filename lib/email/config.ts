/**
 * Absolute origin for assets linked from transactional email (logo, etc.).
 * Prefer NEXT_PUBLIC_APP_URL in production so clients can load images.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getEmailLogoUrl(): string {
  return `${getAppBaseUrl()}/logos/JA_logo_black_text.png`;
}

export const EMAIL_BRAND = {
  productName: "JA Group TMS",
  background: "#F5F7FB",
  surface: "#FFFFFF",
  softSurface: "#FBFCFE",
  secondaryFill: "#EEF2F7",
  border: "#E3E8EF",
  text: "#171717",
  mutedText: "#667085",
  accent: "#0070F3",
} as const;

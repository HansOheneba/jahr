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

/** Public Supabase Storage path for the email header mark (`jalog.png`). */
export const EMAIL_LOGO_BUCKET = "branding";
export const EMAIL_LOGO_STORAGE_PATH = "emails/jalog.png";

/**
 * Hosted logo URL for email clients.
 * Emails cannot reliably load localhost / app-origin assets — use the public
 * Supabase object URL (override with EMAIL_LOGO_URL if needed).
 */
export function getEmailLogoUrl(): string {
  if (process.env.EMAIL_LOGO_URL) {
    return process.env.EMAIL_LOGO_URL;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${EMAIL_LOGO_BUCKET}/${EMAIL_LOGO_STORAGE_PATH}`;
  }

  return `${getAppBaseUrl()}/logos/jalog.png`;
}

export function getPortalUrl(path = "/"): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalised}`;
}

export const EMAIL_BRAND = {
  companyName: "JA Group",
  productName: "JA Group TMS",
  background: "#F5F7FB",
  surface: "#FFFFFF",
  softSurface: "#FBFCFE",
  secondaryFill: "#EEF2F7",
  border: "#E3E8EF",
  text: "#171717",
  mutedText: "#667085",
  accent: "#0070F3",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  footerLine: "People operations for JA Group teams.",
  /** Display size for the J.A mark in email headers (source is 300×180). */
  logoWidth: 100,
  logoHeight: 60,
} as const;

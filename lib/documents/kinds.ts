import type { DocumentKind } from "@/lib/types/employee";

/** Kinds an employee can upload for themselves. */
export const EMPLOYEE_UPLOAD_KINDS = [
  "cv",
  "id_card",
  "passport",
  "certificate",
  "tax_form",
  "other",
] as const satisfies readonly DocumentKind[];

/** Kinds typically uploaded by HR for an employee. */
export const HR_UPLOAD_KINDS = [
  "appointment_letter",
  "nda",
  "employment_contract",
  "offer_letter",
  "signed_policy",
  "tax_form",
  "other",
] as const satisfies readonly DocumentKind[];

export const ALL_UPLOAD_KINDS = [
  ...HR_UPLOAD_KINDS,
  ...EMPLOYEE_UPLOAD_KINDS.filter(
    (kind) => !(HR_UPLOAD_KINDS as readonly string[]).includes(kind),
  ),
] as const satisfies readonly DocumentKind[];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isDocumentKind(value: string): value is DocumentKind {
  return (
    value === "employment_contract" ||
    value === "offer_letter" ||
    value === "appointment_letter" ||
    value === "nda" ||
    value === "id_card" ||
    value === "passport" ||
    value === "cv" ||
    value === "certificate" ||
    value === "tax_form" ||
    value === "signed_policy" ||
    value === "payslip" ||
    value === "other"
  );
}

export function defaultTitleForKind(kind: DocumentKind): string {
  switch (kind) {
    case "cv":
      return "Curriculum Vitae";
    case "appointment_letter":
      return "Appointment letter";
    case "nda":
      return "Non-disclosure agreement";
    case "employment_contract":
      return "Employment contract";
    case "offer_letter":
      return "Offer letter";
    case "id_card":
      return "ID card";
    case "passport":
      return "Passport";
    case "certificate":
      return "Certificate";
    case "tax_form":
      return "Tax form";
    case "signed_policy":
      return "Signed policy";
    case "payslip":
      return "Payslip";
    default:
      return "Document";
  }
}

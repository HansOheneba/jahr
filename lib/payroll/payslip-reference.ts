import {
  encodeCrockford,
  type ReferenceAllocator,
} from "@/lib/payroll/payroll-number";

/** e.g. PS26-0100 */
export const PAYSLIP_REFERENCE_PATTERN = /^PS\d{2}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function formatPayslipReference(
  sequence: number,
  date: Date = new Date(),
): string {
  const yearSuffix = String(date.getFullYear() % 100).padStart(2, "0");
  return `PS${yearSuffix}-${encodeCrockford(sequence, 4)}`;
}

export async function allocatePayslipReference(
  admin: ReferenceAllocator,
  date: Date = new Date(),
): Promise<string> {
  const { data, error } = await admin.rpc("next_payslip_reference_seq");
  if (error || data === null || data === undefined) {
    throw new Error(error?.message ?? "Could not allocate a payslip reference.");
  }
  const sequence = Number(data);
  if (!Number.isFinite(sequence)) {
    throw new Error("Invalid payslip reference sequence returned from database.");
  }
  return formatPayslipReference(sequence, date);
}

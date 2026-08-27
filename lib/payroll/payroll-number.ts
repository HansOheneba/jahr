/** Crockford base32 — no I, L, O, or U (easy to read and type). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** e.g. JA26-0100 */
export const PAYROLL_NUMBER_PATTERN = /^JA\d{2}-[0-9A-HJKMNP-TV-Z]{4}$/;

export function encodeCrockford(value: number, minWidth = 4): string {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("Payroll sequence must be a non-negative number.");
  }
  if (value === 0) {
    return "0".padStart(minWidth, "0");
  }

  let n = Math.floor(value);
  let result = "";
  while (n > 0) {
    result = CROCKFORD[n % 32] + result;
    n = Math.floor(n / 32);
  }
  return result.padStart(minWidth, "0");
}

export function formatPayrollNumber(
  sequence: number,
  date: Date = new Date(),
): string {
  const yearSuffix = String(date.getFullYear() % 100).padStart(2, "0");
  return `JA${yearSuffix}-${encodeCrockford(sequence, 4)}`;
}

export function isPayrollNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  return PAYROLL_NUMBER_PATTERN.test(value.trim().toUpperCase());
}

/** Bare digits or legacy JA-0001 style — should be replaced on next allocation. */
export function needsPayrollNumber(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const trimmed = value.trim();
  if (/^\d{1,4}$/.test(trimmed)) return true;
  if (/^JA-\d+$/i.test(trimmed)) return true;
  return !isPayrollNumber(trimmed);
}

export async function nextPayrollSequence(
  admin: ReferenceAllocator,
): Promise<number> {
  const { data, error } = await admin.rpc("next_payroll_number_seq");
  if (error || data === null || data === undefined) {
    throw new Error(error?.message ?? "Could not allocate a payroll number.");
  }
  const sequence = Number(data);
  if (!Number.isFinite(sequence)) {
    throw new Error("Invalid payroll sequence returned from database.");
  }
  return sequence;
}

export async function allocatePayrollNumber(
  admin: ReferenceAllocator,
  date: Date = new Date(),
): Promise<string> {
  const sequence = await nextPayrollSequence(admin);
  return formatPayrollNumber(sequence, date);
}

export type ReferenceAllocator = {
  rpc: (
    fn: string,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

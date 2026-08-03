import type { PayLineKind, PayPackageLineInput } from "@/lib/payroll/types";

export function sumByKind(
  lines: Array<{ kind: PayLineKind; amount: number; active?: boolean }>,
  kind: PayLineKind,
): number {
  return lines
    .filter((line) => line.kind === kind && line.active !== false)
    .reduce((sum, line) => sum + Number(line.amount), 0);
}

export function computePayTotals(
  lines: Array<{ kind: PayLineKind; amount: number; active?: boolean }>,
): { grossPay: number; totalDeductions: number; netPay: number } {
  const grossPay = roundMoney(sumByKind(lines, "earning"));
  const totalDeductions = roundMoney(sumByKind(lines, "deduction"));
  return {
    grossPay,
    totalDeductions,
    netPay: roundMoney(grossPay - totalDeductions),
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number, currency = "GHS"): string {
  const formatted = value.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function withDefaultAmounts(
  lines: Array<Omit<PayPackageLineInput, "amount"> & { amount?: number }>,
  basicSalary: number | null,
): PayPackageLineInput[] {
  return lines.map((line) => ({
    ...line,
    amount:
      line.amount ??
      (line.code === "basic" && basicSalary !== null ? basicSalary : 0),
  }));
}

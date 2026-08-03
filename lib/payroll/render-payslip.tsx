import { renderToBuffer } from "@react-pdf/renderer";
import {
  getPayPackage,
  getPayslipSnapshot,
} from "@/lib/payroll/get-payroll";
import { PayslipDocument } from "@/lib/payroll/payslip-document";

export async function renderPayslipPdf(
  payslipId: string,
): Promise<{ buffer: Buffer; filename: string } | { error: string }> {
  const snapshot = await getPayslipSnapshot(payslipId);
  if (!snapshot) {
    return { error: "Payslip not found." };
  }

  const pack = await getPayPackage(snapshot.employee_id);
  if (!pack) {
    return { error: "Employee pay package not found." };
  }

  const buffer = await renderToBuffer(
    <PayslipDocument
      employee={pack.employee}
      periodLabel={snapshot.period_label}
      periodStart={snapshot.period_start}
      periodEnd={snapshot.period_end}
      currency={snapshot.currency}
      grossPay={snapshot.gross_pay}
      totalDeductions={snapshot.total_deductions}
      netPay={snapshot.net_pay}
      lines={snapshot.lines}
    />,
  );

  const safeName = pack.employee.full_name
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const monthKey = snapshot.period_start.slice(0, 7);
  const filename = `payslip-${safeName}-${monthKey}.pdf`;

  return { buffer: Buffer.from(buffer), filename };
}

import { renderToBuffer } from "@react-pdf/renderer";
import { snapshotContextToEmployeeContext } from "@/lib/payroll/capture-snapshot-context";
import {
  getPayPackage,
  getPayslipSnapshot,
} from "@/lib/payroll/get-payroll";
import { logPayslipDownload } from "@/lib/payroll/log-payslip-access";
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

  const employee = snapshot.snapshot_context
    ? snapshotContextToEmployeeContext(
        snapshot.snapshot_context,
        snapshot.employee_id,
      )
    : pack.employee;

  const buffer = await renderToBuffer(
    <PayslipDocument
      employee={employee}
      reference={snapshot.reference}
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

  await logPayslipDownload(
    snapshot.id,
    snapshot.employee_id,
    snapshot.reference,
    snapshot.period_label,
  );

  const safeName = employee.full_name
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const monthKey = snapshot.period_start.slice(0, 7);
  const refSuffix = snapshot.reference
    ? snapshot.reference.toLowerCase()
    : payslipId.slice(0, 8);
  const filename = `payslip-${safeName}-${monthKey}-${refSuffix}.pdf`;

  return { buffer: Buffer.from(buffer), filename };
}

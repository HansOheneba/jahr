import { NextResponse } from "next/server";
import { ensurePayslipSnapshot } from "@/lib/payroll/actions";
import { parsePeriodKey } from "@/lib/payroll/period";
import { renderPayslipPdf } from "@/lib/payroll/render-payslip";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isOrgAdmin } from "@/lib/types/database";

export async function GET(request: Request) {
  const viewer = await getCurrentProfile();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") ?? viewer.id;
  const periodKey = searchParams.get("period");

  if (!periodKey) {
    return NextResponse.json(
      { error: "Period is required (YYYY-MM)." },
      { status: 400 },
    );
  }

  if (employeeId !== viewer.id && !isOrgAdmin(viewer.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const period = parsePeriodKey(periodKey);
  if (!period) {
    return NextResponse.json({ error: "Invalid period." }, { status: 400 });
  }

  const ensured = await ensurePayslipSnapshot({ employeeId, period });
  if (ensured.error || !ensured.payslipId) {
    return NextResponse.json(
      { error: ensured.error ?? "Could not generate payslip." },
      { status: 400 },
    );
  }

  const result = await renderPayslipPdf(ensured.payslipId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

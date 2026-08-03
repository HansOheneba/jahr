import { NextResponse } from "next/server";
import { renderPayslipPdf } from "@/lib/payroll/render-payslip";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await renderPayslipPdf(id);

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

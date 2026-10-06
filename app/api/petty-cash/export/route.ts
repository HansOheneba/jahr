import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canAccessPettyCash } from "@/lib/auth/permissions";
import { ledgerExportFilename, ledgerToCsv } from "@/lib/petty-cash/csv";
import { getPettyCashBundle } from "@/lib/petty-cash/queries";
import { emptyFilters, filterLedger } from "@/lib/petty-cash/types";

export async function GET(request: Request) {
  const viewer = await getCurrentProfile();
  if (!viewer || !canAccessPettyCash(viewer)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = emptyFilters({
    q: url.searchParams.get("q") ?? undefined,
    fund: url.searchParams.get("fund") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    vendor: url.searchParams.get("vendor") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const bundle = await getPettyCashBundle();
  const rows = filterLedger(bundle.transactions, filters);
  const csv = ledgerToCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ledgerExportFilename(filters.from, filters.to)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { PayrollList } from "@/components/admin/payroll-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getFxRateTable } from "@/lib/fx/get-fx-rates";
import { getOrgSettings } from "@/lib/org/get-org-settings";
import { getPayrollEmployees } from "@/lib/payroll/get-payroll";
import { canManagePayroll } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function PayrollAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canManagePayroll(profile)) {
    redirect("/dashboard");
  }

  const [employees, orgSettings, rates] = await Promise.all([
    getPayrollEmployees(),
    getOrgSettings(),
    getFxRateTable(),
  ]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Pay packages, paying entity, and monthly cost by legal entity.
          </p>
        </div>
        <Link
          href="/admin/payroll/register"
          className={cn(buttonVariants())}
        >
          Payslip register
        </Link>
      </div>

      <PayrollList
        employees={employees}
        rates={rates}
        reportingCurrency={orgSettings.reportingCurrency}
      />
    </div>
  );
}

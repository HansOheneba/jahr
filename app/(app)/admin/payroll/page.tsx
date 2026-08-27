import Link from "next/link";
import { redirect } from "next/navigation";
import { PayrollList } from "@/components/admin/payroll-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayrollEmployees } from "@/lib/payroll/get-payroll";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function PayrollAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const employees = await getPayrollEmployees();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Set each employee’s pay package. Payslip PDFs generate on download.
          </p>
        </div>
        <Link
          href="/admin/payroll/register"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Payslip register
        </Link>
      </div>

      <PayrollList employees={employees} />
    </div>
  );
}

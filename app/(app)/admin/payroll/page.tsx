import { redirect } from "next/navigation";
import { PayrollList } from "@/components/admin/payroll-list";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayrollEmployees } from "@/lib/payroll/get-payroll";
import { isOrgAdmin } from "@/lib/types/database";

export default async function PayrollAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile.role)) {
    redirect("/dashboard");
  }

  const employees = await getPayrollEmployees();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground">
          Set each employee’s pay package. Payslip PDFs are generated on
          download - nothing is batch-created every month.
        </p>
      </div>

      <PayrollList employees={employees} />
    </div>
  );
}

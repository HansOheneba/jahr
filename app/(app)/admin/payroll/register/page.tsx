import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PayrollRegisterExplorer } from "@/components/admin/payroll-register-explorer";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayrollRegister } from "@/lib/payroll/get-payroll-register";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function PayrollRegisterPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const entries = await getPayrollRegister();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-3">
        <Link
          href="/admin/payroll"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Payroll
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Payslip register</h1>
          <p className="text-sm text-muted-foreground">
            Search by reference, employee, or period. Every generated payslip
            is locked for legal reference.
          </p>
        </div>
      </div>

      <PayrollRegisterExplorer entries={entries} />
    </div>
  );
}

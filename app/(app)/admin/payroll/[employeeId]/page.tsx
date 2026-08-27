import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PayPackageForm } from "@/components/admin/pay-package-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayPackage } from "@/lib/payroll/get-payroll";
import { ensureDefaultPayPackage } from "@/lib/payroll/ensure-package";
import { canManagePayroll } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function PayrollEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePayroll(profile)) {
    redirect("/dashboard");
  }

  const { employeeId } = await params;
  await ensureDefaultPayPackage(employeeId);
  const pack = await getPayPackage(employeeId);

  if (!pack) {
    notFound();
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight">
              {pack.employee.full_name}
            </h1>
            {pack.employee.employee_number ? (
              <Badge
                variant="outline"
                className="rounded-md font-mono text-[11px] font-normal"
              >
                {pack.employee.employee_number}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {pack.employee.job_title ?? "No title"}
            {pack.employee.department_name
              ? ` · ${pack.employee.department_name}`
              : ""}
          </p>
        </div>
      </div>

      <PayPackageForm pack={pack} />
    </div>
  );
}

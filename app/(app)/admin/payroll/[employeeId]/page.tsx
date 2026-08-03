import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PayPackageForm } from "@/components/admin/pay-package-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayPackage } from "@/lib/payroll/get-payroll";
import { ensureDefaultPayPackage } from "@/lib/payroll/ensure-package";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function PayrollEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !isOrgAdmin(profile.role)) {
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
          <h1 className="text-xl font-medium tracking-tight">
            {pack.employee.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit salary, statutory IDs, bank details, and payslip line items.
          </p>
        </div>
      </div>

      <PayPackageForm pack={pack} />
    </div>
  );
}

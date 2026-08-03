import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AddEmployeeForm } from "@/components/admin/add-employee-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getOrgOptionsForHire } from "@/lib/employees/actions";
import { isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function NewEmployeePage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile.role)) {
    redirect("/dashboard");
  }

  const org = await getOrgOptionsForHire();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="space-y-3">
        <Link
          href="/admin/employees"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Employees
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Add employee</h1>
          <p className="text-sm text-muted-foreground">
            Capture Ghana employment details - Ghana Card, SSNIT, TIN, and
            reporting line - before onboarding starts.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <AddEmployeeForm org={org} />
      </div>
    </div>
  );
}

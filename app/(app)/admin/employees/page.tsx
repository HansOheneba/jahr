import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { EmployeesList } from "@/components/admin/employees-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getDirectoryEmployees } from "@/lib/employees/get-directory";
import {
  canViewPeopleDirectory,
  isOrgAdmin,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function EmployeesAdminPage() {
  const profile = await getCurrentProfile();

  if (
    !profile ||
    !canViewPeopleDirectory(profile.role, profile.isManager)
  ) {
    redirect("/dashboard");
  }

  const canAdd = isOrgAdmin(profile.role);
  const employees = await getDirectoryEmployees({ allStatuses: canAdd });

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            {canAdd ? "Employees" : "My team"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canAdd
              ? "Directory, employment status, and quick links into each person's record."
              : "People who report to you - employment details for your team only."}
          </p>
        </div>
        {canAdd ? (
          <Link
            href="/admin/employees/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            <Plus className="size-3.5" />
            Add employee
          </Link>
        ) : null}
      </div>

      <EmployeesList employees={employees} canManagePay={canAdd} />
    </div>
  );
}

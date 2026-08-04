import { redirect } from "next/navigation";
import { EmployeesList } from "@/components/admin/employees-list";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getDirectoryEmployees } from "@/lib/employees/get-directory";
import {
  canViewPeopleDirectory,
  isOrgAdmin,
} from "@/lib/types/database";

export default async function AlumniAdminPage() {
  const profile = await getCurrentProfile();

  if (
    !profile ||
    !canViewPeopleDirectory(profile)
  ) {
    redirect("/dashboard");
  }

  const alumni = await getDirectoryEmployees({ status: "terminated" });
  const canManagePay = isOrgAdmin(profile);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Alumni</h1>
        <p className="text-sm text-muted-foreground">
          Past employees who have left JA Group. Use Offboard on an employee
          profile to move them here. They leave the active directory
          automatically.
        </p>
      </div>

      <EmployeesList employees={alumni} canManagePay={canManagePay} variant="alumni" />
    </div>
  );
}

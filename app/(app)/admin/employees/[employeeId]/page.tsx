import { notFound, redirect } from "next/navigation";
import { EmployeeProfile } from "@/components/admin/employee-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";
import { ensureDefaultPayPackage } from "@/lib/payroll/ensure-package";
import { getPayPackage } from "@/lib/payroll/get-payroll";
import {
  canViewPeopleDirectory,
  isOrgAdmin,
} from "@/lib/types/database";

export default async function EmployeeAdminPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const viewer = await getCurrentProfile();

  if (
    !viewer ||
    !canViewPeopleDirectory(viewer.role, viewer.isManager)
  ) {
    redirect("/dashboard");
  }

  const { employeeId } = await params;
  const record = await getEmployeeRecord(employeeId);

  if (!record) {
    notFound();
  }

  const admin = isOrgAdmin(viewer.role);
  let payPackage = null;

  if (admin) {
    await ensureDefaultPayPackage(employeeId);
    payPackage = await getPayPackage(employeeId);
  }

  return (
    <EmployeeProfile
      record={record}
      viewerId={viewer.id}
      payPackage={payPackage}
      isAdmin={admin}
    />
  );
}

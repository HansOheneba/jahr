import { notFound, redirect } from "next/navigation";
import { EmployeeProfile } from "@/components/admin/employee-profile";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";
import { getLegalEntityNames } from "@/lib/payroll/get-legal-entities";
import { ensureDefaultPayPackage } from "@/lib/payroll/ensure-package";
import { getPayPackage } from "@/lib/payroll/get-payroll";
import {
  canManagePayroll,
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
    (!canViewPeopleDirectory(viewer) && !canManagePayroll(viewer))
  ) {
    redirect("/dashboard");
  }

  const { employeeId } = await params;
  const record = await getEmployeeRecord(employeeId);

  if (!record) {
    notFound();
  }

  const admin = isOrgAdmin(viewer);
  const payrollAccess = canManagePayroll(viewer);
  let payPackage = null;
  let legalEntities: string[] = [];

  if (payrollAccess) {
    await ensureDefaultPayPackage(employeeId);
    [payPackage, legalEntities] = await Promise.all([
      getPayPackage(employeeId),
      getLegalEntityNames(),
    ]);
  }

  return (
    <EmployeeProfile
      record={record}
      viewerId={viewer.id}
      payPackage={payPackage}
      legalEntities={legalEntities}
      isAdmin={admin}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { PayrollRegisterDetail } from "@/components/admin/payroll-register-detail";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPayslipSnapshot } from "@/lib/payroll/get-payroll";
import { canManagePayroll } from "@/lib/types/database";

export default async function PayrollRegisterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePayroll(profile)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const snapshot = await getPayslipSnapshot(id);
  if (!snapshot) {
    notFound();
  }

  return <PayrollRegisterDetail snapshot={snapshot} />;
}

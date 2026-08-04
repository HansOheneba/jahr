import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditEmployeeForm } from "@/components/admin/edit-employee-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getOrgOptionsForHire } from "@/lib/employees/actions";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";
import { displayName, isOrgAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const viewer = await getCurrentProfile();
  if (!viewer || !isOrgAdmin(viewer)) {
    redirect("/dashboard");
  }

  const { employeeId } = await params;
  const [record, org] = await Promise.all([
    getEmployeeRecord(employeeId),
    getOrgOptionsForHire(),
  ]);

  if (!record) {
    notFound();
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-3">
        <Link
          href={`/admin/employees/${employeeId}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit px-0 hover:bg-transparent",
          )}
        >
          <ArrowLeft className="size-4" />
          Back to profile
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            Edit {displayName(record.profile)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Amend employment, immigration, and contact details.
          </p>
        </div>
      </div>

      <EditEmployeeForm record={record} org={org} viewer={viewer} />
    </div>
  );
}

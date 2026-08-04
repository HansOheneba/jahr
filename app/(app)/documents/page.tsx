import { redirect } from "next/navigation";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";
import { isOrgAdmin } from "@/lib/types/database";

export default async function DocumentsPage() {
  const viewer = await getCurrentProfile();
  const record = await getEmployeeRecord();

  if (!viewer || !record) {
    redirect("/login");
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Contracts, IDs, certificates, and on-demand payslip PDFs.
        </p>
      </div>

      <DocumentsPanel
        employeeId={record.profile.id}
        viewerId={viewer.id}
        documents={record.documents}
        payslips={record.payslips}
        canManageHrDocs={isOrgAdmin(viewer)}
        employmentStartDate={record.profile.start_date}
        hasPayPackage={record.hasPayPackage}
      />
    </div>
  );
}

import { DocumentsManager } from "@/components/documents/documents-manager";
import { PayslipsPanel } from "@/components/payroll/payslips-panel";
import type { EmployeeDocument, PayslipRecord } from "@/lib/types/employee";

export function DocumentsPanel({
  employeeId,
  viewerId,
  documents,
  payslips,
  canManageHrDocs = false,
  employmentStartDate = null,
  hasPayPackage = false,
}: {
  employeeId: string;
  viewerId: string;
  documents: EmployeeDocument[];
  payslips: PayslipRecord[];
  canManageHrDocs?: boolean;
  employmentStartDate?: string | null;
  hasPayPackage?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DocumentsManager
        employeeId={employeeId}
        viewerId={viewerId}
        documents={documents}
        canManageHrDocs={canManageHrDocs}
      />

      <PayslipsPanel
        employeeId={employeeId}
        payslips={payslips}
        canGenerate
        employmentStartDate={employmentStartDate}
        hasPayPackage={hasPayPackage}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import {
  FormPageCard,
  FormPageShell,
} from "@/components/layout/form-page-shell";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";

export default async function SettingsPage() {
  const record = await getEmployeeRecord();

  if (!record) {
    redirect("/login");
  }

  return (
    <FormPageShell width="sm">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your photo, name, and contact details.
        </p>
      </div>

      <FormPageCard>
        <SettingsForm profile={record.profile} />
      </FormPageCard>
    </FormPageShell>
  );
}

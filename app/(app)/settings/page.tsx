import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/settings-form";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";

export default async function SettingsPage() {
  const record = await getEmployeeRecord();

  if (!record) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your photo, name, and contact details.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <SettingsForm profile={record.profile} />
      </div>
    </div>
  );
}

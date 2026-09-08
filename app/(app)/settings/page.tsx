import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormPageShell } from "@/components/layout/form-page-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getReportingLineContext } from "@/lib/employees/get-reporting-context";
import { getEmployeeRecord } from "@/lib/employees/get-employee-record";

type SettingsTab = "general" | "team";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: SettingsTab = tab === "team" ? "team" : "general";

  const [record, teamContext] = await Promise.all([
    getEmployeeRecord(),
    getReportingLineContext(),
  ]);

  if (!record || !teamContext) {
    redirect("/login");
  }

  return (
    <FormPageShell width="xl">
      <div
        className="flex min-h-[min(520px,calc(100svh-14rem))] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card"
      >
        <Suspense>
          <SettingsWorkspace
            profile={record.profile}
            teamContext={teamContext}
            initialTab={initialTab}
          />
        </Suspense>
      </div>
    </FormPageShell>
  );
}

import { redirect } from "next/navigation";
import {
  PettyCashSettingsConsole,
  type SettingsArea,
} from "@/components/petty-cash/settings-console";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canManagePettyCash } from "@/lib/auth/permissions";
import { getPettyCashBundle } from "@/lib/petty-cash/queries";

function settingsArea(value: string | undefined): SettingsArea {
  if (value === "policy" || value === "categories" || value === "vendors") return value;
  return "funds";
}

export default async function PettyCashSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePettyCash(profile)) {
    redirect("/operations/petty-cash");
  }

  const [{ area }, bundle] = await Promise.all([searchParams, getPettyCashBundle()]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Petty cash settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage funds, policies, categories and vendors.
        </p>
      </div>
      <PettyCashSettingsConsole
        bundle={bundle}
        viewerId={profile.id}
        area={settingsArea(area)}
      />
    </div>
  );
}

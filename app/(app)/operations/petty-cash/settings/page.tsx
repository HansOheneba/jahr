import { redirect } from "next/navigation";
import { PettyCashSettingsForm } from "@/components/petty-cash/settings-form";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canManagePettyCash } from "@/lib/auth/permissions";
import { getPettyCashBundle } from "@/lib/petty-cash/queries";

export default async function PettyCashSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || !canManagePettyCash(profile)) {
    redirect("/operations/petty-cash");
  }

  const bundle = await getPettyCashBundle();

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Petty cash settings</h1>
        <p className="text-sm text-muted-foreground">
          Funds, limits, categories, and vendors.
        </p>
      </div>
      <PettyCashSettingsForm bundle={bundle} viewerId={profile.id} />
    </div>
  );
}

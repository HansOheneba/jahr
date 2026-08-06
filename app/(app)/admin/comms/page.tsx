import { redirect } from "next/navigation";
import { CommsComposerForm } from "@/components/admin/comms-composer-form";
import { getCommsBusinessUnits } from "@/lib/announcements/actions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";

export default async function CommsAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canPublishComms(profile)) {
    redirect("/dashboard");
  }

  const businessUnits = await getCommsBusinessUnits();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Comms</h1>
        <p className="text-sm text-muted-foreground">
          Publish internal announcements by business unit and work type. Everyone
          in the audience gets the email and sees it on their dashboard.
        </p>
      </div>

      <CommsComposerForm businessUnits={businessUnits} />
    </div>
  );
}

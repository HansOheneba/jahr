import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { CommsList } from "@/components/admin/comms-list";
import { buttonVariants } from "@/components/ui/button";
import { getCommsBusinessUnits } from "@/lib/announcements/actions";
import { getAnnouncementHistory } from "@/lib/announcements/get-history";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export default async function CommsAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canPublishComms(profile)) {
    redirect("/dashboard");
  }

  const [businessUnits, history] = await Promise.all([
    getCommsBusinessUnits(),
    getAnnouncementHistory(50),
  ]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            Internal comms
          </h1>
          <p className="text-sm text-muted-foreground">
            Everything sent to the company. Reuse a past announcement to send it
            again.
          </p>
        </div>
        <Link
          href="/admin/comms/new"
          className={cn(buttonVariants(), "shrink-0 self-start")}
        >
          <Plus />
          New announcement
        </Link>
      </div>

      <CommsList items={history} businessUnits={businessUnits} />
    </div>
  );
}

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
          <h1 className="text-2xl font-semibold tracking-tight text-[#1F1F1F]">
            Comms
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-[#444746]">
            Sent internal announcements. Open one in the editor to tweak and
            send again, or create a new communique.
          </p>
        </div>
        <Link
          href="/admin/comms/new"
          className={cn(buttonVariants(), "shrink-0 gap-2 self-start")}
        >
          <Plus className="size-4" />
          New announcement
        </Link>
      </div>

      <CommsList items={history} businessUnits={businessUnits} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { FeedbackInbox } from "@/components/admin/feedback-inbox";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getAllSupportRequests } from "@/lib/support/get-requests";
import { isOrgAdmin } from "@/lib/types/database";

export default async function FeedbackInboxPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const requests = await getAllSupportRequests();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Feedback inbox</h1>
        <p className="text-sm text-muted-foreground">
          Ideas and bug reports from your team.
        </p>
      </div>

      <FeedbackInbox requests={requests} />
    </div>
  );
}

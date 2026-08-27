import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CommsComposerForm } from "@/components/admin/comms-composer-form";
import { FormPageShell } from "@/components/layout/form-page-shell";
import { getCommsBusinessUnits } from "@/lib/announcements/actions";
import {
  getAnnouncementForCompose,
} from "@/lib/announcements/get-history";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canPublishComms } from "@/lib/auth/permissions";
import { getDirectoryEmployees } from "@/lib/employees/get-directory";
import { displayName } from "@/lib/types/database";

interface CommsNewPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function CommsNewPage({ searchParams }: CommsNewPageProps) {
  const profile = await getCurrentProfile();

  if (!profile || !canPublishComms(profile)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const fromId = typeof params.from === "string" ? params.from : "";

  const [businessUnits, directory, source] = await Promise.all([
    getCommsBusinessUnits(),
    getDirectoryEmployees({ excludeTerminated: true }),
    fromId ? getAnnouncementForCompose(fromId) : Promise.resolve(null),
  ]);

  const mentionCandidates = directory.map((employee) => ({
    id: employee.id,
    label: displayName(employee),
    avatarUrl: employee.avatar_url,
    jobTitle: employee.job_title,
  }));

  const initialDraft = source
    ? {
        title: source.title,
        category: source.category,
        announcementType: source.announcementType,
        bodyJson: source.bodyJson,
        businessUnitIds: source.audienceBusinessUnitIds,
        workTypes: source.audienceWorkTypes,
      }
    : null;

  return (
    <FormPageShell width="full">
      <div className="space-y-3">
        <Link
          href="/admin/comms"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All announcements
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            {initialDraft ? "Edit & send" : "New announcement"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {initialDraft
              ? "Publishing creates a new dashboard post and emails the audience again."
              : "Goes out by email and to the dashboard feed."}
          </p>
        </div>
      </div>

      <CommsComposerForm
        businessUnits={businessUnits}
        mentionCandidates={mentionCandidates}
        initialDraft={initialDraft}
      />
    </FormPageShell>
  );
}

import { redirect } from "next/navigation";
import { WorkforceInsightsView } from "@/components/admin/workforce-insights";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getWorkforceInsights } from "@/lib/employees/get-workforce-insights";
import { canViewPeopleDirectory, isOrgAdmin } from "@/lib/types/database";

export default async function WorkforceInsightsPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canViewPeopleDirectory(profile)) {
    redirect("/dashboard");
  }

  const insights = await getWorkforceInsights();

  return (
    <WorkforceInsightsView
      insights={insights}
      showPayroll={isOrgAdmin(profile)}
    />
  );
}

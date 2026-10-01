import { redirect } from "next/navigation";
import { OrganisationOverview } from "@/components/admin/organisation-overview";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getOrganisationStructure } from "@/lib/organisation/get-structure";
import { isOrgAdmin } from "@/lib/types/database";

export default async function OrganisationPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const structure = await getOrganisationStructure();

  return <OrganisationOverview structure={structure} />;
}

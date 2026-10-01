import { notFound, redirect } from "next/navigation";
import { OrganisationUnitDetail } from "@/components/admin/organisation-unit-detail";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getOrganisationUnit } from "@/lib/organisation/get-structure";
import { isOrgAdmin } from "@/lib/types/database";

export default async function OrganisationUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const { unitId } = await params;
  const unit = await getOrganisationUnit(unitId);

  if (!unit) {
    notFound();
  }

  return <OrganisationUnitDetail unit={unit} />;
}

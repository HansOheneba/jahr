import { redirect } from "next/navigation";
import { PermitWatchlist } from "@/components/admin/permit-watchlist";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPermitWatchlist } from "@/lib/employees/get-permit-watchlist";
import { isOrgAdmin } from "@/lib/types/database";

export default async function PermitsAdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const people = await getPermitWatchlist();

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Work permits</h1>
        <p className="text-sm text-muted-foreground">
          Track permit expiry across the group. Add expiry dates on each
          employee&apos;s IDs &amp; immigration section — expired and near-term
          dates surface first here.
        </p>
      </div>

      <PermitWatchlist people={people} />
    </div>
  );
}

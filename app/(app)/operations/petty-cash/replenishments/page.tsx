import { redirect } from "next/navigation";
import { ReplenishPanel } from "@/components/petty-cash/replenish-panel";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canManagePettyCash } from "@/lib/auth/permissions";
import { getPettyCashBundle, getReplenishments } from "@/lib/petty-cash/queries";

export default async function ReplenishmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/dashboard");

  const { fund = "" } = await searchParams;
  const [bundle, rows] = await Promise.all([
    getPettyCashBundle(),
    getReplenishments(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Replenishments</h1>
        <p className="text-sm text-muted-foreground">
          Top a fund back up to its target float.
        </p>
      </div>
      <ReplenishPanel
        funds={bundle.funds}
        rows={rows}
        canManage={canManagePettyCash(profile)}
        viewerId={profile.id}
        initialFundId={fund}
      />
    </div>
  );
}

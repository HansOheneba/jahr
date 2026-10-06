import { redirect } from "next/navigation";
import { ReconcilePanel } from "@/components/petty-cash/reconcile-panel";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { canManagePettyCash } from "@/lib/auth/permissions";
import { getPettyCashBundle, getReconciliations } from "@/lib/petty-cash/queries";

export default async function ReconciliationsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/dashboard");

  const { fund = "" } = await searchParams;
  const [bundle, rows] = await Promise.all([
    getPettyCashBundle(),
    getReconciliations(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Reconciliations</h1>
        <p className="text-sm text-muted-foreground">
          Compare the ledger balance with the cash on hand.
        </p>
      </div>
      <ReconcilePanel
        funds={bundle.funds}
        rows={rows}
        canManage={canManagePettyCash(profile)}
        viewerId={profile.id}
        initialFundId={fund}
      />
    </div>
  );
}

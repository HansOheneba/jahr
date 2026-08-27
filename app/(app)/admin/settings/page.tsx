import { redirect } from "next/navigation";
import { OrgSettingsForm } from "@/components/admin/org-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { formatRatesUpdated } from "@/lib/fx/format";
import { getFxRateTable } from "@/lib/fx/get-fx-rates";
import { getOrgSettings } from "@/lib/org/get-org-settings";
import { REPORTING_CURRENCIES } from "@/lib/payroll/currencies";
import { isOrgAdmin } from "@/lib/types/database";

const RATE_FORMAT = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const SOURCE_LABELS: Record<string, string> = {
  api: "Daily rate feed",
  manual: "Entered manually",
};

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();

  if (!profile || !isOrgAdmin(profile)) {
    redirect("/dashboard");
  }

  const [settings, rates] = await Promise.all([
    getOrgSettings(),
    getFxRateTable(),
  ]);

  const ratesUpdated = formatRatesUpdated(rates.updatedAt);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <h1 className="text-xl font-medium tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organisation</CardTitle>
          <CardDescription>
            Payroll summaries convert into this currency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm reportingCurrency={settings.reportingCurrency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Exchange rates</CardTitle>
          <CardDescription>
            Pulled daily and stored with history, so past payslips keep the rate
            they were priced at.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {REPORTING_CURRENCIES.map((code) => {
              const entry = rates.entries[code];

              return (
                <li
                  key={code}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                >
                  <span className="text-sm tabular-nums">
                    {entry
                      ? `1 ${rates.base} = ${RATE_FORMAT.format(entry.rate)} ${code}`
                      : `${code} has no rate on file`}
                  </span>
                  {entry ? (
                    <span className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[entry.source] ?? entry.source} ·{" "}
                      {entry.effectiveDate}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            {ratesUpdated
              ? `Rates last updated ${ratesUpdated}`
              : "No exchange rates on file"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

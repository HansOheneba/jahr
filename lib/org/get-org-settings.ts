import { cookies } from "next/headers";
import {
  DEFAULT_REPORTING_CURRENCY,
  isReportingCurrency,
  type ReportingCurrency,
} from "@/lib/payroll/currencies";
import { createClient } from "@/utils/supabase/server";

export interface OrgSettings {
  /** Currency every summary total is converted into. */
  reportingCurrency: ReportingCurrency;
  updatedAt: string | null;
}

const FALLBACK_SETTINGS: OrgSettings = {
  reportingCurrency: DEFAULT_REPORTING_CURRENCY,
  updatedAt: null,
};

export async function getOrgSettings(): Promise<OrgSettings> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("org_settings")
    .select("reporting_currency, updated_at")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getOrgSettings]", error.message);
    return FALLBACK_SETTINGS;
  }

  return {
    reportingCurrency: isReportingCurrency(data.reporting_currency)
      ? data.reporting_currency
      : DEFAULT_REPORTING_CURRENCY,
    updatedAt: data.updated_at,
  };
}

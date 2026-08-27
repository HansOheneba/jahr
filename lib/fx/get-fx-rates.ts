import { cookies } from "next/headers";
import { EMPTY_FX_RATE_TABLE, FX_BASE_CURRENCY } from "@/lib/fx/convert";
import type { FxRateEntry, FxRateSource, FxRateTable } from "@/lib/fx/types";
import { createClient } from "@/utils/supabase/server";

interface LatestRateRow {
  target_currency: string;
  rate: number | string;
  source: string;
  effective_date: string;
  fetched_at: string;
}

function maxValue(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((latest, value) => (value > latest ? value : latest));
}

/**
 * Most recent rate per currency. The daily pull only inserts, so a failed job
 * leaves the previous rates in place rather than blanking the table.
 */
export async function getFxRateTable(): Promise<FxRateTable> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("fx_rates_latest")
    .select("target_currency, rate, source, effective_date, fetched_at");

  if (error || !data) {
    if (error) console.error("[getFxRateTable]", error.message);
    return EMPTY_FX_RATE_TABLE;
  }

  const rows = data as LatestRateRow[];
  const entries: Record<string, FxRateEntry> = {};

  for (const row of rows) {
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0) continue;

    entries[row.target_currency] = {
      rate,
      source: row.source as FxRateSource,
      effectiveDate: row.effective_date,
      fetchedAt: row.fetched_at,
    };
  }

  const values = Object.values(entries);

  return {
    base: FX_BASE_CURRENCY,
    entries,
    effectiveDate: maxValue(values.map((entry) => entry.effectiveDate)),
    updatedAt: maxValue(values.map((entry) => entry.fetchedAt)),
  };
}

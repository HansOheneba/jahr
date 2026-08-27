import type { FxConversion, FxRateEntry, FxRateTable } from "@/lib/fx/types";

/** Rates are stored as base -> target. Must match public.fx_base_currency(). */
export const FX_BASE_CURRENCY = "USD";

export const EMPTY_FX_RATE_TABLE: FxRateTable = {
  base: FX_BASE_CURRENCY,
  entries: {},
  effectiveDate: null,
  updatedAt: null,
};

export function normaliseCurrency(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

function earlierDate(left: string, right: string): string {
  return left <= right ? left : right;
}

function identityConversion(entry: FxRateEntry | undefined): FxConversion {
  return {
    rate: 1,
    effectiveDate: entry?.effectiveDate ?? null,
    // A currency against itself is 1 by definition, not a quoted rate.
    source: entry?.source ?? "manual",
  };
}

/**
 * Cross rate from one currency to another. Returns null when either side is
 * missing a rate, so callers can flag the gap instead of dropping money.
 */
export function resolveFxConversion(
  from: string,
  to: string,
  table: FxRateTable,
): FxConversion | null {
  const source = normaliseCurrency(from);
  const target = normaliseCurrency(to);
  const fromEntry = table.entries[source];
  const toEntry = table.entries[target];

  if (source === target) {
    return identityConversion(fromEntry ?? toEntry);
  }

  if (!fromEntry || !toEntry || fromEntry.rate <= 0) {
    return null;
  }

  return {
    rate: toEntry.rate / fromEntry.rate,
    effectiveDate: earlierDate(fromEntry.effectiveDate, toEntry.effectiveDate),
    source:
      fromEntry.source === "manual" || toEntry.source === "manual"
        ? "manual"
        : "api",
  };
}

/** Converted amount, or null when no rate covers the pair. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  table: FxRateTable,
): number | null {
  const conversion = resolveFxConversion(from, to, table);
  if (!conversion) return null;
  return amount * conversion.rate;
}

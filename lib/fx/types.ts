export type FxRateSource = "manual" | "api";

/** One currency's rate against {@link FX_BASE_CURRENCY}. */
export interface FxRateEntry {
  rate: number;
  source: FxRateSource;
  effectiveDate: string;
  fetchedAt: string;
}

/**
 * The latest rate per currency. Rates are stored against a single base so one
 * daily pull covers every pair, and any pair is derived as a cross rate.
 */
export interface FxRateTable {
  base: string;
  entries: Record<string, FxRateEntry>;
  /** Newest effective date across the table. */
  effectiveDate: string | null;
  /** Newest fetch timestamp across the table, shown as "rates last updated". */
  updatedAt: string | null;
}

/** The rate actually applied to a conversion, and where it came from. */
export interface FxConversion {
  rate: number;
  effectiveDate: string | null;
  source: FxRateSource;
}

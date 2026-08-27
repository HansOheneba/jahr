import { resolveFxConversion } from "@/lib/fx/convert";
import type { FxRateSource, FxRateTable } from "@/lib/fx/types";

/** Column values written once, when the payslip is generated. */
export interface PayslipFxLock {
  fx_reporting_currency: string;
  fx_rate: number;
  fx_rate_effective_date: string;
  fx_rate_source: FxRateSource;
}

/**
 * Freezes the rate a payslip was priced at so the month never reprices when
 * fx_rates is updated later. Returns null when no rate is on file, in which
 * case payroll still runs and the payslip is simply left unconverted.
 */
export function buildPayslipFxLock(
  payslipCurrency: string,
  reportingCurrency: string,
  rates: FxRateTable,
): PayslipFxLock | null {
  const conversion = resolveFxConversion(
    payslipCurrency,
    reportingCurrency,
    rates,
  );

  if (!conversion?.effectiveDate) return null;

  return {
    fx_reporting_currency: reportingCurrency,
    fx_rate: conversion.rate,
    fx_rate_effective_date: conversion.effectiveDate,
    fx_rate_source: conversion.source,
  };
}

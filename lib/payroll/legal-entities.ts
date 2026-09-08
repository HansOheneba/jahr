/** Fallback list when the database table is unavailable or empty. */
export const DEFAULT_LEGAL_ENTITIES = [
  "JKA Holdings",
  "Celerey Inc.",
  "HarryHill Consulting Limited",
  "JA Wealth Advisors Limited",
  "JA Financial Advisors Limited",
  "JA Capital Partners Limited",
  "Portfolio Planners Limited",
  "JA Elements Ghana Limited",
  "Collins and Cooper Limited",
] as const;

export function isPersistedLegalEntity(id: string): boolean {
  return !id.startsWith("fallback-");
}

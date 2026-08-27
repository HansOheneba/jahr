export const LEGAL_ENTITIES = [
  "JKA Holdings",
  "Celerey Inc.",
  "JA Wealth Advisors Limited",
  "JA Financial Advisors Limited",
  "JA Capital Partners Limited",
  "Portfolio Planners Limited",
  "JA Elements Ghana Limited",
] as const;

export type LegalEntity = (typeof LEGAL_ENTITIES)[number];

export function isLegalEntity(value: string): value is LegalEntity {
  return (LEGAL_ENTITIES as readonly string[]).includes(value);
}

import cc from "currency-codes";
import getSymbolFromCurrency from "currency-symbol-map";

export const DEFAULT_CURRENCY = "GHS";

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

const PRIORITY_CODES = ["GHS", "USD", "GBP", "EUR"] as const;

function buildCurrencyOption(code: string): CurrencyOption | null {
  const record = cc.code(code);
  if (!record) return null;

  const symbol = getSymbolFromCurrency(code) ?? code;
  return {
    code: record.code,
    name: record.currency,
    symbol,
  };
}

export const CURRENCY_OPTIONS: CurrencyOption[] = (() => {
  const seen = new Set<string>();
  const options: CurrencyOption[] = [];

  for (const code of PRIORITY_CODES) {
    const option = buildCurrencyOption(code);
    if (option) {
      options.push(option);
      seen.add(code);
    }
  }

  const rest = cc
    .codes()
    .filter((code) => !seen.has(code))
    .map(buildCurrencyOption)
    .filter((option): option is CurrencyOption => option !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...options, ...rest];
})();

const currencyByCode = new Map(
  CURRENCY_OPTIONS.map((option) => [option.code, option]),
);

export function getCurrencyOption(code: string): CurrencyOption | undefined {
  return currencyByCode.get(code.toUpperCase());
}

export function formatCurrencyLabel(code: string): string {
  const option = getCurrencyOption(code);
  if (!option) return code;
  return `${option.code} · ${option.symbol} · ${option.name}`;
}

export function formatCurrencyTrigger(code: string): string {
  const option = getCurrencyOption(code);
  if (!option) return code;
  return `${option.symbol} ${option.code}`;
}

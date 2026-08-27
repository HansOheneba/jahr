// Fixed locale and zone so the server and client render the same string.
// Accra is GMT year-round, so UTC is also the local reading.
const RATES_UPDATED_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatRatesUpdated(
  isoTimestamp: string | null,
): string | null {
  if (!isoTimestamp) return null;

  const value = new Date(isoTimestamp);
  if (Number.isNaN(value.getTime())) return null;

  return RATES_UPDATED_FORMAT.format(value);
}

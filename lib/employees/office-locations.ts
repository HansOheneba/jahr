export const OFFICE_LOCATIONS = [
  "Accra HQ",
  "London",
  "Geneva",
  "Cayman Islands",
  "Realty — Offsite",
  "Elements — Offsite",
] as const;

export type OfficeLocation = (typeof OFFICE_LOCATIONS)[number];

export function isOfficeLocation(value: string): value is OfficeLocation {
  return (OFFICE_LOCATIONS as readonly string[]).includes(value);
}

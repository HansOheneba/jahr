export const IMMIGRATION_STATUSES = [
  "citizen",
  "permanent_resident",
  "work_permit",
  "other",
] as const;

export type ImmigrationStatus = (typeof IMMIGRATION_STATUSES)[number];

export const IMMIGRATION_STATUS_LABELS: Record<ImmigrationStatus, string> = {
  citizen: "Citizen",
  permanent_resident: "Permanent resident",
  work_permit: "Work permit",
  other: "Other",
};

export function isImmigrationStatus(
  value: string,
): value is ImmigrationStatus {
  return (IMMIGRATION_STATUSES as readonly string[]).includes(value);
}

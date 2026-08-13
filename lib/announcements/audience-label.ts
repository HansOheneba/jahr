import type { AnnouncementHistoryItem } from "@/lib/announcements/get-history";
import type { WorkType } from "@/lib/types/employee";

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function describeAnnouncementAudience(
  item: Pick<
    AnnouncementHistoryItem,
    "audienceBusinessUnitIds" | "audienceWorkTypes"
  >,
  businessUnits: Array<{ id: string; name: string }>,
): string {
  const unitNames =
    item.audienceBusinessUnitIds.length === 0
      ? []
      : businessUnits
          .filter((unit) => item.audienceBusinessUnitIds.includes(unit.id))
          .map((unit) => unit.name);

  const workLabels = item.audienceWorkTypes.map((type: WorkType) => type);

  if (unitNames.length === 0 && workLabels.length === 0) {
    return "Everyone";
  }

  const parts: string[] = [];
  if (unitNames.length > 0) {
    parts.push(joinNames(unitNames));
  } else {
    parts.push("All units");
  }
  if (workLabels.length > 0) {
    parts.push(workLabels.join(" · "));
  }
  return parts.join(" · ");
}

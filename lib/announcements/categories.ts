export const ANNOUNCEMENT_TAXONOMY = [
  {
    id: "people",
    label: "People",
    types: [
      { id: "new_hire", label: "New Hire" },
      { id: "promotion", label: "Promotion" },
      { id: "role_change", label: "Role Change" },
      { id: "exit", label: "Exit" },
      { id: "retirement", label: "Retirement" },
    ],
  },
  {
    id: "company",
    label: "Company",
    types: [
      { id: "general_update", label: "General Update" },
      { id: "milestone", label: "Milestone" },
      { id: "strategy", label: "Strategy" },
      { id: "leadership", label: "Leadership" },
    ],
  },
  {
    id: "events",
    label: "Events",
    types: [
      { id: "town_hall", label: "Town Hall" },
      { id: "retreat", label: "Retreat" },
      { id: "training", label: "Training" },
      { id: "social_event", label: "Social Event" },
    ],
  },
  {
    id: "hr_policy",
    label: "HR & Policy",
    types: [
      { id: "policy_update", label: "Policy Update" },
      { id: "benefits", label: "Benefits" },
      { id: "payroll", label: "Payroll" },
      { id: "performance_review", label: "Performance Review" },
    ],
  },
  {
    id: "leave",
    label: "Leave",
    types: [
      { id: "employee_leave", label: "Employee Leave" },
      { id: "return_from_leave", label: "Return from Leave" },
      { id: "holiday", label: "Holiday" },
    ],
  },
  {
    id: "recognition",
    label: "Recognition",
    types: [
      { id: "employee_spotlight", label: "Employee Spotlight" },
      { id: "achievement", label: "Achievement" },
      { id: "work_anniversary", label: "Work Anniversary" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    types: [
      { id: "restructure", label: "Restructure" },
      { id: "department_change", label: "Department Change" },
      { id: "reporting_changes", label: "Reporting Changes" },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    types: [
      { id: "survey", label: "Survey" },
      { id: "feedback", label: "Feedback" },
      { id: "wellness", label: "Wellness" },
      { id: "culture", label: "Culture" },
    ],
  },
  {
    id: "recruitment",
    label: "Recruitment",
    types: [
      { id: "open_position", label: "Open Position" },
      { id: "referral", label: "Referral" },
      { id: "internal_opportunity", label: "Internal Opportunity" },
    ],
  },
  {
    id: "it_workplace",
    label: "IT & Workplace",
    types: [
      { id: "maintenance", label: "Maintenance" },
      { id: "outage", label: "Outage" },
      { id: "security", label: "Security" },
      { id: "office_update", label: "Office Update" },
    ],
  },
  {
    id: "urgent",
    label: "Urgent",
    types: [
      { id: "emergency", label: "Emergency" },
      { id: "security_alert", label: "Security Alert" },
      { id: "critical_notice", label: "Critical Notice" },
    ],
  },
] as const;

export type AnnouncementCategory =
  (typeof ANNOUNCEMENT_TAXONOMY)[number]["id"];

export type AnnouncementType =
  (typeof ANNOUNCEMENT_TAXONOMY)[number]["types"][number]["id"];

const LEGACY_CATEGORY_TO_TYPE: Record<string, AnnouncementType> = {
  general: "general_update",
  new_hire: "new_hire",
  employee_leave: "employee_leave",
  policy: "policy_update",
  event: "social_event",
  ops: "office_update",
};

export const DEFAULT_ANNOUNCEMENT_CATEGORY: AnnouncementCategory = "company";
export const DEFAULT_ANNOUNCEMENT_TYPE: AnnouncementType = "general_update";

export function isAnnouncementCategory(
  value: unknown,
): value is AnnouncementCategory {
  return (
    typeof value === "string" &&
    ANNOUNCEMENT_TAXONOMY.some((category) => category.id === value)
  );
}

export function isAnnouncementType(value: unknown): value is AnnouncementType {
  return (
    typeof value === "string" &&
    ANNOUNCEMENT_TAXONOMY.some((category) =>
      category.types.some((type) => type.id === value),
    )
  );
}

export function getAnnouncementCategory(
  type: AnnouncementType | string | null | undefined,
): AnnouncementCategory {
  if (!type) return DEFAULT_ANNOUNCEMENT_CATEGORY;
  for (const category of ANNOUNCEMENT_TAXONOMY) {
    if (category.types.some((item) => item.id === type)) {
      return category.id;
    }
  }
  return DEFAULT_ANNOUNCEMENT_CATEGORY;
}

export function getTypesForCategory(
  category: AnnouncementCategory,
): Array<{ id: AnnouncementType; label: string }> {
  const match = ANNOUNCEMENT_TAXONOMY.find((item) => item.id === category);
  return match
    ? [...match.types]
    : [...ANNOUNCEMENT_TAXONOMY[1].types];
}

export function announcementCategoryLabel(
  category: AnnouncementCategory | string | null | undefined,
): string {
  const match = ANNOUNCEMENT_TAXONOMY.find((item) => item.id === category);
  return match?.label ?? "Company";
}

export function announcementTypeLabel(
  type: AnnouncementType | string | null | undefined,
): string {
  for (const category of ANNOUNCEMENT_TAXONOMY) {
    const match = category.types.find((item) => item.id === type);
    if (match) return match.label;
  }
  return "General Update";
}

export function announcementDisplayLabel(
  type: AnnouncementType | string | null | undefined,
): string {
  const resolvedType = normalizeAnnouncementType(type);
  const category = getAnnouncementCategory(resolvedType);
  return `${announcementCategoryLabel(category)} · ${announcementTypeLabel(resolvedType)}`;
}

/** Map DB / legacy values onto a known announcement type. */
export function normalizeAnnouncementType(
  value: unknown,
): AnnouncementType {
  if (isAnnouncementType(value)) return value;
  if (typeof value === "string" && value in LEGACY_CATEGORY_TO_TYPE) {
    return LEGACY_CATEGORY_TO_TYPE[value];
  }
  return DEFAULT_ANNOUNCEMENT_TYPE;
}

/** @deprecated Prefer announcementTypeLabel / announcementDisplayLabel. */
export function announcementCategoryLabelCompat(
  value: AnnouncementCategory | AnnouncementType | string | null | undefined,
): string {
  if (isAnnouncementType(value) || (typeof value === "string" && value in LEGACY_CATEGORY_TO_TYPE)) {
    return announcementDisplayLabel(normalizeAnnouncementType(value));
  }
  return announcementCategoryLabel(value);
}

/** True when PostgREST/Postgres reports a taxonomy column is not migrated yet. */
export function isMissingAnnouncementCategoryColumn(
  message: string | undefined,
): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("category") ||
      normalized.includes("announcement_type")) &&
    (normalized.includes("does not exist") ||
      normalized.includes("could not find") ||
      normalized.includes("schema cache"))
  );
}

/** Keep old export name working during the composer rename. */
export const ANNOUNCEMENT_CATEGORIES = ANNOUNCEMENT_TAXONOMY.map(
  (category) => ({
    id: category.id,
    label: category.label,
  }),
);

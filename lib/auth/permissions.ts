import type { AppRole } from "@/lib/types/database";

export const PERMISSION_TAG_SLUGS = [
  "super_admin",
  "hr_admin",
  "ceo",
  "coo",
  "manager",
  "business_unit_md",
  "comms",
] as const;

export type PermissionTagSlug = (typeof PERMISSION_TAG_SLUGS)[number];

export const PERMISSION_TAG_LABELS: Record<PermissionTagSlug, string> = {
  super_admin: "Super admin",
  hr_admin: "HR admin",
  ceo: "CEO",
  coo: "COO",
  manager: "Manager",
  business_unit_md: "Business unit MD",
  comms: "Comms",
};

/** Tags that grant the org-admin surface (payroll, hire, amend, etc.). */
export const ORG_ADMIN_TAGS: PermissionTagSlug[] = [
  "super_admin",
  "hr_admin",
  "ceo",
  "coo",
];

export const ORG_LEADER_TAGS: PermissionTagSlug[] = [
  ...ORG_ADMIN_TAGS,
  "business_unit_md",
];

/** Priority when syncing a single legacy `profiles.role` from tags. */
const ROLE_SYNC_PRIORITY = [
  "super_admin",
  "ceo",
  "coo",
  "hr_admin",
  "business_unit_md",
  "manager",
] as const;

export type TagBearer = {
  tags: readonly PermissionTagSlug[];
};

export function isPermissionTagSlug(value: string): value is PermissionTagSlug {
  return (PERMISSION_TAG_SLUGS as readonly string[]).includes(value);
}

export function hasTag(
  bearer: TagBearer,
  slug: PermissionTagSlug,
): boolean {
  return bearer.tags.includes(slug);
}

export function isOrgAdmin(bearer: TagBearer): boolean {
  return ORG_ADMIN_TAGS.some((slug) => bearer.tags.includes(slug));
}

export function isOrgLeader(bearer: TagBearer): boolean {
  return ORG_LEADER_TAGS.some((slug) => bearer.tags.includes(slug));
}

export function canApproveLeave(
  bearer: TagBearer & { isManager: boolean },
): boolean {
  return (
    bearer.isManager ||
    hasTag(bearer, "manager") ||
    isOrgAdmin(bearer)
  );
}

export function canViewPeopleDirectory(
  bearer: TagBearer & { isManager: boolean },
): boolean {
  return (
    bearer.isManager ||
    hasTag(bearer, "manager") ||
    isOrgLeader(bearer)
  );
}

export function canViewEmployeeDetails(
  viewer: TagBearer & { id: string },
  target: { id: string; manager_id: string | null },
): boolean {
  if (viewer.id === target.id) return true;
  if (isOrgAdmin(viewer)) return true;
  return target.manager_id === viewer.id;
}

export function canAssignTag(
  viewer: TagBearer,
  slug: PermissionTagSlug,
): boolean {
  if (!isOrgAdmin(viewer)) return false;
  if (slug === "super_admin") {
    return hasTag(viewer, "super_admin");
  }
  if (slug === "coo") {
    return hasTag(viewer, "ceo") || hasTag(viewer, "super_admin");
  }
  return true;
}

/** Publish company announcements (email + dashboard). Not an org-admin privilege. */
export function canPublishComms(bearer: TagBearer): boolean {
  return hasTag(bearer, "comms") || hasTag(bearer, "super_admin");
}

/** Map selected tags → legacy `profiles.role` for organogram / old reads. */
export function syncRoleFromTags(tags: readonly PermissionTagSlug[]): AppRole {
  for (const slug of ROLE_SYNC_PRIORITY) {
    if (!tags.includes(slug)) continue;
    if (slug === "super_admin") return "hr_admin";
    return slug;
  }
  return "employee";
}

export function parseTagSlugs(values: unknown): PermissionTagSlug[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<PermissionTagSlug>();
  for (const value of values) {
    if (typeof value === "string" && isPermissionTagSlug(value)) {
      unique.add(value);
    }
  }
  return [...unique];
}

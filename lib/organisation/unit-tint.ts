import type { OrganisationUnitView } from "@/lib/organisation/types";

export interface UnitTint {
  background: string;
  color: string;
}

const NAMED_TINTS: Array<UnitTint & { test: RegExp }> = [
  {
    test: /digital/i,
    background: "color-mix(in srgb, #1d1f4f 12%, white)",
    color: "#1d1f4f",
  },
  {
    test: /element/i,
    background: "color-mix(in srgb, #2ec4b6 18%, white)",
    color: "#0f766e",
  },
  {
    test: /realty/i,
    background: "color-mix(in srgb, #f6b93b 24%, white)",
    color: "#b45309",
  },
  {
    test: /wealth/i,
    background: "color-mix(in srgb, #16a34a 14%, white)",
    color: "#166534",
  },
  {
    test: /hill|consulting/i,
    background: "color-mix(in srgb, #6366f1 14%, white)",
    color: "#4338ca",
  },
  {
    test: /group/i,
    background: "color-mix(in srgb, #8b7cf8 16%, white)",
    color: "#5b21b6",
  },
];

const FALLBACK_TINTS: UnitTint[] = NAMED_TINTS.map(({ background, color }) => ({
  background,
  color,
}));

function hashId(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function unitTint(unit: Pick<OrganisationUnitView, "id" | "name">): UnitTint {
  const named = NAMED_TINTS.find((tint) => tint.test.test(unit.name));
  if (named) return named;
  return FALLBACK_TINTS[hashId(unit.id) % FALLBACK_TINTS.length];
}

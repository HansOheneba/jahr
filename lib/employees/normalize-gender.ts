export type NormalizedGender = "male" | "female" | "other";

export function normalizeGender(value: string | null): NormalizedGender {
  if (!value) return "other";
  const normalized = value.trim().toLowerCase();
  if (normalized === "male" || normalized === "m") return "male";
  if (normalized === "female" || normalized === "f") return "female";
  return "other";
}

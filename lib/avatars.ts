export type AvatarGender = "male" | "female";

export function avatarInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Normalize DB / form values to a binary avatar gender. */
export function parseAvatarGender(
  value: string | null | undefined,
): AvatarGender | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "male" || normalized === "m" || normalized === "man") {
    return "male";
  }
  if (
    normalized === "female" ||
    normalized === "f" ||
    normalized === "woman"
  ) {
    return "female";
  }
  return null;
}

/**
 * Known first-name genders for demo roster + common Ghanaian names.
 * Falls back to a stationary hash so unknown names stay fixed across reloads.
 */
const FEMALE_FIRST_NAMES = new Set([
  "ama",
  "afua",
  "akua",
  "esi",
  "efua",
  "abena",
  "serwaa",
  "akosua",
  "adwoa",
  "aisha",
  "yaa",
  "ekua",
  "maame",
  "sarah",
  "grace",
  "joyce",
  "linda",
  "mary",
  "patricia",
]);

const MALE_FIRST_NAMES = new Set([
  "hans",
  "jude",
  "tech",
  "kofi",
  "yaw",
  "kwame",
  "kojo",
  "fiifi",
  "nana",
  "kwesi",
  "kwaku",
  "kwadwo",
  "yoofi",
  "joseph",
  "michael",
  "daniel",
  "samuel",
  "emmanuel",
  "john",
  "david",
]);

function stationaryGenderFromSeed(seed: string): AvatarGender {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? "male" : "female";
}

export function resolveAvatarGender(
  name: string,
  gender?: string | null,
): AvatarGender {
  const parsed = parseAvatarGender(gender);
  if (parsed) return parsed;

  const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (FEMALE_FIRST_NAMES.has(first)) return "female";
  if (MALE_FIRST_NAMES.has(first)) return "male";

  return stationaryGenderFromSeed(name.trim().toLowerCase() || "colleague");
}

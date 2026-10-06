const CATEGORY_COLORS = [
  "#2EC4B6",
  "#55A8FD",
  "#FF7A59",
  "#8B7CF8",
  "#F6B93B",
  "#9FD356",
] as const;

const CATEGORY_TONES = [
  { bg: "#E7F8F6", text: "#0F766E" },
  { bg: "#E8F1FF", text: "#0B4FBF" },
  { bg: "#FFF1EC", text: "#C2410C" },
  { bg: "#F3F0FF", text: "#6D28D9" },
  { bg: "#FFF6E0", text: "#92600A" },
  { bg: "#F3F8E8", text: "#3F6212" },
] as const;

function categoryIndex(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash + name.charCodeAt(index) * (index + 1)) % CATEGORY_COLORS.length;
  }
  return hash;
}

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[categoryIndex(name)] ?? CATEGORY_COLORS[0];
}

export function categoryTone(name: string): { bg: string; text: string } {
  return CATEGORY_TONES[categoryIndex(name)] ?? CATEGORY_TONES[0];
}

// Display helper: render member names in Title Case regardless of how they were
// stored (GitHub names come through as anything — "JIYA HUSSSAIN", "arjun r",
// etc.). Lowercases everything, then capitalises the first letter of each word,
// including after apostrophes/hyphens/dots so "d'souza" → "D'Souza".
export function toTitleCase(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(
      /(^|[\s'\-./])(\p{L})/gu,
      (_, sep: string, ch: string) => sep + ch.toUpperCase(),
    );
}

// Shared rules for a project's tech-stack entries: the API schema
// (lib/validation.ts) and the picker (components/home/TechStackSelect.tsx)
// both read these, so the client never offers what the server rejects.

/** Longest tech-stack entry a project may store. */
export const MAX_TECH_NAME_LEN = 60;
/** Most tech-stack entries one project may list. */
export const MAX_TECH_ITEMS = 40;

// Trimmed, inner whitespace collapsed and capped, so "  my   tool " is stored
// as "my tool" and the server's length check can't reject a picked entry.
export function normalizeTechName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_TECH_NAME_LEN).trim();
}

// The known entry this name duplicates ignoring case ("react" → "React"), or
// null when it is genuinely new.
export function findTechName(
  name: string,
  known: Iterable<string>,
): string | null {
  const key = name.toLowerCase();
  for (const k of known) if (k.toLowerCase() === key) return k;
  return null;
}

// AJIET USN recognition — edge-safe (no imports) so it can run anywhere.
//
// AJIET (A J Institute of Engineering & Technology) USNs under VTU follow the
// shape `4JK<YY><CC><NNN>`:
//   4JK  — the constant AJIET college code
//   YY   — two-digit year of admission (e.g. 22)
//   CC   — two-letter course code (CS, CI, IC, ME, EC, …)
//   NNN  — three-digit serial
// Matching `4JK` is the reliable signal that a USN belongs to an AJIET student,
// which the onboarding flow uses to auto-approve membership (lib auto-approval).

export const AJIET_USN_REGEX = /^4JK\d{2}[A-Z]{2}\d{3}$/i;

/** True when `usn` is a well-formed AJIET USN (case-insensitive, trims space). */
export function isAjietUsn(usn: string | null | undefined): boolean {
  if (!usn) return false;
  return AJIET_USN_REGEX.test(usn.trim());
}

/**
 * Safe cue validation (brief §7 Circle rule 3, §12 opening workflow
 * rule 3: "Add up to three safe cues").
 */

export const MAX_CUES = 3;
export const MAX_CUE_LENGTH = 24;

export interface CueValidation {
  valid: boolean;
  cues: string[];
  error?: string;
}

export function validateCues(rawCues: string[]): CueValidation {
  // Drop repeats, keeping the first spelling. Duplicate cues carry no
  // extra meaning, they read as a mistake on the sealed card, and the
  // database now rejects them outright (migration 0012) — so collapse
  // them here rather than failing a submission over it. Matching is
  // case-insensitive, which is stricter than the database's exact-match
  // unique index, so anything this accepts will always insert cleanly.
  const seen = new Set<string>();
  const cues: string[] = [];
  for (const raw of rawCues) {
    const cue = raw.trim();
    if (cue.length === 0) continue;
    const key = cue.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cues.push(cue);
  }

  if (cues.length > MAX_CUES) {
    return { valid: false, cues, error: `Use at most ${MAX_CUES} cues.` };
  }
  const tooLong = cues.find((cue) => cue.length > MAX_CUE_LENGTH);
  if (tooLong) {
    return {
      valid: false,
      cues,
      error: `"${tooLong}" is longer than ${MAX_CUE_LENGTH} characters.`,
    };
  }
  return { valid: true, cues };
}

/**
 * Defence in depth for the Programming Desk preview: a cue must never
 * contain the film's own title, even accidentally.
 */
export function cueContainsTitle(cue: string, title: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  if (normalizedTitle.length === 0) return false;
  return cue.toLowerCase().includes(normalizedTitle);
}

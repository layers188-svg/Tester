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
  const cues = rawCues.map((cue) => cue.trim()).filter((cue) => cue.length > 0);

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

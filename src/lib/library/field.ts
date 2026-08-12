/**
 * Abstract entry fields for Library.
 *
 * Library needs visual rhythm, but brief rule 8 forbids film posters
 * and third party film imagery, and the brand guidelines' avoid-list
 * rules out generated people and stock photography. The guidelines'
 * own App Screens strip answers it: the Library thumbnails there are
 * flat palette fields, not stills.
 *
 * So each entry gets a field derived from its own id — deterministic,
 * so a member's Library looks the same every time they open it, and
 * carrying no information about the film. Flat colour with one fine
 * band: brief §8 forbids decorative gradients.
 *
 * These are palette members from the guidelines, chosen because they
 * hold their own as large blocks against Projection Black.
 */
export const FIELD_COLOURS = [
  "var(--hd-cool-green)",
  "var(--hd-deep-burgundy)",
  "var(--hd-tobacco)",
  "var(--hd-oxblood)",
  "var(--hd-dust-rose)",
  "var(--hd-aged-paper)",
] as const;

export interface EntryField {
  colour: string;
  /** Vertical position of the single fine band, as a percentage. */
  bandAt: number;
}

/** FNV-1a. Small, stable, and dependency free — the exact hash does not matter, only that it never moves. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A sealed entry has no field at all — an unrevealed row should read as
 * withheld, not as decorated. Callers pass `revealed: false` for those.
 */
export function entryField(id: string, revealed: boolean): EntryField | null {
  if (!revealed) return null;
  const h = hash(id);
  return {
    colour: FIELD_COLOURS[h % FIELD_COLOURS.length],
    // 30–70%, so the band never sits on an edge.
    bandAt: 30 + ((h >>> 8) % 41),
  };
}

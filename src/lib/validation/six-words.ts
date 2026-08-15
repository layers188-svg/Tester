/**
 * Six word review validation (brief §7 "Six words", §17 unit test list).
 * Enforced identically on client and server — the server copy here is
 * the one that actually matters; the client only reuses it for instant
 * feedback.
 *
 * The count was exactly six until the August handover, which changed it
 * to a range (00_BUILD_BRIEF_FINAL.md §3: "Allow 1 to 6 words,
 * optional"; acceptance test B10-B11: "Submit 1 to 6 words works. Seven
 * words is rejected"). Six is still the name and still the ceiling. The
 * floor moved because being told a four-word reaction is incomplete, at
 * the moment you are asked what stayed with you, is the opposite of
 * what the prompt is for.
 *
 * Mirrored by the six_word_reviews_word_count constraint
 * (0015_six_words_range.sql), which is the boundary that actually holds.
 */

export const SIX_WORD_MIN_COUNT = 1;
export const SIX_WORD_MAX_COUNT = 6;
export const SIX_WORD_MAX_LENGTH = 140;

export interface SixWordValidation {
  valid: boolean;
  wordCount: number;
  normalized: string;
  error?: string;
}

/** Splits on whitespace and drops empty tokens — the single counting rule used everywhere. */
export function countWords(body: string): number {
  return body
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

export function validateSixWords(rawBody: string): SixWordValidation {
  const normalized = rawBody.trim().replace(/\s+/g, " ");
  const wordCount = countWords(normalized);

  if (normalized.length === 0) {
    return { valid: false, wordCount: 0, normalized, error: "Write six words." };
  }
  if (normalized.length > SIX_WORD_MAX_LENGTH) {
    return {
      valid: false,
      wordCount,
      normalized,
      error: "That is too long for six words.",
    };
  }
  if (wordCount > SIX_WORD_MAX_COUNT) {
    const over = wordCount - SIX_WORD_MAX_COUNT;
    return {
      valid: false,
      wordCount,
      normalized,
      error: `${over} word${over === 1 ? "" : "s"} too many.`,
    };
  }
  return { valid: true, wordCount, normalized };
}

export const SIX_WORD_EDIT_WINDOW_MS = 5 * 60 * 1000;

export function withinEditWindow(createdAt: Date | string, now: Date = new Date()): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return now.getTime() - created.getTime() <= SIX_WORD_EDIT_WINDOW_MS;
}

/**
 * Six word review validation (brief §7 "Six words", §17 unit test list).
 * Enforced identically on client and server — the server copy here is
 * the one that actually matters; the client only reuses it for instant
 * feedback.
 */

export const SIX_WORD_REQUIRED_COUNT = 6;
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
  if (wordCount !== SIX_WORD_REQUIRED_COUNT) {
    return {
      valid: false,
      wordCount,
      normalized,
      error:
        wordCount < SIX_WORD_REQUIRED_COUNT
          ? `${SIX_WORD_REQUIRED_COUNT - wordCount} more word${
              SIX_WORD_REQUIRED_COUNT - wordCount === 1 ? "" : "s"
            } needed.`
          : `${wordCount - SIX_WORD_REQUIRED_COUNT} word${
              wordCount - SIX_WORD_REQUIRED_COUNT === 1 ? "" : "s"
            } too many.`,
    };
  }
  return { valid: true, wordCount, normalized };
}

export const SIX_WORD_EDIT_WINDOW_MS = 5 * 60 * 1000;

export function withinEditWindow(createdAt: Date | string, now: Date = new Date()): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return now.getTime() - created.getTime() <= SIX_WORD_EDIT_WINDOW_MS;
}

/**
 * The private note that travels with a sealed recommendation.
 *
 * Six words or *fewer*, unlike a public review, which is exactly six.
 * The difference is deliberate: a review is a form with a fixed shape,
 * and this is one person telling another "trust me on this one". Three
 * words is a complete thought there.
 *
 * Empty is allowed. Sending a film with nothing attached is its own
 * kind of recommendation, and forcing words would produce filler.
 */
export function validateRecommendationNote(rawBody: string): SixWordValidation {
  const normalized = rawBody.trim().replace(/\s+/g, " ");
  const wordCount = countWords(normalized);

  if (normalized.length === 0) {
    return { valid: true, wordCount: 0, normalized: "" };
  }
  if (normalized.length > SIX_WORD_MAX_LENGTH) {
    return { valid: false, wordCount, normalized, error: "That is too long." };
  }
  if (wordCount > SIX_WORD_REQUIRED_COUNT) {
    const over = wordCount - SIX_WORD_REQUIRED_COUNT;
    return {
      valid: false,
      wordCount,
      normalized,
      error: `${over} word${over === 1 ? "" : "s"} too many. Six or fewer.`,
    };
  }
  return { valid: true, wordCount, normalized };
}

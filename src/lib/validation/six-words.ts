/**
 * Six word review validation (brief §7 "Six words", §17 unit test list).
 * Enforced identically on client and server — the server copy here is
 * the one that actually matters; the client only reuses it for instant
 * feedback.
 */

export const SIX_WORD_REQUIRED_COUNT = 6;
export const SIX_WORD_MAX_LENGTH = 80;
export const SIX_WORD_MIN_LENGTH = 2;

/**
 * The longest a single unbroken token may be.
 *
 * Six words inside eighty characters already implies short words. A
 * lone run longer than this is not a word somebody typed on purpose.
 */
export const SIX_WORD_MAX_TOKEN_LENGTH = 15;

/**
 * Does this token read as language?
 *
 * The house saw `thisfvjvnncncnc e. c f hd dh` reach a public surface.
 * Every rule that counts words passed it: six tokens, under the length
 * cap, non-empty. Counting was never going to catch it, because a
 * keyboard mash has the right *shape* and the wrong *substance*.
 *
 * A dictionary was the obvious answer and is the wrong one here. Six
 * words after a film are content words, not function words —
 * "Exhausting, brutal, relentless, magnificent drumming" contains
 * nothing a small word list would hold, so a list big enough not to
 * reject real reactions is a list too big to ship, and a small one
 * rejects the best writing in the product.
 *
 * Orthography settles it without a list. English words carry vowels and
 * do not run four consonants together outside a handful of clusters.
 * `fvjvnncncnc` fails on both counts; `drumming` and `Whiplash` pass.
 * The test is deliberately generous — one recognisable token in the
 * whole response is enough — because the job is refusing gibberish, not
 * marking English.
 */
export function looksLikeWord(rawToken: string): boolean {
  // Punctuation is a member's business: "Exhausting." is a word.
  const token = rawToken.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

  if (token.length < 2 || token.length > SIX_WORD_MAX_TOKEN_LENGTH) return false;
  if (!/[aeiouy]/.test(token)) return false;
  // Four consonants in a row is a mash, not a word. "Whiplash" peaks at
  // three (`phl` never occurs; `shl` does, in "ashlar").
  if (/[^aeiouy]{4,}/.test(token)) return false;
  // "aaaa" and "cccc" are emphasis at two, noise at three.
  if (/(.)\1{2,}/.test(token)) return false;
  return true;
}

/** True when nothing in the response reads as language. */
export function isGibberish(normalized: string): boolean {
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return tokens.length > 0 && !tokens.some(looksLikeWord);
}

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

/**
 * A member's response: one to six words.
 *
 * Not exactly six. That rule made a form out of a reaction, and a form
 * is answered with padding — "Exhausting." is a complete thing to say
 * about a film, and stretching it to six words makes it a worse one.
 *
 * Zero is not a response, it is a skip, and skipping records nothing.
 * A member in the Room having said nothing is worse than a member who
 * is not in the Room.
 *
 * The house's own six words about a film are still exactly six. See
 * `validateEditorial` — that one is the house writing to a fixed form,
 * and the form is the product.
 */
export function validateSixWords(rawBody: string): SixWordValidation {
  const normalized = rawBody.trim().replace(/\s+/g, " ");
  const wordCount = countWords(normalized);

  if (normalized.length === 0) {
    return { valid: false, wordCount: 0, normalized, error: "Write a word or six." };
  }
  if (normalized.length < SIX_WORD_MIN_LENGTH) {
    return { valid: false, wordCount, normalized, error: "Write a word or six." };
  }
  if (normalized.length > SIX_WORD_MAX_LENGTH) {
    return {
      valid: false,
      wordCount,
      normalized,
      error: "That is too long for six words.",
    };
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
  if (wordCount === 1 && normalized.replace(/[^\p{L}]/gu, "").length > SIX_WORD_MAX_TOKEN_LENGTH) {
    return {
      valid: false,
      wordCount,
      normalized,
      // Never "that is not a word" — a member writing in a language the
      // house did not anticipate should not be told their words are not
      // words. Ask for a space instead, which is true of the fault.
      error: "Six words, with spaces between them.",
    };
  }
  if (isGibberish(normalized)) {
    return {
      valid: false,
      wordCount,
      normalized,
      error: "Six words, with spaces between them.",
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

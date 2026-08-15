import { describe, expect, it } from "vitest";
import {
  countWords,
  looksLikeWord,
  SIX_WORD_MAX_TOKEN_LENGTH,
  validateSixWords,
  withinEditWindow,
} from "@/lib/validation/six-words";

describe("countWords", () => {
  it("counts whitespace separated tokens", () => {
    expect(countWords("Watched alone. Wanted you there.")).toBe(5);
    expect(countWords("  extra   spaces   here  ")).toBe(3);
  });

  it("returns 0 for empty input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("validateSixWords", () => {
  it("accepts exactly six words", () => {
    const result = validateSixWords("I did not see that coming");
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(6);
  });

  it("accepts fewer than six words, because a reaction is not a form", () => {
    // "Exhausting." is a complete answer to a film. The rule used to be
    // exactly six, which meant the only way to say it was to pad it,
    // and padding is the one thing a six-word review cannot survive.
    expect(validateSixWords("Too short").valid).toBe(true);
    expect(validateSixWords("Exhausting.").valid).toBe(true);
    expect(validateSixWords("Exhausting.").wordCount).toBe(1);
  });

  it("still refuses an empty response, because that is a skip", () => {
    // Skipping records nothing at all. A member in the Room having said
    // nothing is worse than a member who is not in the Room.
    const result = validateSixWords("   ");
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBe(0);
  });

  it("rejects more than six words", () => {
    const result = validateSixWords("This sentence definitely has way too many words");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too many/);
  });

  it("rejects empty input", () => {
    const result = validateSixWords("   ");
    expect(result.valid).toBe(false);
  });

  it("normalizes internal whitespace", () => {
    const result = validateSixWords("One   two three   four five six");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("One two three four five six");
  });
});

describe("withinEditWindow", () => {
  it("is true immediately after creation", () => {
    expect(withinEditWindow(new Date().toISOString())).toBe(true);
  });

  it("is false after five minutes", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(withinEditWindow(sixMinutesAgo)).toBe(false);
  });
});

/**
 * The house saw `thisfvjvnncncnc e. c f hd dh` published on a public
 * surface. It satisfied every rule that existed: six tokens, non-empty,
 * inside the length cap. These are the cases that rule cannot cover.
 */
describe("gibberish is not a response", () => {
  it("refuses the mash that actually reached a public page", () => {
    const result = validateSixWords("thisfvjvnncncnc e. c f hd dh");
    expect(result.valid).toBe(false);
  });

  it.each([
    // "qwerty" is deliberately absent: it is a real word, and a rule
    // that refused it would be refusing English to look strict.
    ["asdfgh jkl zxcv", "a keyboard row"],
    ["b c d f g h", "consonants alone"],
    ["xxxxx yyyyy zzzzz", "repeated letters"],
    ["hjkl", "one unpronounceable token"],
  ])("refuses %s (%s)", (body) => {
    expect(validateSixWords(body).valid).toBe(false);
  });

  it("refuses one unbroken run longer than a word", () => {
    expect(validateSixWords("a".repeat(SIX_WORD_MAX_TOKEN_LENGTH + 1)).valid).toBe(false);
  });

  /**
   * The half that matters more. A test that only proves gibberish is
   * refused would pass with `valid: false` hardcoded, and the cost of
   * over-refusing here is a member being told their reaction is not
   * words.
   */
  it.each([
    "Exhausting, brutal, relentless, magnificent drumming",
    "Not for me.",
    "Devastating.",
    "I cried, twice, unexpectedly",
    "Six words after the credits",
    "Beautiful and cruel in equal",
    "Whiplash",
    "Loved it",
    "So so so good",
  ])("accepts %s", (body) => {
    const result = validateSixWords(body);
    expect(result.valid).toBe(true);
  });

  it("accepts a word with no vowel-heavy shape but real letters", () => {
    expect(looksLikeWord("rhythm")).toBe(true);
    expect(looksLikeWord("fvjvnncncnc")).toBe(false);
  });
});

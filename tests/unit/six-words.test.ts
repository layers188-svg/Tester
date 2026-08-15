import { describe, expect, it } from "vitest";
import { countWords, validateSixWords, withinEditWindow } from "@/lib/validation/six-words";

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
  it("accepts six words", () => {
    const result = validateSixWords("I did not see that coming");
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(6);
  });

  // Handover §3: "Allow 1 to 6 words, optional." A reaction that took
  // fewer words is not a malformed reaction.
  it("accepts anything from one word up to six", () => {
    for (const body of [
      "Devastating",
      "Still counting",
      "Ambition is cruelty",
      "He never once looked away",
      "Left the room still counting time",
    ]) {
      expect(validateSixWords(body).valid).toBe(true);
    }
  });

  it("rejects the seventh word", () => {
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

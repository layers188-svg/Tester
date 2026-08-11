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
  it("accepts exactly six words", () => {
    const result = validateSixWords("I did not see that coming");
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(6);
  });

  it("rejects fewer than six words", () => {
    const result = validateSixWords("Too short");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/more word/);
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

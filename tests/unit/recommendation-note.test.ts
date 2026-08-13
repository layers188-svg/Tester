import { describe, expect, it } from "vitest";
import { validateRecommendationNote } from "@/lib/validation/six-words";

/**
 * Acceptance criterion 8: a private recommendation carries no more than
 * six words. It differs from a public review, which is exactly six, and
 * the difference is easy to lose in a refactor that "unifies" them.
 */
describe("validateRecommendationNote", () => {
  it("accepts six words", () => {
    const result = validateRecommendationNote("Trust me on this one tonight");
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(6);
  });

  it("accepts fewer than six, unlike a public review", () => {
    for (const note of ["Trust me", "Watch it", "Just go"]) {
      expect(validateRecommendationNote(note).valid).toBe(true);
    }
  });

  it("accepts nothing at all", () => {
    // Sending a film with no note is its own kind of recommendation.
    // Forcing words here would only produce filler.
    const result = validateRecommendationNote("   ");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("");
  });

  it("refuses a seventh word and says by how much", () => {
    const result = validateRecommendationNote("One two three four five six seven");
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBe(7);
    expect(result.error).toMatch(/1 word too many/);
  });

  it("counts words the same way whatever the spacing", () => {
    const result = validateRecommendationNote("  Trust   me\non  this   one  ");
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(5);
    // Normalised, so a run of whitespace never reaches the recipient.
    expect(result.normalized).toBe("Trust me on this one");
  });

  it("refuses a single absurdly long token", () => {
    expect(validateRecommendationNote("x".repeat(200)).valid).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { cueContainsTitle, MAX_CUES, MAX_CUE_LENGTH, validateCues } from "@/lib/validation/cues";

describe("validateCues", () => {
  it("accepts up to three trimmed cues", () => {
    const result = validateCues(["Drummer", " School ", "Ambition"]);
    expect(result.valid).toBe(true);
    expect(result.cues).toEqual(["Drummer", "School", "Ambition"]);
  });

  it("drops empty entries without counting them", () => {
    const result = validateCues(["Drummer", "", "  "]);
    expect(result.valid).toBe(true);
    expect(result.cues).toEqual(["Drummer"]);
  });

  it(`rejects more than ${MAX_CUES} cues`, () => {
    const result = validateCues(["One", "Two", "Three", "Four"]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at most/);
  });

  it(`rejects a cue longer than ${MAX_CUE_LENGTH} characters`, () => {
    const longCue = "x".repeat(MAX_CUE_LENGTH + 1);
    const result = validateCues([longCue]);
    expect(result.valid).toBe(false);
  });
});

describe("cueContainsTitle", () => {
  it("flags a cue that leaks the title", () => {
    expect(cueContainsTitle("A Whiplash Story", "Whiplash")).toBe(true);
    expect(cueContainsTitle("whiplash", "Whiplash")).toBe(true);
  });

  it("passes a safe cue", () => {
    expect(cueContainsTitle("Drummer", "Whiplash")).toBe(false);
  });
});

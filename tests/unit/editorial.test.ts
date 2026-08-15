import { describe, expect, it } from "vitest";
import { EditorialInvalidError, validateEditorial } from "@/lib/films/editorial";

/**
 * The six-word rule is the product promise, and the one thing a
 * language model reliably gets wrong. Every path into a film record
 * goes through this function — generated or hand-written — so this is
 * where "exactly six" is actually decided.
 */
describe("validateEditorial", () => {
  const good = {
    sixWordPlot: "Drummer chases greatness under brutal mentorship.",
    territory: ["Ambition", "Obsession", "Power"],
    pace: "Relentless",
    intensity: "High",
  };

  it("accepts exactly six words", () => {
    expect(validateEditorial(good).sixWordPlot).toBe(
      "Drummer chases greatness under brutal mentorship.",
    );
  });

  it("rejects five", () => {
    expect(() =>
      validateEditorial({ ...good, sixWordPlot: "Drummer chases greatness under mentorship." }),
    ).toThrow(EditorialInvalidError);
  });

  it("rejects seven", () => {
    expect(() =>
      validateEditorial({
        ...good,
        sixWordPlot: "A drummer chases greatness under brutal mentorship.",
      }),
    ).toThrow(EditorialInvalidError);
  });

  /** Padding cannot be used to reach six. */
  it("does not let extra whitespace count as words", () => {
    expect(() =>
      validateEditorial({
        ...good,
        sixWordPlot: "Drummer   chases  greatness   under mentorship.",
      }),
    ).toThrow(EditorialInvalidError);
  });

  it("normalises internal spacing on an otherwise valid line", () => {
    expect(
      validateEditorial({
        ...good,
        sixWordPlot: "  Drummer  chases greatness under brutal mentorship.  ",
      }).sixWordPlot,
    ).toBe("Drummer chases greatness under brutal mentorship.");
  });

  it("keeps the closing punctuation", () => {
    // Stripping it would leave the house's sentences reading as
    // fragments beside a member's own six words.
    expect(validateEditorial(good).sixWordPlot.endsWith(".")).toBe(true);
  });

  it("refuses anything that is not an object", () => {
    for (const value of [null, undefined, "six words here right now yes", 42]) {
      expect(() => validateEditorial(value)).toThrow(EditorialInvalidError);
    }
  });

  it("caps territory at three and drops rubbish", () => {
    const result = validateEditorial({
      ...good,
      territory: ["Ambition", "", "Obsession", 7, "Power", "Extra"],
    });
    expect(result.territory).toEqual(["Ambition", "Obsession", "Power"]);
  });

  it("survives a missing territory list", () => {
    expect(validateEditorial({ sixWordPlot: good.sixWordPlot }).territory).toEqual([]);
  });

  /**
   * Pace and intensity are single descriptors. A sentence there is a
   * review, which the product does not do.
   */
  it("drops a pace or intensity that is more than one word", () => {
    const result = validateEditorial({
      ...good,
      pace: "quite slow at first",
      intensity: "High",
    });
    expect(result.pace).toBeNull();
    expect(result.intensity).toBe("High");
  });

  it("counts the words the same way the member-facing review does", () => {
    // Both sides of "six words before / six words after" have to agree
    // on what a word is, or the phrase means two different things.
    expect(
      validateEditorial({ ...good, sixWordPlot: "one two three four five six" }).sixWordPlot,
    ).toBe("one two three four five six");
  });
});

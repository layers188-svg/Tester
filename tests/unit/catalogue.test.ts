import { describe, expect, it } from "vitest";
import { catalogueEditorial, catalogueProvider } from "@/lib/films/catalogue";
import { validateEditorial } from "@/lib/films/editorial";

describe("the local catalogue", () => {
  it("finds a film by part of its title", async () => {
    const results = await catalogueProvider.search("portrait");
    expect(results.map((r) => r.title)).toContain("Portrait of a Lady on Fire");
  });

  it("ignores case and punctuation", async () => {
    const results = await catalogueProvider.search("IN THE MOOD, FOR LOVE");
    expect(results[0]?.title).toBe("In the Mood for Love");
  });

  /**
   * The case Search exists to handle: two films share a name and the
   * member has to be able to say which one they mean. Year is the only
   * thing offered to tell them apart, so both have to be there.
   */
  it("returns both films called Whiplash, newest first", async () => {
    const results = await catalogueProvider.search("whiplash");
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.releaseYear)).toEqual([2014, 2002]);
    expect(new Set(results.map((r) => r.externalId)).size).toBe(2);
  });

  it("returns nothing for an empty query rather than everything", async () => {
    expect(await catalogueProvider.search("   ")).toEqual([]);
  });

  it("returns nothing for a film it does not have", async () => {
    expect(await catalogueProvider.search("a film nobody made")).toEqual([]);
  });

  /**
   * A suggestion carries a title and a year and nothing else. Anything
   * more — a rating, a line of plot, an image path — is the incidental
   * spoiling Search was built to avoid, so the shape is asserted rather
   * than trusted.
   */
  it("offers only what distinguishes one film from another", async () => {
    const [first] = await catalogueProvider.search("parasite");
    expect(Object.keys(first).sort()).toEqual(["externalId", "provider", "releaseYear", "title"]);
  });

  it("keeps the synopsis on the facts, which never leave the server", async () => {
    const facts = await catalogueProvider.facts("parasite-2019");
    expect(facts?.synopsis).toBeTruthy();
    // The record the browser receives is built in records.ts and has no
    // synopsis field at all; this is the reminder of why.
    expect(facts).not.toHaveProperty("sixWordPlot");
  });

  it("answers null for an unknown id instead of throwing", async () => {
    expect(await catalogueProvider.facts("nothing-here")).toBeNull();
  });
});

describe("hand-written editorial", () => {
  /**
   * The house's own writing goes through the same check as the model's.
   * A typo here would otherwise be the one description in the product
   * that escaped validation.
   */
  it("is exactly six words for every film that has it", () => {
    for (const id of [
      "whiplash-2014",
      "parasite-2019",
      "portrait-2019",
      "burning-2018",
      "florida-project-2017",
      "in-the-mood-for-love-2000",
    ]) {
      const editorial = catalogueEditorial(id);
      expect(editorial, `${id} should have hand-written six words`).toBeTruthy();
      expect(() => validateEditorial(editorial)).not.toThrow();
    }
  });

  it("gives three territory words to each", () => {
    expect(catalogueEditorial("whiplash-2014")?.territory).toEqual([
      "Ambition",
      "Obsession",
      "Power",
    ]);
  });

  /** A film with no hand-written entry falls through to generation. */
  it("has none for the film left deliberately unwritten", () => {
    expect(catalogueEditorial("whiplash-2002")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  allCatalogueEditorial,
  catalogueEditorial,
  catalogueProvider,
} from "@/lib/films/catalogue";
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
   * Every entry, not a list someone remembered to update. The catalogue
   * is the one place a premise can be written without a model counting
   * it first, so this is where a typo would otherwise ship.
   */
  it("is exactly six words for every film in the catalogue", () => {
    const all = allCatalogueEditorial();
    expect(all.length).toBeGreaterThan(50);

    for (const { title, editorial } of all) {
      expect(
        () => validateEditorial(editorial),
        `${title}: "${editorial.sixWordPlot}"`,
      ).not.toThrow();
    }
  });

  it("gives every film three territory words, a pace and an intensity", () => {
    for (const { title, editorial } of allCatalogueEditorial()) {
      expect(editorial.territory, title).toHaveLength(3);
      expect(editorial.pace, title).toBeTruthy();
      expect(editorial.intensity, title).toBeTruthy();
    }
  });

  /**
   * A premise that names its own film has spent one of six words saying
   * nothing the member cannot already see.
   *
   * Matched on whole words, not substrings. The first version of this
   * compared normalised strings and failed on Drive, whose premise
   * mentions a "driver" — the same trap the title-leak detector has
   * (CLAUDE.md: a film called _It_ matches `initial-scale`). A short
   * title inside a longer word is a coincidence, not a repeat.
   */
  it("does not repeat the film's title inside its six words", () => {
    const words = (value: string) =>
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

    for (const { title, editorial } of allCatalogueEditorial()) {
      const premise = words(editorial.sixWordPlot);
      const name = words(title);

      const repeated = premise.some((_, index) =>
        name.every((word, offset) => premise[index + offset] === word),
      );

      expect(repeated, `${title}: "${editorial.sixWordPlot}"`).toBe(false);
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

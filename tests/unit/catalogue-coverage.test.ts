import { describe, expect, it } from "vitest";
import { catalogueProvider, catalogueEditorial } from "@/lib/films/catalogue";

describe("the films the brief names", () => {
  for (const [query, title, year] of [
    ["la la land", "La La Land", 2016],
    ["parasite", "Parasite", 2019],
    ["in the mood for love", "In the Mood for Love", 2000],
    ["past lives", "Past Lives", 2023],
    ["burning", "Burning", 2018],
    ["whiplash", "Whiplash", 2014],
  ] as const) {
    it(`${query} finds ${title} and has exactly six words`, async () => {
      const results = await catalogueProvider.search(query);
      const hit = results.find((r) => r.title === title && r.releaseYear === year);
      expect(hit, `no ${title} for "${query}"`).toBeTruthy();
      const editorial = catalogueEditorial(hit!.externalId);
      expect(editorial, `no six words for ${title}`).toBeTruthy();
      expect(editorial!.sixWordPlot.replace(/\.$/, "").split(/\s+/)).toHaveLength(6);
    });
  }
});

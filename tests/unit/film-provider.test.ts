import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFilmProvider, hasWideCatalogue } from "@/lib/films/provider";

/**
 * The house's films, then the world's.
 *
 * This composition is the safety net under an unverified wide provider
 * (see tests/unit/wikidata.test.ts), so what it does when that provider
 * misbehaves matters as much as what it does when it works.
 */

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.TMDB_API_KEY;
  delete process.env.HOUSE_DARK_WIDE_CATALOGUE;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

/** A wide provider that answers with one invented film. */
function wideSearchReturning(rows: { id: string; title: string; year: number | null }[]) {
  return vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url.includes("wbsearchentities")) {
      return new Response(
        JSON.stringify({
          search: rows.map((row) => ({
            id: row.id,
            label: row.title,
            description: `${row.year ?? ""} film`,
          })),
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ entities: {} }), { status: 200 });
  });
}

describe("the composed film provider", () => {
  it("puts the house's own films above the wide index", async () => {
    vi.stubGlobal(
      "fetch",
      wideSearchReturning([{ id: "Q1", title: "Whiplash Rising", year: 2021 }]),
    );

    const results = await getFilmProvider().search("whiplash");

    // Both Whiplashes are hand-written catalogue entries with six words
    // somebody wrote. They come first.
    expect(results[0].provider).toBe("catalogue");
    expect(results.some((r) => r.provider === "wikidata")).toBe(true);
  });

  it("shows a film once when both catalogues have it", async () => {
    vi.stubGlobal("fetch", wideSearchReturning([{ id: "Q1", title: "Whiplash", year: 2014 }]));

    const results = await getFilmProvider().search("whiplash");
    const whiplash2014 = results.filter((r) => r.title === "Whiplash" && r.releaseYear === 2014);

    expect(whiplash2014).toHaveLength(1);
    expect(whiplash2014[0].provider).toBe("catalogue");
  });

  it("still answers from the catalogue when the wide index is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    const results = await getFilmProvider().search("whiplash");

    // The whole point of composing rather than replacing: a wide
    // provider that turns out to be wrong costs the wide results, not
    // Search.
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.provider === "catalogue")).toBe(true);
  });

  it("reports a wide failure rather than claiming the film does not exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    // Nothing in the catalogue matches, so silence here would tell a
    // member no such film was ever made. The route turns this into "the
    // house could not reach its catalogue", which is the truth.
    await expect(getFilmProvider().search("zzzznotafilm")).rejects.toThrow();
  });

  it("routes facts by whichever catalogue owns the id", async () => {
    const fetchMock = wideSearchReturning([]);
    vi.stubGlobal("fetch", fetchMock);

    const facts = await getFilmProvider().facts("whiplash-2014");

    expect(facts?.title).toBe("Whiplash");
    // A local slug never becomes a request to somebody else's servers.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("can be pinned to the house's own films alone", async () => {
    process.env.HOUSE_DARK_WIDE_CATALOGUE = "off";
    const fetchMock = wideSearchReturning([{ id: "Q1", title: "Anything", year: 2020 }]);
    vi.stubGlobal("fetch", fetchMock);

    const results = await getFilmProvider().search("whiplash");

    expect(hasWideCatalogue()).toBe(false);
    expect(results.every((r) => r.provider === "catalogue")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers TMDB when a key is configured", () => {
    process.env.TMDB_API_KEY = "not-a-real-key";
    expect(getFilmProvider().name).toBe("catalogue+tmdb");
    expect(hasWideCatalogue()).toBe(true);
  });

  it("uses Wikidata when there is no key, so the library needs no account", () => {
    expect(getFilmProvider().name).toBe("catalogue+wikidata");
    expect(hasWideCatalogue()).toBe(true);
  });
});

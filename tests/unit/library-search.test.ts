import { describe, expect, it } from "vitest";
import { NOTHING_UNDER_THAT_TITLE, matchesLibraryQuery, searchLibrary } from "@/lib/library/search";
import type { LibraryItem } from "@/lib/supabase/types";

/**
 * Library search (handover §7, acceptance test G).
 *
 * The interesting assertions are the negative ones. Search runs over
 * rows that include openings the member never revealed, and those rows
 * are in the list precisely so the member can see there was an evening
 * they missed. What must not happen is search turning that into a way
 * to ask which film it was.
 */

function item(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    kind: "opening",
    target_id: "00000000-0000-4000-8000-000000000001",
    opening_number: 7,
    watch_state: "watched",
    watched_at: "2026-08-14T20:00:00.000Z",
    revealed: true,
    title: "Whiplash",
    release_year: 2014,
    six_words: null,
    ...overrides,
  };
}

/** An opening the member never revealed: no title, and the RPC returns none. */
const sealed = item({ revealed: false, title: null, release_year: null, opening_number: 9 });

describe("matchesLibraryQuery", () => {
  it("matches a title, case insensitively and part way through", () => {
    expect(matchesLibraryQuery(item(), "whip")).toBe(true);
    expect(matchesLibraryQuery(item(), "LASH")).toBe(true);
  });

  it("matches a year", () => {
    expect(matchesLibraryQuery(item(), "2014")).toBe(true);
  });

  it("matches an Opening number, with or without the word", () => {
    expect(matchesLibraryQuery(item(), "7")).toBe(true);
    expect(matchesLibraryQuery(item(), "Opening 7")).toBe(true);
  });

  it("does not match a different film", () => {
    expect(matchesLibraryQuery(item(), "burning")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(matchesLibraryQuery(item(), "")).toBe(true);
    expect(matchesLibraryQuery(sealed, "   ")).toBe(true);
  });

  // The rule the whole module exists for.
  it("cannot find a sealed opening by the title it is hiding", () => {
    expect(matchesLibraryQuery(sealed, "whiplash")).toBe(false);
    expect(matchesLibraryQuery(sealed, "whip")).toBe(false);
  });

  it("still finds a sealed opening by its number, which is not its identity", () => {
    expect(matchesLibraryQuery(sealed, "9")).toBe(true);
    expect(matchesLibraryQuery(sealed, "opening 9")).toBe(true);
  });

  it("does not confuse one Opening number with another", () => {
    expect(matchesLibraryQuery(sealed, "opening 7")).toBe(false);
  });

  it("can be asked to match titles only", () => {
    expect(matchesLibraryQuery(item(), "2014", { matchNumbers: false })).toBe(false);
    expect(matchesLibraryQuery(item(), "whiplash", { matchNumbers: false })).toBe(true);
  });
});

describe("searchLibrary", () => {
  const items = [
    item({ title: "Burning", release_year: 2018, opening_number: 4 }),
    item({ title: "In the Mood for Love", release_year: 2000, opening_number: 5 }),
    item({ title: "Whiplash", release_year: 2014, opening_number: 7 }),
    sealed,
  ];

  // Acceptance test G1-G4.
  it("finds Burning", () => {
    expect(searchLibrary(items, "Burning").map((i) => i.title)).toEqual(["Burning"]);
  });

  it("finds a film by a word inside its title", () => {
    expect(searchLibrary(items, "Mood").map((i) => i.title)).toEqual(["In the Mood for Love"]);
  });

  it("finds Whiplash for the member who revealed it", () => {
    expect(searchLibrary(items, "Whiplash").map((i) => i.title)).toEqual(["Whiplash"]);
  });

  it("returns nothing for a film that is not there", () => {
    expect(searchLibrary(items, "Solaris")).toEqual([]);
  });

  it("returns everything again when the search is cleared", () => {
    expect(searchLibrary(items, "")).toHaveLength(items.length);
  });

  it("uses the handover's exact empty-state line", () => {
    expect(NOTHING_UNDER_THAT_TITLE).toBe("Nothing under that title.");
  });
});

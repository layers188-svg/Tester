import "server-only";

import { catalogueProvider } from "./catalogue";
import { createTmdbProvider } from "./tmdb";
import { createWikidataProvider } from "./wikidata";
import type { FilmProvider, FilmSuggestion } from "./types";

/**
 * Which catalogue Search is running against.
 *
 * The house's own 62 films first, then everything else. The local
 * catalogue is not a fallback to be ashamed of and not a mock: it holds
 * the films House Dark has actually programmed, with six words written
 * by hand, and a hand-written line beats a generated one. It goes first
 * for that reason rather than because it is nearer.
 *
 * Behind it, the wide index:
 *
 *   TMDB      when TMDB_API_KEY is set. Best data, wants an account.
 *   Wikidata  otherwise. Open, anonymous, free, and unlimited, which
 *             is what makes the library limitless without anybody
 *             signing up for or paying for anything.
 *
 * Set HOUSE_DARK_WIDE_CATALOGUE=off to run on the 62 films alone.
 *
 * Read per call rather than memoised at module load. The Workers
 * runtime can hand a module a different environment between requests,
 * and a provider captured once at boot is a provider that keeps using
 * yesterday's key.
 */
export function getFilmProvider(): FilmProvider {
  const wide = wideProvider();
  return wide ? catalogueFirst(wide) : catalogueProvider;
}

function wideProvider(): FilmProvider | null {
  if (process.env.HOUSE_DARK_WIDE_CATALOGUE?.trim() === "off") return null;
  const key = process.env.TMDB_API_KEY?.trim();
  return key ? createTmdbProvider(key) : createWikidataProvider();
}

/** Whether the wide catalogue is available, for honest empty-state copy. */
export function hasWideCatalogue(): boolean {
  return wideProvider() !== null;
}

/**
 * The house's films, then the world's.
 *
 * Two things this arrangement buys beyond ordering:
 *
 * 1. `facts()` needs no provider argument and no id-shape guessing. The
 *    catalogue answers for its own slugs and returns null for anything
 *    else, so the wide provider gets asked exactly when it should.
 *
 * 2. It is the safety net under an unverified provider. The Wikidata
 *    module was written without network access to check it against
 *    (see the note at the top of wikidata.ts). If its assumptions about
 *    the API are wrong, searches that the catalogue can answer still
 *    get answered, and Search degrades to what it does today rather
 *    than failing.
 *
 * A wide failure is still reported when the catalogue found nothing.
 * Swallowing it would tell a member that no such film exists, which is
 * a different and worse thing to say than that the house could not
 * reach its catalogue.
 */
function catalogueFirst(wide: FilmProvider): FilmProvider {
  return {
    name: `catalogue+${wide.name}`,

    async search(query, signal) {
      const near = await catalogueProvider.search(query, signal);

      let far: FilmSuggestion[] = [];
      try {
        far = await wide.search(query, signal);
      } catch (error) {
        if (near.length === 0) throw error;
      }

      // Same film from both sources shows once, as the house's own.
      const seen = new Set(near.map(fingerprint));
      const merged = [...near];
      for (const suggestion of far) {
        if (seen.has(fingerprint(suggestion))) continue;
        seen.add(fingerprint(suggestion));
        merged.push(suggestion);
      }
      return merged.slice(0, 8);
    },

    async facts(externalId, signal) {
      return (
        (await catalogueProvider.facts(externalId, signal)) ??
        (await wide.facts(externalId, signal))
      );
    },
  };
}

/**
 * What makes two rows the same film across two catalogues.
 *
 * Title and year, case-folded, with punctuation and spacing removed so
 * "WALL-E" and "WALL·E" collapse together. Not exact: two different
 * films sharing a title and a year would merge. That is rarer than the
 * same film appearing twice, and a duplicate row in an autocomplete is
 * the more visible mistake.
 */
function fingerprint(suggestion: FilmSuggestion): string {
  const title = suggestion.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${title}|${suggestion.releaseYear ?? ""}`;
}

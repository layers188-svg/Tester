import "server-only";

import type { FilmFacts, FilmProvider, FilmSuggestion } from "./types";

/**
 * Wikidata as a metadata source: every film, no account, no key, no bill.
 *
 * The 62-film catalogue was never meant to be the catalogue. It exists
 * so Search could be reviewed before anyone signed up for anything, and
 * the intended widening was TMDB — which wants an account. Wikidata
 * wants nothing: the API is open, anonymous and free, so the house can
 * have a limitless index without owing anybody a signup or a payment.
 *
 * Facts only, exactly as with TMDB. Two things are deliberately never
 * read:
 *
 *   * images. P18 is a still or a poster and House Dark uses neither
 *     (copyright rule), so this module does not even look at it.
 *   * the Wikipedia lead paragraph reaches the browser. It is the
 *     conventional synopsis, which is precisely what a member came to
 *     Search to avoid, so it stays in FilmFacts and never leaves the
 *     server. It is here only as input to the editorial engine.
 *
 * ---------------------------------------------------------------------
 * UNVERIFIED AGAINST THE LIVE ENDPOINT.
 *
 * The container this was written in has no outbound network, so every
 * request below is written from the documented shape of the MediaWiki
 * and Wikidata APIs and tested against recorded payloads in
 * tests/unit/wikidata.test.ts. The parsing is tested. The assumption
 * that Wikidata really answers in that shape is not, and cannot be from
 * here. That is why `provider.ts` composes this behind the catalogue
 * rather than replacing it: if any of this is wrong, Search returns what
 * it returns today instead of breaking.
 * ---------------------------------------------------------------------
 */
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";

/**
 * Wikidata asks anonymous callers to identify themselves. A bare
 * request is the kind that gets a whole platform rate limited, and the
 * house has no business being anonymous about being a machine.
 */
const USER_AGENT = "HouseDark/0.1 (private film club; https://housedark.co)";

/** Property ids, named so the query reads as something other than noise. */
const P_PUBLICATION_DATE = "P577";
const P_DURATION = "P2047";
const P_GENRE = "P136";

/** Units the duration property is expressed in. Q7727 is the minute. */
const Q_MINUTE = "Q7727";
const Q_HOUR = "Q25235";

interface Snak {
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
  rank?: string;
}

interface Entity {
  labels?: Record<string, { value?: string }>;
  claims?: Record<string, Snak[]>;
  sitelinks?: Record<string, { title?: string }>;
}

async function wiki<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { accept: "application/json", "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    // Deliberately not the endpoint's own message, which names hosts,
    // rate limits and query syntax — none of it a member's to see.
    throw new Error(`Wikidata responded ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Film classes, for the search filter.
 *
 * Q11424 is "film". The others are the classes a film is commonly filed
 * under instead, and a member searching for one of those does not care
 * about the distinction.
 */
const FILM_CLASSES = [
  "Q11424", // film
  "Q24869", // feature film
  "Q202866", // animated film
  "Q506240", // television film
  "Q226730", // silent film
];

/** The year out of a Wikidata time value: "+2014-10-10T00:00:00Z". */
function yearFromTime(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const time = (value as { time?: unknown }).time;
  if (typeof time !== "string") return null;
  const year = Number(time.replace(/^[+-]/, "").slice(0, 4));
  return Number.isFinite(year) && year > 1800 ? year : null;
}

/**
 * Runtime in minutes.
 *
 * Wikidata carries the unit alongside the number, and it is not always
 * the minute. Anything in an unrecognised unit is dropped rather than
 * guessed: a runtime of "142" that turns out to have been seconds is
 * worse than no runtime at all, because the member would believe it.
 */
function minutesFromQuantity(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const { amount, unit } = value as { amount?: unknown; unit?: unknown };
  if (typeof amount !== "string") return null;

  const quantity = Number(amount.replace(/^\+/, ""));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const unitId = typeof unit === "string" ? unit.split("/").pop() : null;
  if (unitId === Q_MINUTE) return Math.round(quantity);
  if (unitId === Q_HOUR) return Math.round(quantity * 60);
  // "1" is Wikidata's unitless marker. Durations on films are minutes
  // by overwhelming convention, so an unmarked number is read as one.
  if (unitId === "1") return Math.round(quantity);
  return null;
}

/** The best claim for a property: preferred rank if any, else the first. */
function bestClaim(claims: Snak[] | undefined): unknown {
  if (!claims?.length) return null;
  const preferred = claims.find((claim) => claim.rank === "preferred") ?? claims[0];
  return preferred.mainsnak?.datavalue?.value ?? null;
}

function entityIds(claims: Snak[] | undefined, limit: number): string[] {
  return (claims ?? [])
    .map((claim) => {
      const value = claim.mainsnak?.datavalue?.value;
      if (typeof value !== "object" || value === null) return null;
      const id = (value as { id?: unknown }).id;
      return typeof id === "string" ? id : null;
    })
    .filter((id): id is string => Boolean(id))
    .slice(0, limit);
}

/**
 * The English Wikipedia lead paragraph, if the film has an article.
 *
 * Server-side only, and only ever handed to the editorial engine.
 * Failure is not an error: a film with no article still gets a record,
 * written from its title, year and genres instead.
 */
async function synopsisFor(entity: Entity, signal?: AbortSignal): Promise<string | null> {
  const article = entity.sitelinks?.enwiki?.title;
  if (!article) return null;
  try {
    const summary = await wiki<{ extract?: string }>(
      `${WIKIPEDIA_SUMMARY}/${encodeURIComponent(article.replace(/ /g, "_"))}`,
      signal,
    );
    return summary.extract?.trim() || null;
  } catch {
    return null;
  }
}

/** Labels for a handful of entity ids, for genre names. */
async function labelsFor(ids: string[], signal?: AbortSignal): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const data = await wiki<{ entities?: Record<string, Entity> }>(
      `${WIKIDATA_API}?action=wbgetentities&ids=${ids.join("|")}` +
        `&props=labels&languages=en&format=json&origin=*`,
      signal,
    );
    return ids
      .map((id) => data.entities?.[id]?.labels?.en?.value)
      .filter((label): label is string => Boolean(label));
  } catch {
    // Genres are colour for the editorial prompt, not a fact the member
    // is shown. Losing them is not worth failing the whole lookup.
    return [];
  }
}

export function createWikidataProvider(): FilmProvider {
  return {
    name: "wikidata",

    /**
     * Films, and only films.
     *
     * This used to ask `wbsearchentities` for anything matching the
     * query and then guess from the one-line description, testing it
     * for the word "film". Searching "La La Land" returned the
     * soundtrack album, whose description is "soundtrack album for the
     * 2016 film La La Land" — the heuristic could not have been more
     * confidently wrong. Record labels, articles and songs all read the
     * same way.
     *
     * CirrusSearch can filter on the data instead of on prose:
     * `haswbstatement:P31=Q11424` means "instance of film", which a
     * soundtrack is not, whatever its description says. That costs a
     * second request to turn the returned ids into labels and years,
     * and it is worth it — the first version was fast and wrong.
     *
     * The year now comes from P577 rather than from a number scraped
     * out of the description, so disambiguating two films of the same
     * name is reading a fact instead of a coincidence.
     */
    async search(query, signal) {
      const statements = FILM_CLASSES.map((id) => `haswbstatement:P31=${id}`).join(" OR ");
      const found = await wiki<{ query?: { search?: { title?: string }[] } }>(
        `${WIKIDATA_API}?action=query&list=search&format=json&origin=*&srlimit=8` +
          `&srsearch=${encodeURIComponent(`${query} (${statements})`)}`,
        signal,
      );

      const ids = (found.query?.search ?? [])
        .map((hit) => hit.title)
        .filter((id): id is string => Boolean(id) && /^Q\d+$/.test(id as string));
      if (ids.length === 0) return [];

      const entities = await wiki<{ entities?: Record<string, Entity> }>(
        `${WIKIDATA_API}?action=wbgetentities&ids=${ids.join("|")}` +
          `&props=labels|claims&languages=en&format=json&origin=*`,
        signal,
      );

      return ids
        .map((id) => {
          const entity = entities.entities?.[id];
          const title = entity?.labels?.en?.value;
          if (!title) return null;
          return {
            provider: "wikidata",
            externalId: id,
            title,
            releaseYear: yearFromTime(bestClaim(entity?.claims?.[P_PUBLICATION_DATE])),
          } satisfies FilmSuggestion;
        })
        .filter((row): row is FilmSuggestion => row !== null);
    },

    async facts(externalId, signal) {
      if (!/^Q\d+$/.test(externalId)) return null;

      const data = await wiki<{ entities?: Record<string, Entity> }>(
        `${WIKIDATA_API}?action=wbgetentities&ids=${externalId}` +
          `&props=labels|claims|sitelinks&languages=en&sitefilter=enwiki&format=json&origin=*`,
        signal,
      );

      const entity = data.entities?.[externalId];
      const title = entity?.labels?.en?.value;
      if (!entity || !title) return null;

      const [genres, synopsis] = await Promise.all([
        labelsFor(entityIds(entity.claims?.[P_GENRE], 5), signal),
        synopsisFor(entity, signal),
      ]);

      return {
        provider: "wikidata",
        externalId,
        title,
        releaseYear: yearFromTime(bestClaim(entity.claims?.[P_PUBLICATION_DATE])),
        runtimeMinutes: minutesFromQuantity(bestClaim(entity.claims?.[P_DURATION])),
        genres,
        synopsis,
      } satisfies FilmFacts;
    },
  };
}

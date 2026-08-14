import type { FilmFacts, FilmProvider, FilmSuggestion } from "./types";

/**
 * A small local catalogue, used when no metadata key is configured.
 *
 * Not a mock in the sense of a stub that pretends: it is a real
 * provider over a real, small dataset, and everything downstream of it
 * — caching, validation, the six-word contract, the whole Search
 * journey — runs exactly as it does against TMDB. Swapping in a key
 * widens the catalogue and changes nothing else.
 *
 * It exists because Search that cannot be used until someone buys an
 * API key is Search that nobody has reviewed. The films here are the
 * ones House Dark has already programmed plus the fixtures in the
 * Search brief, so the feature can be walked end to end today.
 *
 * `synopsis` is present because the editorial engine takes factual
 * context. It never leaves the server.
 */
interface CatalogueEntry extends FilmFacts {
  /**
   * The house's own six words, where they have been written by hand.
   *
   * These are seeds for the record, not a bypass of validation: they go
   * through the same exactly-six-words check as anything a model
   * returns, because a typo here would otherwise be the one description
   * that escaped it.
   */
  editorial?: {
    sixWordPlot: string;
    territory: string[];
    pace: string;
    intensity: string;
  };
}

const CATALOGUE: CatalogueEntry[] = [
  {
    provider: "catalogue",
    externalId: "whiplash-2014",
    title: "Whiplash",
    releaseYear: 2014,
    runtimeMinutes: 106,
    genres: ["Drama", "Music"],
    synopsis:
      "A young jazz drummer at a competitive conservatory comes under the instruction of a teacher who believes cruelty produces greatness.",
    editorial: {
      sixWordPlot: "Drummer chases greatness under brutal mentorship.",
      territory: ["Ambition", "Obsession", "Power"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    // The duplicate title the brief asks Search to disambiguate.
    provider: "catalogue",
    externalId: "whiplash-2002",
    title: "Whiplash",
    releaseYear: 2002,
    runtimeMinutes: 88,
    genres: ["Thriller"],
    synopsis: "A man's life unravels after a road accident.",
  },
  {
    provider: "catalogue",
    externalId: "parasite-2019",
    title: "Parasite",
    releaseYear: 2019,
    runtimeMinutes: 132,
    genres: ["Drama", "Thriller"],
    synopsis:
      "A family living in a semi-basement apartment begins working, one by one, for a wealthy household.",
    editorial: {
      sixWordPlot: "Struggling family enters wealthy household's orbit.",
      territory: ["Class", "Deception", "Pressure"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "portrait-2019",
    title: "Portrait of a Lady on Fire",
    releaseYear: 2019,
    runtimeMinutes: 122,
    genres: ["Drama", "Romance"],
    synopsis:
      "On a remote island, a painter is commissioned to paint a wedding portrait of a young woman without her knowing.",
    editorial: {
      sixWordPlot: "Painter observes woman she must portray.",
      territory: ["Desire", "Memory", "Restraint"],
      pace: "Measured",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "burning-2018",
    title: "Burning",
    releaseYear: 2018,
    runtimeMinutes: 148,
    genres: ["Drama", "Mystery"],
    synopsis:
      "A young deliveryman reconnects with a woman from his childhood, and later meets a wealthy man she has befriended.",
    editorial: {
      sixWordPlot: "Young man searches through unsettling absence.",
      territory: ["Jealousy", "Doubt", "Obsession"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "florida-project-2017",
    title: "The Florida Project",
    releaseYear: 2017,
    runtimeMinutes: 111,
    genres: ["Drama"],
    synopsis:
      "A six-year-old and her friends spend a summer in a budget motel outside Orlando while her mother struggles to pay the rent.",
    editorial: {
      sixWordPlot: "Childhood flourishes beside adult instability daily.",
      territory: ["Childhood", "Precarity", "Freedom"],
      pace: "Wandering",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "in-the-mood-for-love-2000",
    title: "In the Mood for Love",
    releaseYear: 2000,
    runtimeMinutes: 98,
    genres: ["Drama", "Romance"],
    synopsis:
      "Two neighbours in 1960s Hong Kong come to suspect their spouses of an affair, and begin spending time together.",
    editorial: {
      sixWordPlot: "Neighbours grow close at impossible moment.",
      territory: ["Longing", "Restraint", "Timing"],
      pace: "Measured",
      intensity: "Low",
    },
  },
];

/** Case and punctuation insensitive, so "portrait of a lady" finds it. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const catalogueProvider: FilmProvider = {
  name: "catalogue",

  async search(query: string): Promise<FilmSuggestion[]> {
    const q = normalise(query);
    if (q.length === 0) return [];

    return (
      CATALOGUE.filter((entry) => normalise(entry.title).includes(q))
        // Newest first, so the film someone means by "Whiplash" is usually
        // the one at the top without them having to think about it.
        .sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0))
        .map((entry) => ({
          provider: entry.provider,
          externalId: entry.externalId,
          title: entry.title,
          releaseYear: entry.releaseYear,
        }))
    );
  },

  async facts(externalId: string): Promise<FilmFacts | null> {
    return CATALOGUE.find((entry) => entry.externalId === externalId) ?? null;
  },
};

/** The hand-written six words for a catalogue film, if it has any. */
export function catalogueEditorial(externalId: string): CatalogueEntry["editorial"] | null {
  return CATALOGUE.find((entry) => entry.externalId === externalId)?.editorial ?? null;
}

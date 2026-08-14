/**
 * Search's two halves, kept apart on purpose.
 *
 * `FilmFacts` is what a metadata provider knows: title, year, runtime,
 * and a synopsis. `FilmEditorial` is what House Dark says: six words,
 * territory, pace, intensity.
 *
 * The synopsis lives only in `FilmFacts` and only on the server. It is
 * input to the editorial engine and is never returned to the browser —
 * it is exactly the thing a member came here to avoid reading.
 */
export interface FilmFacts {
  provider: string;
  externalId: string;
  title: string;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  genres: string[];
  /** Server-side only. Never serialised to a client response. */
  synopsis: string | null;
}

/** What a member sees in the autocomplete: enough to tell two films apart. */
export interface FilmSuggestion {
  provider: string;
  externalId: string;
  title: string;
  releaseYear: number | null;
}

export interface FilmEditorial {
  sixWordPlot: string;
  territory: string[];
  pace: string | null;
  intensity: string | null;
}

/** The whole House Dark record, as a member receives it. */
export interface FilmRecord extends FilmEditorial {
  provider: string;
  externalId: string;
  title: string;
  releaseYear: number | null;
  runtimeMinutes: number | null;
  contentNotes: string | null;
}

/**
 * A metadata source. Two implementations exist: TMDB when a key is
 * configured, and a small local catalogue when one is not.
 *
 * The interface takes a free-text query rather than a title so that a
 * later natural-language phase ("something tense under two hours") can
 * be another implementation rather than a rewrite of everything that
 * calls this.
 */
export interface FilmProvider {
  readonly name: string;
  search(query: string, signal?: AbortSignal): Promise<FilmSuggestion[]>;
  facts(externalId: string, signal?: AbortSignal): Promise<FilmFacts | null>;
}

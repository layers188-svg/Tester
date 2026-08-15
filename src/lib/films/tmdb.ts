import "server-only";

import type { FilmProvider, FilmSuggestion } from "./types";

/**
 * TMDB as a metadata source.
 *
 * Facts only. Everything this returns is either shown as a bare fact
 * (title, year, runtime) or used server-side as input to the editorial
 * engine. Two things it offers are deliberately never read:
 *
 *   * images. `poster_path` and `backdrop_path` are film marketing
 *     artwork and House Dark does not use any (copyright rule), so this
 *     module does not even build the URLs.
 *   * `overview` reaches the browser. It is the conventional synopsis —
 *     precisely what a member came to Search to avoid — so it stays in
 *     FilmFacts, which is server-only.
 *
 * The key is read from the environment at call time rather than at
 * module load, so the app boots without one and Search falls back to
 * the local catalogue instead of crashing.
 */
const BASE = "https://api.themoviedb.org/3";

interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
}

interface TmdbDetail {
  id: number;
  title?: string;
  release_date?: string;
  runtime?: number | null;
  overview?: string;
  genres?: { name: string }[];
}

function yearFrom(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) && year > 1800 ? year : null;
}

async function tmdb<T>(path: string, key: string, signal?: AbortSignal): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(key)}`;
  const response = await fetch(url, { signal, headers: { accept: "application/json" } });

  if (!response.ok) {
    // Deliberately not the provider's own message. A member must never
    // meet "Invalid API key: You must be granted a valid key."
    throw new Error(`TMDB responded ${response.status}`);
  }
  return (await response.json()) as T;
}

export function createTmdbProvider(apiKey: string): FilmProvider {
  return {
    name: "tmdb",

    async search(query, signal) {
      const data = await tmdb<{ results: TmdbSearchResult[] }>(
        `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
        apiKey,
        signal,
      );

      return (data.results ?? [])
        .slice(0, 8)
        .map((result): FilmSuggestion => ({
          provider: "tmdb",
          externalId: String(result.id),
          title: result.title ?? result.name ?? "Untitled",
          releaseYear: yearFrom(result.release_date),
        }))
        .filter((suggestion) => suggestion.title !== "Untitled");
    },

    async facts(externalId, signal) {
      const detail = await tmdb<TmdbDetail>(
        `/movie/${encodeURIComponent(externalId)}?language=en-US`,
        apiKey,
        signal,
      );
      if (!detail?.id) return null;

      return {
        provider: "tmdb",
        externalId: String(detail.id),
        title: detail.title ?? "Untitled",
        releaseYear: yearFrom(detail.release_date),
        runtimeMinutes: detail.runtime ?? null,
        genres: (detail.genres ?? []).map((genre) => genre.name),
        synopsis: detail.overview?.trim() || null,
      };
    },
  };
}

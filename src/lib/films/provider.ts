import "server-only";

import { catalogueProvider } from "./catalogue";
import { createTmdbProvider } from "./tmdb";
import type { FilmProvider } from "./types";

/**
 * Which catalogue Search is running against.
 *
 * TMDB when a key is configured, the local catalogue otherwise. The
 * fallback is not a degraded mode to be ashamed of: every downstream
 * step — caching, six-word validation, the whole journey — behaves
 * identically, so the feature is reviewable before anyone signs up for
 * an API key, and adding one widens the catalogue without changing a
 * line of the code that uses this.
 *
 * Read per call rather than memoised at module load. The Workers
 * runtime can hand a module a different environment between requests,
 * and a provider captured once at boot is a provider that keeps using
 * yesterday's key.
 */
export function getFilmProvider(): FilmProvider {
  const key = process.env.TMDB_API_KEY?.trim();
  return key ? createTmdbProvider(key) : catalogueProvider;
}

/** Whether the wide catalogue is available, for honest empty-state copy. */
export function hasWideCatalogue(): boolean {
  return Boolean(process.env.TMDB_API_KEY?.trim());
}

import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { catalogueEditorial } from "./catalogue";
import { EditorialUnavailableError, generateEditorial, validateEditorial } from "./editorial";
import { getFilmProvider } from "./provider";
import type { FilmRecord } from "./types";

/**
 * The House Dark record for a film, fetched or written.
 *
 * The flow the brief describes, in order:
 *
 *   1. do we already have one? return it
 *   2. no: get the facts from the provider
 *   3. write the House Dark version
 *   4. validate exactly six words
 *   5. store it
 *   6. return it
 *
 * Step 1 first matters for more than speed. Everybody is meant to read
 * the same six words, so once a film has been described the description
 * is a fact about the house rather than a fresh opinion per visitor.
 *
 * Writes go through the service role. `film_records` has no member
 * insert policy on purpose (migration 0021): one member generating the
 * text the whole house then reads is not something to leave to a
 * client.
 */
export class FilmNotFoundError extends Error {
  constructor() {
    super("No such film.");
    this.name = "FilmNotFoundError";
  }
}

interface Row {
  provider: string;
  external_id: string;
  title: string;
  release_year: number | null;
  runtime_minutes: number | null;
  six_word_plot: string;
  territory: string[] | null;
  pace: string | null;
  intensity: string | null;
  content_notes: string | null;
  editorial_state: string;
}

function toRecord(row: Row): FilmRecord {
  return {
    provider: row.provider,
    externalId: row.external_id,
    title: row.title,
    releaseYear: row.release_year,
    runtimeMinutes: row.runtime_minutes,
    sixWordPlot: row.six_word_plot,
    territory: row.territory ?? [],
    pace: row.pace,
    intensity: row.intensity,
    contentNotes: row.content_notes,
  };
}

export async function getFilmRecord(
  provider: string,
  externalId: string,
  signal?: AbortSignal,
): Promise<FilmRecord> {
  const service = getServiceSupabase();

  const { data: existing } = await service
    .from("film_records")
    .select("*")
    .eq("provider", provider)
    .eq("external_id", externalId)
    .maybeSingle();

  if (existing) {
    const row = existing as unknown as Row;
    /*
     * A rejected description is withheld rather than shown. The house
     * has looked at it and decided it gives too much away, and the
     * honest answer to the member is that nothing has been written yet
     * — not a description nobody stands behind.
     */
    if (row.editorial_state === "rejected") throw new FilmNotFoundError();
    return toRecord(row);
  }

  const facts = await getFilmProvider().facts(externalId, signal);
  if (!facts) throw new FilmNotFoundError();

  /*
   * A hand-written description wins over a generated one.
   *
   * It still goes through `validateEditorial`, so the six-word rule is
   * enforced on the house's own writing exactly as it is on the
   * model's. A typo in a hand-written entry would otherwise be the one
   * description that escaped the check.
   */
  const handWritten = catalogueEditorial(externalId);
  const editorial = handWritten
    ? validateEditorial(handWritten)
    : await generateEditorial(facts, signal);

  const { data: inserted, error } = await service
    .from("film_records")
    .insert({
      provider: facts.provider,
      external_id: facts.externalId,
      title: facts.title,
      release_year: facts.releaseYear,
      runtime_minutes: facts.runtimeMinutes,
      six_word_plot: editorial.sixWordPlot,
      territory: editorial.territory,
      pace: editorial.pace,
      intensity: editorial.intensity,
      editorial_state: handWritten ? "approved" : "generated",
    })
    .select("*")
    .single();

  if (error || !inserted) {
    /*
     * Two members searching the same unwritten film at once will race,
     * and one insert loses on the unique index. That is not an error
     * worth showing anybody: read the winner's row and hand it back.
     */
    const { data: raced } = await service
      .from("film_records")
      .select("*")
      .eq("provider", facts.provider)
      .eq("external_id", facts.externalId)
      .maybeSingle();

    if (raced) return toRecord(raced as unknown as Row);

    // The description exists but could not be stored. Returning it
    // unstored is better than failing: the member gets their answer,
    // and the next search regenerates.
    return {
      provider: facts.provider,
      externalId: facts.externalId,
      title: facts.title,
      releaseYear: facts.releaseYear,
      runtimeMinutes: facts.runtimeMinutes,
      contentNotes: null,
      ...editorial,
    };
  }

  return toRecord(inserted as unknown as Row);
}

export { EditorialUnavailableError };

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { countWords } from "@/lib/validation/six-words";

/**
 * House records — the editorial line behind every Trust Us
 * recommendation (handover 00_BUILD_BRIEF_FINAL.md §4
 * "Recommendation generation").
 *
 * A record is written here and only offered to a member once an owner
 * approves it, which is what makes the copy "versioned" and "stable
 * across users until a new version is approved" rather than something a
 * generator emits per request. Editing an approved record clears the
 * approval and bumps the version: a changed six-word line is a new
 * line, and it goes back through a human before anyone reads it.
 *
 * The six-word line is exactly six words. The database says so too
 * (film_house_records_six_words), and this check exists to give the
 * Desk a sentence instead of a constraint violation.
 */

const schema = z.object({
  filmTitle: z.string().trim().min(1).max(200),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  runtimeMinutes: z.number().int().min(1).max(1000),
  sixWordsBefore: z.string().trim().min(1).max(160),
  territories: z.array(z.string().trim().min(1).max(48)).min(1).max(6),
  pace: z.string().trim().max(48).nullable().optional(),
  intensity: z.string().trim().max(48).nullable().optional(),
  approve: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the record and try again." }, { status: 400 });
  }

  const line = parsed.data.sixWordsBefore.replace(/\s+/g, " ").trim();
  if (countWords(line) !== 6) {
    return NextResponse.json(
      { error: `Six words exactly — that is ${countWords(line)}.` },
      { status: 422 },
    );
  }

  const territories = [...new Set(parsed.data.territories.map((t) => t.trim()))];

  // The film may already exist (it may be a past opening). Match on
  // title and year rather than creating a duplicate row, which would
  // split a film's records in two. A film with no year on record is
  // matched by `is null` — `eq` against null matches nothing in
  // PostgREST, which would have quietly created a second row every
  // time an undated film was edited.
  const releaseYear = parsed.data.releaseYear ?? null;
  const filmMatch = supabase.from("films").select("id").eq("title", parsed.data.filmTitle);
  const { data: existingFilm } = await (
    releaseYear === null
      ? filmMatch.is("release_year", null)
      : filmMatch.eq("release_year", releaseYear)
  ).maybeSingle();

  let filmId = existingFilm?.id;
  if (!filmId) {
    const { data: film, error: filmError } = await supabase
      .from("films")
      .insert({
        title: parsed.data.filmTitle,
        release_year: parsed.data.releaseYear ?? null,
        runtime_minutes: parsed.data.runtimeMinutes,
      })
      .select("id")
      .single();
    if (filmError || !film) {
      return NextResponse.json({ error: "Could not record that film." }, { status: 400 });
    }
    filmId = film.id;
  }

  const { data: previous } = await supabase
    .from("film_house_records")
    .select("version")
    .eq("film_id", filmId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("film_house_records")
    .upsert(
      {
        film_id: filmId,
        six_words_before: line,
        territories,
        pace: parsed.data.pace ?? null,
        intensity: parsed.data.intensity ?? null,
        generated_at: new Date().toISOString(),
        version: (previous?.version ?? 0) + 1,
        editorial_approved_at: parsed.data.approve ? new Date().toISOString() : null,
        approved_by: parsed.data.approve ? owner.userId : null,
      },
      { onConflict: "film_id" },
    )
    .select("film_id, version, editorial_approved_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not save." }, { status: 400 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

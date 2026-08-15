import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateRecommendationNote } from "@/lib/validation/six-words";

/**
 * Films a member adds to their own Library, outside House Dark
 * programming.
 *
 * These never touch `films`. That table is the protected side of the
 * spoiler boundary — it holds the titles behind sealed openings — and a
 * member-writable row has no business in it. See migration 0018.
 *
 * RLS does the ownership work: every policy on `library_entries` is
 * `user_id = auth.uid()`, so a forged user_id in the body cannot insert
 * for someone else. The id is taken from the session here regardless.
 */
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  runtimeMinutes: z.number().int().min(1).max(1000).nullable().optional(),
  state: z.enum(["saved", "watched"]).default("watched"),
  sixWords: z.string().trim().max(140).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the film and try again." }, { status: 400 });
  }

  // Their own six words on it follow the same rule as a note: six or
  // fewer, and optional.
  const note = validateRecommendationNote(parsed.data.sixWords ?? "");
  if (!note.valid) {
    return NextResponse.json({ error: note.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("library_entries")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      release_year: parsed.data.releaseYear ?? null,
      runtime_minutes: parsed.data.runtimeMinutes ?? null,
      state: parsed.data.state,
      watched_at: parsed.data.state === "watched" ? new Date().toISOString() : null,
      six_words: note.normalized || null,
    })
    .select()
    .single();

  if (error) {
    // The unique index is per member per title and year, so this is
    // "you already have it" rather than a failure worth alarming about.
    const already = error.code === "23505";
    return NextResponse.json(
      { error: already ? "That film is already in your Library." : "Could not add that film." },
      { status: already ? 409 : 400 },
    );
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which film?" }, { status: 400 });
  }

  // RLS restricts this to the member's own rows; no user_id filter is
  // needed here and adding one would imply the policy is not trusted.
  const { error } = await supabase.from("library_entries").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not remove that film." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

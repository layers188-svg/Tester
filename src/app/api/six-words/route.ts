import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateSixWords } from "@/lib/validation/six-words";
import { enqueueNotification } from "@/lib/email/queue";

const createSchema = z
  .object({
    openingId: z.string().uuid().optional(),
    sealedRecommendationId: z.string().uuid().optional(),
    body: z.string().min(1).max(200),
  })
  .refine((v) => Boolean(v.openingId) !== Boolean(v.sealedRecommendationId), {
    message: "Provide exactly one of openingId or sealedRecommendationId.",
  });

/** Six words, enforced server-side regardless of what the client already checked (brief §7 rule 1). */
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validation = validateSixWords(parsed.data.body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("six_word_reviews")
    .insert({
      user_id: user.id,
      opening_id: parsed.data.openingId ?? null,
      sealed_recommendation_id: parsed.data.sealedRecommendationId ?? null,
      body: validation.normalized,
      word_count: validation.wordCount,
      visibility: "circle",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save your six words." }, { status: 400 });
  }

  await enqueueNotification({ userId: user.id, type: "after_credits", payload: {} });

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(1).max(200),
});

export async function PATCH(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validation = validateSixWords(parsed.data.body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  // RLS + guard_six_word_review_update enforce ownership and the five
  // minute edit window at the database layer — a failure here surfaces
  // as a Postgres error, not a silent no-op.
  const { data, error } = await supabase
    .from("six_word_reviews")
    .update({ body: validation.normalized, word_count: validation.wordCount })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

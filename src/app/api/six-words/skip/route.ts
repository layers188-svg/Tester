import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z
  .object({
    openingId: z.string().uuid().optional(),
    sealedRecommendationId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.openingId) !== Boolean(v.sealedRecommendationId), {
    message: "Provide exactly one of openingId or sealedRecommendationId.",
  });

/**
 * "Skip for now" (handover 00_BUILD_BRIEF_FINAL.md §3): the member has
 * watched and has nothing they want to write. The Room opens anyway.
 *
 * All of the work is in skip_review() (0013_review_decision.sql), which
 * refuses unless there is a watch on record — so this route cannot be
 * used to open the Room without watching. Nothing here writes a review:
 * a skip is the absence of one, and inventing a blank row would put a
 * silent quote into The Room, the Library and the public site.
 */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("skip_review", {
    p_opening_id: parsed.data.openingId ?? null,
    p_sealed_recommendation_id: parsed.data.sealedRecommendationId ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ skippedAt: data }, { headers: { "Cache-Control": "no-store" } });
}

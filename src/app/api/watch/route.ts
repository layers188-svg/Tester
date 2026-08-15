import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record";
import { openingNumberFor } from "@/lib/analytics/opening-number";
import type { AnalyticsEvent } from "@/lib/analytics/events";

const bodySchema = z
  .object({
    openingId: z.string().uuid().optional(),
    sealedRecommendationId: z.string().uuid().optional(),
    state: z.enum(["saved", "opened_service", "watched"]),
  })
  .refine((v) => Boolean(v.openingId) !== Boolean(v.sealedRecommendationId), {
    message: "Provide exactly one of openingId or sealedRecommendationId.",
  });

/**
 * Records save/open/watch state. Carries only opaque ids and an enum —
 * never a title (brief §15 analytics rule applies equally to this
 * network response).
 */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { openingId, sealedRecommendationId, state } = parsed.data;

  const { data: existing } = await supabase
    .from("watches")
    .select("id")
    .eq("user_id", user.id)
    .eq(openingId ? "opening_id" : "sealed_recommendation_id", openingId ?? sealedRecommendationId!)
    .maybeSingle();

  const patch = {
    user_id: user.id,
    opening_id: openingId ?? null,
    sealed_recommendation_id: sealedRecommendationId ?? null,
    state,
    watched_at: state === "watched" ? new Date().toISOString() : null,
  };

  const { data, error } = existing
    ? await supabase.from("watches").update(patch).eq("id", existing.id).select().single()
    : await supabase.from("watches").insert(patch).select().single();

  if (sealedRecommendationId && state === "watched") {
    await supabase
      .from("sealed_recommendation_recipients")
      .update({ watched_at: new Date().toISOString() })
      .eq("recommendation_id", sealedRecommendationId)
      .eq("recipient_id", user.id);
  }

  if (error) {
    return NextResponse.json({ error: "Could not update watch state." }, { status: 400 });
  }

  // Brief §15 events 6, 7 and 8 are the three watch states.
  const eventForState: Record<typeof state, AnalyticsEvent> = {
    saved: "saved_for_later",
    opened_service: "provider_handoff_selected",
    watched: "marked_watched",
  };
  await recordAnalyticsEvent({
    event: eventForState[state],
    actorId: user.id,
    openingNumber: await openingNumberFor(supabase, openingId),
  });

  return NextResponse.json(
    { id: data.id, state: data.state },
    { headers: { "Cache-Control": "no-store" } },
  );
}

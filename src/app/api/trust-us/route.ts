import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Trust Us (handover 00_BUILD_BRIEF_FINAL.md §4).
 *
 * One recommendation per request, because
 * get_trust_us_recommendation() returns at most one row. There is no
 * page parameter, no limit parameter and no list shape — the route
 * cannot be made to hand back a catalogue, which is the product rule
 * rather than an implementation detail.
 *
 * POST rather than GET on purpose. A GET is prefetchable and cacheable,
 * and "Seen it" is a state change: the member is telling the House they
 * have already seen this one, which retires it. A prefetched GET would
 * advance the sequence without anybody asking.
 */

const requestSchema = z.object({
  territory: z.string().trim().min(1).max(48),
  /** Present when the member is answering the recommendation they were given. */
  respondTo: z
    .object({
      filmId: z.string().uuid(),
      response: z.enum(["seen", "trusted"]),
    })
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { territory, respondTo } = parsed.data;

  // The response is recorded first, so the recommendation that comes
  // back already excludes it. One round trip per press, and no window
  // in which the same film could be handed back.
  if (respondTo) {
    const { error } = await supabase.rpc("record_trust_us_response", {
      p_film_id: respondTo.filmId,
      p_territory: territory,
      p_response: respondTo.response,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Trust us closes the sequence down rather than opening more —
    // §4: "TRUST US closes the information down". Nothing further is
    // fetched.
    if (respondTo.response === "trusted") {
      return NextResponse.json(
        { recommendation: null, accepted: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const { data, error } = await supabase.rpc("get_trust_us_recommendation", {
    p_territory: territory,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { recommendation: data?.[0] ?? null, accepted: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}

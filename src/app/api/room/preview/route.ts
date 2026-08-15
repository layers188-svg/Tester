import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z.object({ openingId: z.string().uuid() });

/**
 * One voice, for the Room preview on Tonight.
 *
 * The preview exists so that the quote a member can see before they
 * enter is the same quote that travels with them into the Room
 * (motion system §10 step 5). That only works if Tonight actually has
 * one, and Tonight cannot know whether the Room opened until the member
 * marks watched and decides — which happens after the page was
 * rendered. So it asks.
 *
 * All of the eligibility lives in get_room_voices(), which raises
 * before returning anything if the Room is not open. A closed Room gets
 * a null voice here rather than an error, because a member who has not
 * finished the picture is not a failure — they simply have no preview.
 *
 * POST, not GET: a GET would be prefetchable, and this reads other
 * members' words.
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

  const { data, error } = await supabase.rpc("get_room_voices", {
    p_opening_id: parsed.data.openingId,
    p_sealed_recommendation_id: null,
    p_limit: 4,
  });

  if (error) {
    return NextResponse.json({ voice: null }, { headers: { "Cache-Control": "no-store" } });
  }

  // A Circle voice if there is one — the preview is about the people
  // the member trusts — and otherwise whatever the House offered.
  const voices = data ?? [];
  const voice = voices.find((row) => row.source === "circle") ?? voices[0] ?? null;

  return NextResponse.json(
    { voice: voice ? { body: voice.body, author: voice.author_display_name } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

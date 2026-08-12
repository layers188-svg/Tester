import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

const schema = z.object({ inviteCode: z.string().trim().min(1) });

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
    return NextResponse.json({ error: "Enter an invite code." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("join_circle_by_code", {
    p_invite_code: parsed.data.inviteCode,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "That code was not recognised." },
      { status: 400 },
    );
  }

  // Brief §15 event 11. The invite code itself is never recorded — it
  // is a shared secret, and the event only needs to say that one was
  // accepted.
  await recordAnalyticsEvent({ event: "circle_invitation_accepted", actorId: user.id });

  return NextResponse.json({ circleId: data }, { headers: { "Cache-Control": "no-store" } });
}

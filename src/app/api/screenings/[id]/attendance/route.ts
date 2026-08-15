import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

const schema = z.object({ response: z.enum(["attending", "maybe", "declined"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid response." }, { status: 400 });
  }

  const { error } = await supabase
    .from("screening_attendance")
    .upsert(
      { screening_id: id, user_id: user.id, response: parsed.data.response },
      { onConflict: "screening_id,user_id" },
    );

  if (error) {
    return NextResponse.json({ error: "Could not save your response." }, { status: 400 });
  }

  // Brief §15 event 12. The response is the one variant the allowlisted
  // `detail` column exists for; the screening id stays out of it.
  await recordAnalyticsEvent({
    event: "screening_attendance_response",
    actorId: user.id,
    detail: parsed.data.response,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

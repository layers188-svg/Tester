import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z.object({
  nightlyOpening: z.boolean().optional(),
  sealedRecommendations: z.boolean().optional(),
  screeningReminders: z.boolean().optional(),
  afterCredits: z.boolean().optional(),
  editorialEdm: z.boolean().optional(),
});

export async function PATCH(request: Request) {
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

  const patch: Record<string, boolean> = {};
  if (parsed.data.nightlyOpening !== undefined) patch.nightly_opening = parsed.data.nightlyOpening;
  if (parsed.data.sealedRecommendations !== undefined)
    patch.sealed_recommendations = parsed.data.sealedRecommendations;
  if (parsed.data.screeningReminders !== undefined)
    patch.screening_reminders = parsed.data.screeningReminders;
  if (parsed.data.afterCredits !== undefined) patch.after_credits = parsed.data.afterCredits;
  if (parsed.data.editorialEdm !== undefined) patch.editorial_edm = parsed.data.editorialEdm;

  const { error } = await supabase
    .from("email_preferences")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: "Could not save." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

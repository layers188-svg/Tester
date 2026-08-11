import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateCues } from "@/lib/validation/cues";
import { enqueueNotification } from "@/lib/email/queue";

const schema = z.object({
  filmTitle: z.string().trim().min(1).max(200),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  runtimeMinutes: z.number().int().min(1).max(1000),
  recipientIds: z.array(z.string().uuid()).min(1),
  personalNote: z.string().trim().max(500).nullable().optional(),
  cues: z.array(z.string().trim().max(24)).max(3).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  circleId: z.string().uuid().nullable().optional(),
});

/**
 * Sends a film under seal (brief Journey B/C). The film title is sent
 * only as far as create_sealed_recommendation() — a security definer
 * Postgres function that resolves/creates the films row internally and
 * returns just a recommendation id. Nothing in this route's own
 * response ever includes the title.
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
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const cueValidation = validateCues(parsed.data.cues ?? []);
  if (!cueValidation.valid) {
    return NextResponse.json({ error: cueValidation.error }, { status: 400 });
  }

  const { data: recommendationId, error } = await supabase.rpc("create_sealed_recommendation", {
    p_film_title: parsed.data.filmTitle,
    p_release_year: parsed.data.releaseYear ?? null,
    p_runtime_minutes: parsed.data.runtimeMinutes,
    p_recipient_ids: parsed.data.recipientIds,
    p_personal_note: parsed.data.personalNote ?? null,
    p_cues: cueValidation.cues,
    p_scheduled_for: parsed.data.scheduledFor ?? null,
    p_circle_id: parsed.data.circleId ?? null,
  });

  if (error || !recommendationId) {
    return NextResponse.json({ error: error?.message ?? "Could not send that." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await Promise.all(
    parsed.data.recipientIds.map((recipientId) =>
      enqueueNotification({
        userId: recipientId,
        type: "sealed_recommendation",
        payload: { senderDisplayName: profile?.display_name ?? "A friend" },
      }),
    ),
  );

  return NextResponse.json({ id: recommendationId }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";

const schema = z.object({
  moderationState: z.enum(["visible", "hidden", "removed"]).optional(),
  visibility: z.enum(["private", "circle", "house_approved"]).optional(),
});

/** Owner/moderator can hide or remove a review, or curate it for the public site — never rewrite its body (brief §11 rule 8). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.moderationState) patch.moderation_state = parsed.data.moderationState;
  if (parsed.data.visibility) patch.visibility = parsed.data.visibility;

  const { error } = await supabase.from("six_word_reviews").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update the review." }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "review.moderated",
    target_type: "six_word_reviews",
    target_id: id,
    safe_metadata: patch,
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { canTransitionOpeningStatus } from "@/lib/opening/state";

const schema = z.object({
  status: z.enum(["draft", "approved", "scheduled", "open", "closed"]),
  opensAt: z.string().datetime().optional(),
});

/** Forward-only opening lifecycle (brief §16 resilience rule 5 — re-applying the same status is a safe no-op). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data: opening } = await supabase
    .from("openings")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  if (!canTransitionOpeningStatus(opening.status, parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot move an opening from ${opening.status} to ${parsed.data.status}.` },
      { status: 400 },
    );
  }

  if (parsed.data.status === "scheduled") {
    const { data: secret } = await supabase
      .from("opening_secrets")
      .select("approved_at")
      .eq("opening_id", id)
      .maybeSingle();
    if (!secret?.approved_at) {
      return NextResponse.json(
        { error: "Approve the opening before scheduling it." },
        { status: 400 },
      );
    }
  }

  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.opensAt) patch.opens_at = parsed.data.opensAt;

  const { error } = await supabase.from("openings").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not update the opening." }, { status: 400 });
  }

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "opening.status_changed",
    target_type: "openings",
    target_id: id,
    safe_metadata: { from: opening.status, to: parsed.data.status },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

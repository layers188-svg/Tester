import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { validateCues } from "@/lib/validation/cues";

const schema = z.object({
  contentNotes: z.string().trim().max(1000).nullable().optional(),
  availabilityCount: z.number().int().min(0).max(999).optional(),
  minimumAccessType: z.enum(["subscription", "rental", "free", "mixed", "unknown"]).optional(),
  cues: z.array(z.string().trim().max(24)).max(3).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.contentNotes !== undefined) patch.content_notes = parsed.data.contentNotes;
  if (parsed.data.availabilityCount !== undefined)
    patch.availability_count = parsed.data.availabilityCount;
  if (parsed.data.minimumAccessType !== undefined)
    patch.minimum_access_type = parsed.data.minimumAccessType;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("openings").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not save." }, { status: 400 });
  }

  if (parsed.data.cues) {
    const cueValidation = validateCues(parsed.data.cues);
    if (!cueValidation.valid)
      return NextResponse.json({ error: cueValidation.error }, { status: 400 });

    await supabase.from("opening_cues").delete().eq("opening_id", id);
    if (cueValidation.cues.length > 0) {
      await supabase
        .from("opening_cues")
        .insert(cueValidation.cues.map((cue, i) => ({ opening_id: id, cue, sort_order: i })));
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

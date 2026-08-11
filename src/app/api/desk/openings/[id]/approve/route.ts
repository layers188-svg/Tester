import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";

/** Human spoiler and rights approval (brief §12 opening workflow rule 9). Mandatory before scheduling. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const { data: opening } = await supabase
    .from("openings")
    .select("no_trailer_storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!opening) return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  if (opening.no_trailer_storage_path === "pending-upload") {
    return NextResponse.json({ error: "Upload the No Trailer before approving." }, { status: 400 });
  }

  const { error } = await supabase
    .from("opening_secrets")
    .update({ approved_at: new Date().toISOString(), approved_by: owner.userId })
    .eq("opening_id", id);

  if (error) {
    return NextResponse.json({ error: "Could not approve." }, { status: 400 });
  }

  await supabase.from("openings").update({ status: "approved" }).eq("id", id).eq("status", "draft");

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "opening.approved",
    target_type: "openings",
    target_id: id,
    safe_metadata: {},
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

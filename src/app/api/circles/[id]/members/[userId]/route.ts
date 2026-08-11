import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Organiser (or owner) removes a member — RLS circle_members_delete enforces who may call this. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Could not remove that member." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

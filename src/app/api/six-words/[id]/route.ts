import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Deletion is always allowed for the author, at any time (brief §7 rule 5). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase.from("six_word_reviews").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not delete." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

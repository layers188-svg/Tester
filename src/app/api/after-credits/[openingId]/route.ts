import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * After Credits for one opening.
 *
 * The gate is in the database, not here: `get_after_credits` returns
 * nothing until the caller has published their own six words. This
 * route only carries the result. Doing it the other way round would put
 * the rule in one caller and leave the next one to remember it.
 *
 * Never cached. A member's own room opens the moment they publish, and
 * a cached "shut" would outlive that.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ openingId: string }> },
) {
  const { openingId } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("get_after_credits", { p_opening_id: openingId });
  if (error) {
    return NextResponse.json({ error: "Could not open After Credits." }, { status: 400 });
  }

  return NextResponse.json({
    // Zero rows means the caller has not written theirs yet — their own
    // review is always in the result once they have.
    open: (data ?? []).length > 0,
    reviews: data ?? [],
  });
}

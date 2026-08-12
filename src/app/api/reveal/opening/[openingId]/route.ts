import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { toRevealPayload } from "@/lib/reveal/payload";

/**
 * The single path from "sealed" to "revealed" for a nightly opening
 * (brief §11 required implementation pattern). All of the actual
 * security lives in the reveal_opening() Postgres function
 * (supabase/migrations/0004_reveal.sql) — this route only forwards the
 * authenticated caller's request to it and shapes the response. Never
 * add a GET handler here: a GET could be prefetched by <Link>, and
 * brief §11 rule 6 forbids prefetching the reveal route.
 */
export async function POST(
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

  const { data, error } = await supabase.rpc("reveal_opening", { p_opening_id: openingId });

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: error?.message ?? "This opening could not be revealed." },
      { status: 400 },
    );
  }

  const [result] = data;
  return NextResponse.json(toRevealPayload(result), {
    headers: { "Cache-Control": "no-store" },
  });
}

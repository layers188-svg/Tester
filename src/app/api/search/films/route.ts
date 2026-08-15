import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getFilmProvider } from "@/lib/films/provider";

/**
 * Autocomplete.
 *
 * Returns title, year and nothing else. Not an oversight — a poster, a
 * rating or a one-line synopsis in a dropdown is exactly the kind of
 * incidental spoiler Search exists to avoid, and the member only needs
 * enough to tell two films called Whiplash apart.
 *
 * Signed-in only. Search reaches an external metadata provider and, on
 * a miss, an editorial model, so leaving it open would let anyone spend
 * the house's quota.
 */
export async function GET(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const results = await getFilmProvider().search(query, request.signal);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // The provider's own words never reach a member: they name services,
    // keys and quotas, none of which is theirs to see or act on.
    return NextResponse.json(
      { error: "The house could not reach its catalogue. Try again shortly." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

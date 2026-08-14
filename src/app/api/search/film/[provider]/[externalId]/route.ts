import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { EditorialInvalidError, EditorialUnavailableError } from "@/lib/films/editorial";
import { FilmNotFoundError, getFilmRecord } from "@/lib/films/records";

/**
 * The House Dark version of one film.
 *
 * The response carries the six words, the territory, pace, intensity
 * and the plain facts. It never carries the source synopsis, which
 * exists only inside `FilmFacts` on the server — a member came here
 * precisely so as not to read one.
 *
 * Every failure below answers in House Dark's voice. A member should
 * never meet a provider name, a status code or a key problem: none of
 * it is theirs to see, and none of it tells them what to do next.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; externalId: string }> },
) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { provider, externalId } = await params;

  try {
    const record = await getFilmRecord(provider, externalId, request.signal);
    return NextResponse.json(record, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FilmNotFoundError) {
      return NextResponse.json(
        { error: "The house has nothing on that one." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof EditorialUnavailableError) {
      return NextResponse.json(
        { error: "The house has not written this one up yet." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof EditorialInvalidError) {
      // Six words could not be produced, twice. Saying so plainly is
      // better than showing five words and calling them six.
      return NextResponse.json(
        { error: "The house could not put this one in six words." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong in the house." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

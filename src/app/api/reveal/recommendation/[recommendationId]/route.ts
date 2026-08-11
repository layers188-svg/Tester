import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Sealed recommendation reveal — see the opening reveal route for the security notes; same pattern. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recommendationId: string }> },
) {
  const { recommendationId } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("reveal_sealed_recommendation", {
    p_recommendation_id: recommendationId,
  });

  if (error || !data || data.length === 0) {
    return NextResponse.json(
      { error: error?.message ?? "This recommendation could not be revealed." },
      { status: 400 },
    );
  }

  const [result] = data;
  return NextResponse.json(
    { title: result.title, releaseYear: result.release_year, providers: result.providers },
    { headers: { "Cache-Control": "no-store" } },
  );
}

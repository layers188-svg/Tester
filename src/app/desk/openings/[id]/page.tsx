import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { OpeningDetail } from "@/components/desk/OpeningDetail";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opening — Programming Desk" };

export default async function DeskOpeningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: opening } = await supabase.from("openings").select("*").eq("id", id).maybeSingle();
  if (!opening) notFound();

  const { data: secret } = await supabase
    .from("opening_secrets")
    .select("film_id, approved_at, films(id, title, release_year, runtime_minutes, rights_notes)")
    .eq("opening_id", id)
    .maybeSingle();

  const film = secret?.films as unknown as {
    id: string;
    title: string;
    release_year: number | null;
    runtime_minutes: number;
    rights_notes: string | null;
  } | null;

  const { data: cues } = await supabase
    .from("opening_cues")
    .select("id, cue")
    .eq("opening_id", id)
    .order("sort_order", { ascending: true });

  const { data: providers } = film
    ? await supabase.from("playback_destinations").select("*").eq("film_id", film.id)
    : { data: [] };

  return (
    <OpeningDetail
      opening={{
        id: opening.id,
        openingNumber: opening.opening_number,
        status: opening.status,
        opensAt: opening.opens_at,
        runtimeMinutes: opening.runtime_minutes,
        availabilityCount: opening.availability_count,
        minimumAccessType: opening.minimum_access_type,
        noTrailerStoragePath: opening.no_trailer_storage_path,
        noTrailerCaptionsPath: opening.no_trailer_captions_path,
        contentNotes: opening.content_notes,
      }}
      film={film}
      approvedAt={secret?.approved_at ?? null}
      cues={(cues ?? []).map((c) => c.cue)}
      providers={providers ?? []}
    />
  );
}

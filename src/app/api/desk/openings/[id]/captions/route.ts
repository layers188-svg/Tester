import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { filenameContainsTitle } from "@/lib/media/validate";

const MAX_CAPTIONS_BYTES = 64 * 1024;

/**
 * WebVTT caption upload for a No Trailer that carries speech (brief §16
 * accessibility rule 6). Same storage discipline as the video: UUID
 * object name, original filename rejected if it contains the title, and
 * the caption text itself scanned so a transcript can never spell the
 * title out before reveal.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  if (file.size > MAX_CAPTIONS_BYTES) {
    return NextResponse.json({ error: "Caption file is unexpectedly large." }, { status: 400 });
  }

  const { data: secret } = await supabase
    .from("opening_secrets")
    .select("film_id, films(title)")
    .eq("opening_id", id)
    .maybeSingle();
  const filmTitle = (secret?.films as unknown as { title: string } | null)?.title ?? "";

  if (filmTitle && filenameContainsTitle(file.name, filmTitle)) {
    return NextResponse.json(
      { error: "The filename contains the film title. Rename it before uploading." },
      { status: 400 },
    );
  }

  const text = await file.text();
  if (!text.trimStart().startsWith("WEBVTT")) {
    return NextResponse.json({ error: "Captions must be a WebVTT (.vtt) file." }, { status: 400 });
  }
  if (filmTitle && text.toLowerCase().includes(filmTitle.toLowerCase())) {
    return NextResponse.json(
      { error: "The captions contain the film title. Remove it before uploading." },
      { status: 400 },
    );
  }

  const storageName = `${crypto.randomUUID()}.vtt`;
  const { error: uploadError } = await supabase.storage
    .from("no-trailer")
    .upload(storageName, text, { contentType: "text/vtt", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 400 });
  }

  const { error } = await supabase
    .from("openings")
    .update({ no_trailer_captions_path: storageName })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Uploaded, but could not link it to the opening." },
      { status: 400 },
    );
  }

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "opening.captions_uploaded",
    target_type: "openings",
    target_id: id,
    safe_metadata: { size_bytes: file.size },
  });

  return NextResponse.json(
    { storagePath: storageName },
    { headers: { "Cache-Control": "no-store" } },
  );
}

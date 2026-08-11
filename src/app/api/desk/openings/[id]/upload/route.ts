import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import {
  validateMediaFile,
  generateStorageName,
  isDurationInPreferredRange,
} from "@/lib/media/validate";

/**
 * No Trailer upload (brief §12 media checks). The uploaded object gets
 * a UUID name — filenameContainsTitle() is checked against the
 * *original* filename before it is discarded; nothing derived from the
 * film title is ever written to Storage.
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

  const { data: secret } = await supabase
    .from("opening_secrets")
    .select("film_id, films(title)")
    .eq("opening_id", id)
    .maybeSingle();
  const filmTitle = (secret?.films as unknown as { title: string } | null)?.title ?? "";

  const issues = validateMediaFile(
    { type: file.type, size: file.size, name: file.name },
    filmTitle,
  );
  const blocking = issues.filter((i) => i.blocking);
  if (blocking.length > 0) {
    return NextResponse.json({ error: blocking.map((i) => i.message).join(" ") }, { status: 400 });
  }

  const storageName = generateStorageName(file.type);
  const { error: uploadError } = await supabase.storage
    .from("no-trailer")
    .upload(storageName, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed. Try again." }, { status: 400 });
  }

  const { error } = await supabase
    .from("openings")
    .update({ no_trailer_storage_path: storageName })
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Uploaded, but could not link it to the opening." },
      { status: 400 },
    );
  }

  const durationSeconds = Number(form.get("durationSeconds") ?? NaN);
  const width = Number(form.get("width") ?? NaN);
  const height = Number(form.get("height") ?? NaN);

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "opening.no_trailer_uploaded",
    target_type: "openings",
    target_id: id,
    safe_metadata: {
      mime_type: file.type,
      size_bytes: file.size,
      duration_seconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      within_preferred_duration: Number.isFinite(durationSeconds)
        ? isDurationInPreferredRange(durationSeconds)
        : null,
    },
  });

  return NextResponse.json(
    { storagePath: storageName, warnings: issues.filter((i) => !i.blocking) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

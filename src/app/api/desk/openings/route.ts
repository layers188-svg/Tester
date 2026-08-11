import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";
import { validateCues } from "@/lib/validation/cues";

const schema = z.object({
  filmTitle: z.string().trim().min(1).max(200),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  runtimeMinutes: z.number().int().min(1).max(1000),
  countryCode: z.string().trim().max(4).nullable().optional(),
  rightsNotes: z.string().trim().max(2000).nullable().optional(),
  contentNotes: z.string().trim().max(1000).nullable().optional(),
  cues: z.array(z.string().trim().max(24)).max(3).optional(),
  minimumAccessType: z
    .enum(["subscription", "rental", "free", "mixed", "unknown"])
    .default("unknown"),
});

/** Owner-only. Creates the film, opening (draft), opening_secrets link and cues together. */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }
  const data = parsed.data;

  const cueValidation = validateCues(data.cues ?? []);
  if (!cueValidation.valid) {
    return NextResponse.json({ error: cueValidation.error }, { status: 400 });
  }

  const { data: film, error: filmError } = await supabase
    .from("films")
    .insert({
      title: data.filmTitle,
      release_year: data.releaseYear ?? null,
      runtime_minutes: data.runtimeMinutes,
      country_code: data.countryCode ?? null,
      rights_notes: data.rightsNotes ?? null,
    })
    .select()
    .single();
  if (filmError || !film) {
    return NextResponse.json({ error: "Could not create the film record." }, { status: 400 });
  }

  const { data: maxOpening } = await supabase
    .from("openings")
    .select("opening_number")
    .order("opening_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNumber = (maxOpening?.opening_number ?? 0) + 1;

  const { data: opening, error: openingError } = await supabase
    .from("openings")
    .insert({
      opening_number: nextNumber,
      opens_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "draft",
      runtime_minutes: data.runtimeMinutes,
      minimum_access_type: data.minimumAccessType,
      no_trailer_storage_path: "pending-upload",
      content_notes: data.contentNotes ?? null,
    })
    .select()
    .single();
  if (openingError || !opening) {
    return NextResponse.json({ error: "Could not create the opening." }, { status: 400 });
  }

  await supabase.from("opening_secrets").insert({ opening_id: opening.id, film_id: film.id });

  if (cueValidation.cues.length > 0) {
    await supabase
      .from("opening_cues")
      .insert(cueValidation.cues.map((cue, i) => ({ opening_id: opening.id, cue, sort_order: i })));
  }

  await supabase.from("audit_log").insert({
    actor_id: owner.userId,
    action: "opening.created",
    target_type: "openings",
    target_id: opening.id,
    safe_metadata: { opening_number: nextNumber },
  });

  return NextResponse.json({ id: opening.id }, { headers: { "Cache-Control": "no-store" } });
}

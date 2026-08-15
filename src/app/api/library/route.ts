import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Adding a watched film to the Library (handover §7).
 *
 * The film goes only as far as add_library_film(), a security-definer
 * function that resolves or creates the `films` row internally — the
 * member never holds access to that table, the same arrangement as
 * sending under seal.
 *
 * The handover asks for this to draw on "a broad metadata catalogue".
 * There is no metadata provider configured, and adding one needs an
 * account and a server-side key, so today the member types the title
 * and year. When a provider exists it slots in ahead of this call and
 * nothing else changes — see LAUNCH_CHECKLIST.md.
 */

const addSchema = z.object({
  title: z.string().trim().min(1).max(200),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  runtimeMinutes: z.number().int().min(1).max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the film and try again." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("add_library_film", {
    p_title: parsed.data.title,
    p_release_year: parsed.data.releaseYear ?? null,
    p_runtime_minutes: parsed.data.runtimeMinutes ?? null,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not add that film." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: data }, { headers: { "Cache-Control": "no-store" } });
}

const removeSchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabase.rpc("remove_library_film", { p_id: parsed.data.id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

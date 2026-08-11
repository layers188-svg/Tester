import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/require-owner";

const schema = z.object({
  filmId: z.string().uuid(),
  territory: z.string().trim().min(2).max(8),
  providerName: z.string().trim().min(1).max(80),
  accessType: z.enum(["subscription", "rental", "purchase", "free"]),
  deepLink: z.string().trim().url(),
  verified: z.boolean().optional(),
});

/** Provider link accuracy is a mandatory human approval item (brief §12) — `verified` defaults to false. */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return NextResponse.json({ error: owner.error }, { status: owner.status });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the provider details." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("playback_destinations")
    .insert({
      film_id: parsed.data.filmId,
      territory: parsed.data.territory.toUpperCase(),
      provider_name: parsed.data.providerName,
      access_type: parsed.data.accessType,
      deep_link: parsed.data.deepLink,
      is_active: true,
      verified_at: parsed.data.verified ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not add the provider." }, { status: 400 });
  }

  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

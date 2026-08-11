import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  marketingConsent: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.displayName !== undefined) patch.display_name = parsed.data.displayName;
  if (parsed.data.city !== undefined) patch.city = parsed.data.city;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (parsed.data.marketingConsent !== undefined) {
    patch.marketing_consent_at = parsed.data.marketingConsent ? new Date().toISOString() : null;
    patch.marketing_consent_source = parsed.data.marketingConsent ? "you_page" : null;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "Could not save." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

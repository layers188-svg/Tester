import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getAdminEmails } from "@/lib/env";

/**
 * Runs once, right after OTP verification. Creates the member's own
 * profile row (RLS: profiles_insert_own — the request-scoped client
 * below carries the member's session, so this can never create a row
 * for anyone else) and records marketing consent as a separate,
 * explicit action from authentication (brief §13).
 *
 * Owner promotion is a second, service-role step gated on
 * ADMIN_EMAILS — never client controlled.
 */
export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let marketingConsent = false;
  try {
    const body = await request.json();
    marketingConsent = Boolean(body?.marketingConsent);
  } catch {
    // No body — treat as no consent given.
  }

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();

  if (!existing) {
    const displayName = user.email ? user.email.split("@")[0] : "New member";
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      timezone: "UTC",
      ...(marketingConsent
        ? { marketing_consent_at: new Date().toISOString(), marketing_consent_source: "join_form" }
        : {}),
    });
    await supabase.from("email_preferences").insert({ user_id: user.id });
  } else if (marketingConsent) {
    await supabase
      .from("profiles")
      .update({
        marketing_consent_at: new Date().toISOString(),
        marketing_consent_source: "join_form",
      })
      .eq("id", user.id);
  }

  const email = user.email?.toLowerCase();
  if (email && getAdminEmails().includes(email)) {
    const service = getServiceSupabase();
    await service.from("profiles").update({ role: "owner" }).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}

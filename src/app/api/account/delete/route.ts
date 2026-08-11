import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * Brief §7 "You" rule 8 / §14 rule 5: members can delete their account
 * and associated content. Deleting the auth.users row cascades (on
 * delete cascade, supabase/migrations/0001_init.sql) through every
 * table that references profiles — no manual cleanup needed.
 */
export async function POST() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const service = getServiceSupabase();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "Could not delete your account." }, { status: 400 });
  }

  await service.from("audit_log").insert({
    actor_id: null,
    action: "account.self_deleted",
    target_type: "profiles",
    target_id: user.id,
    safe_metadata: {},
  });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

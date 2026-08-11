import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Explicit owner check for Programming Desk routes. Row Level Security
 * (is_owner() policies, supabase/migrations/0003_rls.sql) is the real
 * boundary and rejects a non-owner's write regardless — this exists so
 * the route can fail fast with a clear message instead of a raw
 * Postgres error.
 */
export async function requireOwner(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string } | { error: string; status: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated.", status: 401 };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") {
    return { error: "Owner access required.", status: 403 };
  }
  return { userId: user.id };
}

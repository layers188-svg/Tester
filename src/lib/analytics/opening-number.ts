import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Resolves an opening's opaque public number for an analytics event.
 *
 * Brief §15 permits "an opaque opening number", and nothing else that
 * identifies what is playing. `openings.opening_number` is already
 * visible to members on the sealed card, so reading it here adds no
 * exposure — but it means analytics never has to hold `opening_id`,
 * which joins to `opening_secrets` and from there to the film.
 *
 * Returns null rather than throwing: a missing number must never cost
 * a member their reveal.
 */
export async function openingNumberFor(
  supabase: SupabaseClient<Database>,
  openingId: string | null | undefined,
): Promise<number | null> {
  if (!openingId) return null;
  const { data } = await supabase
    .from("openings")
    .select("opening_number")
    .eq("id", openingId)
    .maybeSingle();
  return data?.opening_number ?? null;
}

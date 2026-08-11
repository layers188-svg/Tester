import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Owner-side queries. These read `films` / `opening_secrets` directly —
 * safe here only because every caller of this module has already been
 * through requireOwner() / the /desk layout's role check, and RLS
 * (is_owner()) would reject the read anyway for anyone else.
 */
export interface DeskOpeningRow {
  id: string;
  openingNumber: number;
  status: Database["public"]["Tables"]["openings"]["Row"]["status"];
  opensAt: string;
  runtimeMinutes: number;
  filmTitle: string | null;
  approved: boolean;
}

export async function listDeskOpenings(supabase: SupabaseClient<Database>): Promise<DeskOpeningRow[]> {
  const { data: openings } = await supabase
    .from("openings")
    .select("*")
    .order("opening_number", { ascending: false });

  if (!openings) return [];

  const { data: secrets } = await supabase.from("opening_secrets").select("opening_id, film_id, approved_at");
  const filmIds = (secrets ?? []).map((s) => s.film_id);
  const { data: films } =
    filmIds.length > 0 ? await supabase.from("films").select("id, title").in("id", filmIds) : { data: [] };

  const secretByOpening = new Map((secrets ?? []).map((s) => [s.opening_id, s]));
  const filmById = new Map((films ?? []).map((f) => [f.id, f.title]));

  return openings.map((o) => {
    const secret = secretByOpening.get(o.id);
    return {
      id: o.id,
      openingNumber: o.opening_number,
      status: o.status,
      opensAt: o.opens_at,
      runtimeMinutes: o.runtime_minutes,
      filmTitle: secret ? (filmById.get(secret.film_id) ?? null) : null,
      approved: Boolean(secret?.approved_at),
    };
  });
}

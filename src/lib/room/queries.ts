import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RoomVoice } from "@/lib/supabase/types";

/**
 * The Room's server reads (handover 00_BUILD_BRIEF_FINAL.md §5).
 *
 * The Room is the one member surface that is allowed to show a title in
 * its own header — "film title, because the member is now eligible".
 * That title still never comes from the opening: it comes from the
 * member's own reveal, through get_my_library(), which returns a title
 * only for rows that member personally revealed. A member who somehow
 * reached this page without revealing gets a Room with no title rather
 * than a leak.
 */

export interface RoomOpening {
  openingId: string;
  openingNumber: number;
  title: string | null;
  releaseYear: number | null;
  ownWords: string | null;
}

export async function getRoomOpening(
  supabase: SupabaseClient<Database>,
  openingId: string,
  openingNumber: number,
): Promise<RoomOpening> {
  const { data } = await supabase.rpc("get_my_library");
  const row = (data ?? []).find(
    (item) => item.kind === "opening" && item.target_id === openingId && item.revealed,
  );

  return {
    openingId,
    openingNumber,
    title: row?.title ?? null,
    releaseYear: row?.release_year ?? null,
    ownWords: row?.six_words ?? null,
  };
}

export async function getRoomVoices(
  supabase: SupabaseClient<Database>,
  openingId: string,
): Promise<RoomVoice[]> {
  const { data, error } = await supabase.rpc("get_room_voices", {
    p_opening_id: openingId,
    p_sealed_recommendation_id: null,
  });

  // get_room_voices raises when the Room is not open. The page checks
  // eligibility before calling, so an error here means the two
  // disagreed — an empty Room is the safe reading, never a fallback
  // that shows more than it should.
  if (error) return [];
  return data ?? [];
}

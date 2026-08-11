import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WatchState } from "@/lib/supabase/types";

/**
 * Every field here is drawn from `openings` and `opening_cues` only —
 * both safe, client-visible tables (brief §10, §11). Never join films
 * or opening_secrets from this module.
 */
export interface OpeningSafe {
  id: string;
  openingNumber: number;
  opensAt: string;
  status: Database["public"]["Tables"]["openings"]["Row"]["status"];
  runtimeMinutes: number;
  availabilityCount: number;
  minimumAccessType: Database["public"]["Tables"]["openings"]["Row"]["minimum_access_type"];
  noTrailerStoragePath: string;
  noTrailerCaptionsPath: string | null;
  contentNotes: string | null;
  cues: string[];
}

async function attachCues(
  supabase: SupabaseClient<Database>,
  opening: Database["public"]["Tables"]["openings"]["Row"],
): Promise<OpeningSafe> {
  const { data: cueRows } = await supabase
    .from("opening_cues")
    .select("cue")
    .eq("opening_id", opening.id)
    .order("sort_order", { ascending: true });

  return {
    id: opening.id,
    openingNumber: opening.opening_number,
    opensAt: opening.opens_at,
    status: opening.status,
    runtimeMinutes: opening.runtime_minutes,
    availabilityCount: opening.availability_count,
    minimumAccessType: opening.minimum_access_type,
    noTrailerStoragePath: opening.no_trailer_storage_path,
    noTrailerCaptionsPath: opening.no_trailer_captions_path,
    contentNotes: opening.content_notes,
    cues: (cueRows ?? []).map((row) => row.cue),
  };
}

/**
 * Tonight's opening: the currently open one, or if none is open yet,
 * the soonest scheduled one (so Tonight can render "not available" with
 * an honest opening number rather than an empty screen).
 */
export async function getTonightOpening(
  supabase: SupabaseClient<Database>,
): Promise<OpeningSafe | null> {
  const { data: open } = await supabase
    .from("openings")
    .select("*")
    .eq("status", "open")
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return attachCues(supabase, open);

  const { data: scheduled } = await supabase
    .from("openings")
    .select("*")
    .eq("status", "scheduled")
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (scheduled) return attachCues(supabase, scheduled);
  return null;
}

export interface MemberOpeningProgress {
  hasRevealed: boolean;
  watchState: WatchState | null;
  hasSixWords: boolean;
  sixWordsId: string | null;
  sixWordsBody: string | null;
  sixWordsCreatedAt: string | null;
}

export async function getMemberOpeningProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  openingId: string,
): Promise<MemberOpeningProgress> {
  const [{ data: reveal }, { data: watch }, { data: review }] = await Promise.all([
    supabase
      .from("reveals")
      .select("user_id")
      .eq("user_id", userId)
      .eq("opening_id", openingId)
      .maybeSingle(),
    supabase
      .from("watches")
      .select("state")
      .eq("user_id", userId)
      .eq("opening_id", openingId)
      .maybeSingle(),
    supabase
      .from("six_word_reviews")
      .select("id, body, created_at")
      .eq("user_id", userId)
      .eq("opening_id", openingId)
      .maybeSingle(),
  ]);

  return {
    hasRevealed: Boolean(reveal),
    watchState: watch?.state ?? null,
    hasSixWords: Boolean(review),
    sixWordsId: review?.id ?? null,
    sixWordsBody: review?.body ?? null,
    sixWordsCreatedAt: review?.created_at ?? null,
  };
}

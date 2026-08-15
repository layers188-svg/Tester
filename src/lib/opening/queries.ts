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
  noTrailerPosterPath: string | null;
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
    noTrailerPosterPath: opening.no_trailer_poster_path,
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
  /** "Skip for now" on record (0013_review_decision.sql) — opens The Room without a review. */
  hasSkippedReview: boolean;
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
      .select("state, review_skipped_at")
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
    hasSkippedReview: Boolean(watch?.review_skipped_at),
    hasSixWords: Boolean(review),
    sixWordsId: review?.id ?? null,
    sixWordsBody: review?.body ?? null,
    sixWordsCreatedAt: review?.created_at ?? null,
  };
}

/**
 * The canonical `nextOpeningAt` (handover §9: "Use one canonical
 * nextOpeningAt timestamp… Calculate remaining time from the timestamp
 * every second. Do not store and decrement a counter.").
 *
 * Only openings that are still ahead of us count. `openings` is a safe
 * table — an opening's time is not its identity — so this is a plain
 * select rather than an RPC.
 */
export async function getNextOpeningAt(
  supabase: SupabaseClient<Database>,
  after: Date = new Date(),
): Promise<string | null> {
  const { data } = await supabase
    .from("openings")
    .select("opens_at")
    .in("status", ["scheduled", "approved"])
    .gt("opens_at", after.toISOString())
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.opens_at ?? null;
}

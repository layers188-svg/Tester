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
  /** When the night ends. Null means nothing closes it. */
  closesAt: string | null;
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
    closesAt: opening.closes_at,
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
 * Tonight's opening: whichever night the clock says we are in, or if we
 * are between nights, the next one (so Tonight can count down against
 * an honest opening number rather than an empty screen).
 *
 * Deliberately not `status = 'open'`.
 *
 * That column is maintained by the cron worker, and on the deployed
 * preview a scheduled opening whose hour had passed stayed `scheduled`
 * through four consecutive cron windows — so keying off it meant the
 * house never opened at all, silently. `opens_at` is the fact and the
 * status is a cache of it, so this reads the fact: an approved opening
 * whose hour has come is tonight's whether or not anything has got
 * round to relabelling it.
 */
export async function getTonightOpening(
  supabase: SupabaseClient<Database>,
): Promise<OpeningSafe | null> {
  const now = new Date().toISOString();

  const { data: live } = await supabase
    .from("openings")
    .select("*")
    .in("status", ["open", "scheduled"])
    .lte("opens_at", now)
    .or(`closes_at.is.null,closes_at.gt.${now}`)
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (live) return attachCues(supabase, live);

  const { data: scheduled } = await supabase
    .from("openings")
    .select("*")
    .eq("status", "scheduled")
    .gt("opens_at", now)
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (scheduled) return attachCues(supabase, scheduled);
  return null;
}

/**
 * The next opening that has not started yet.
 *
 * Separate from `getTonightOpening`, which answers "what is on now, or
 * failing that, what is next". This one is only ever about the future,
 * because the countdown has to keep counting while tonight is already
 * open: at 8pm a member wants to know when the next one lands, not be
 * told about the one they are looking at.
 *
 * Returns null when nothing is scheduled. That is a real state and the
 * countdown says so rather than counting toward a time the house has
 * not promised.
 */
export async function getNextOpening(
  supabase: SupabaseClient<Database>,
): Promise<{ openingNumber: number; opensAt: string } | null> {
  const { data } = await supabase
    .from("openings")
    .select("opening_number, opens_at")
    .eq("status", "scheduled")
    .gt("opens_at", new Date().toISOString())
    .order("opens_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { openingNumber: data.opening_number, opensAt: data.opens_at };
}

/**
 * The most recent opening that has already run, for a member who has
 * arrived before tonight's has started.
 *
 * A new member landing at 4pm otherwise meets a countdown and nothing
 * else, which explains the product without ever showing it. Last
 * night's is the whole thing in miniature: sealed card, clue, reveal,
 * six words, room.
 *
 * Only openings with a real No Trailer are offered. One still marked
 * `pending-upload` would hand them a clue that cannot play, which is a
 * worse introduction than the countdown alone.
 */
export async function getPreviousOpening(
  supabase: SupabaseClient<Database>,
): Promise<OpeningSafe | null> {
  const { data } = await supabase
    .from("openings")
    .select("*")
    .in("status", ["open", "closed"])
    .lt("opens_at", new Date().toISOString())
    .neq("no_trailer_storage_path", "pending-upload")
    .order("opens_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return attachCues(supabase, data);
}

/**
 * One opening by id, through the same safe projection as Tonight.
 *
 * Reads `openings` and `opening_cues` only, exactly like every other
 * function in this module — so the archive route cannot become the one
 * place a title reaches the browser without a reveal.
 */
export async function getOpeningById(
  supabase: SupabaseClient<Database>,
  openingId: string,
): Promise<OpeningSafe | null> {
  const { data } = await supabase.from("openings").select("*").eq("id", openingId).maybeSingle();

  if (!data) return null;
  return attachCues(supabase, data);
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

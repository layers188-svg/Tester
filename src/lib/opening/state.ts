/**
 * Opening state machines (brief §7 Tonight required states, §16
 * resilience rule 5: "Scheduled opening state changes must be safe to
 * run more than once").
 */

import type { OpeningStatus, WatchState } from "@/lib/supabase/types";
import { isRoomOpen, isReviewUndecided } from "./eligibility";

/**
 * Tonight's server-derived state, named after
 * docs/handover/product-state-machine.json.
 *
 * That machine also lists `clue`, `no_trailer_ready`,
 * `no_trailer_playing` and `reveal_pending`. Those four are transient
 * steps of the ritual inside one mounted component — they exist for
 * seconds, never touch the server, and cannot be resumed after a
 * refresh (a member who reloads mid-No-Trailer is back at `sealed`,
 * which is correct: the picture has not spoken yet). They live in
 * TonightExperience, not here.
 *
 * `saved` is likewise not a state of the ritual. Saving is something a
 * member does to a revealed film, not a place they are in the evening.
 */
export type TonightState =
  | "not_available"
  | "sealed"
  | "revealed"
  | "review_undecided"
  | "review_skipped"
  | "review_submitted";

export interface TonightStateInput {
  openingStatus: OpeningStatus | null;
  opensAt: Date | string | null;
  now?: Date;
  hasRevealed: boolean;
  watchState: WatchState | null;
  hasSixWords: boolean;
  hasSkippedReview?: boolean;
}

export function computeTonightState({
  openingStatus,
  opensAt,
  now = new Date(),
  hasRevealed,
  watchState,
  hasSixWords,
  hasSkippedReview = false,
}: TonightStateInput): TonightState {
  const opens = opensAt ? (typeof opensAt === "string" ? new Date(opensAt) : opensAt) : null;

  const isOpen = openingStatus === "open" || (openingStatus === "closed" && hasRevealed);

  if (!openingStatus || (opens && opens.getTime() > now.getTime()) || !isOpen) {
    return "not_available";
  }

  if (!hasRevealed) {
    return "sealed";
  }

  const eligibility = {
    hasWatched: watchState === "watched",
    hasSubmittedSixWords: hasSixWords,
    hasSkippedReview,
  };

  // Six words on record win over a stale skip: writing them retracts
  // the skip in the database (0013), and this ordering means the UI
  // agrees even before that row is re-read.
  if (isRoomOpen(eligibility)) {
    return hasSixWords ? "review_submitted" : "review_skipped";
  }
  if (isReviewUndecided(eligibility)) {
    return "review_undecided";
  }
  return "revealed";
}

/** Does this state open The Room? The two review outcomes do; nothing before them does. */
export function tonightStateOpensRoom(state: TonightState): boolean {
  return state === "review_skipped" || state === "review_submitted";
}

/**
 * Programming Desk opening lifecycle. Forward-only, and re-applying the
 * current status is always a safe no-op (idempotent scheduled jobs).
 */
const FORWARD_TRANSITIONS: Record<OpeningStatus, OpeningStatus[]> = {
  draft: ["approved"],
  approved: ["scheduled"],
  scheduled: ["open"],
  open: ["closed"],
  closed: [],
};

export function canTransitionOpeningStatus(from: OpeningStatus, to: OpeningStatus): boolean {
  if (from === to) return true; // idempotent re-application
  return FORWARD_TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextOpeningStatuses(from: OpeningStatus): OpeningStatus[] {
  return FORWARD_TRANSITIONS[from] ?? [];
}

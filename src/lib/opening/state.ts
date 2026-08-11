/**
 * Opening state machines (brief §7 Tonight required states, §16
 * resilience rule 5: "Scheduled opening state changes must be safe to
 * run more than once").
 */

import type { OpeningStatus, WatchState } from "@/lib/supabase/types";

/**
 * Tonight's nine required states (brief §7). "dimming" and
 * "no_trailer_playing" are transient, client-only steps layered on top
 * of "sealed_ready" by the player component — they never touch the
 * server and are not represented in this server-derived state.
 */
export type TonightState =
  | "not_available"
  | "sealed_ready"
  | "revealed"
  | "saved"
  | "watched"
  | "six_words_requested"
  | "after_credits_open";

export interface TonightStateInput {
  openingStatus: OpeningStatus | null;
  opensAt: Date | string | null;
  now?: Date;
  hasRevealed: boolean;
  watchState: WatchState | null;
  hasSixWords: boolean;
}

export function computeTonightState({
  openingStatus,
  opensAt,
  now = new Date(),
  hasRevealed,
  watchState,
  hasSixWords,
}: TonightStateInput): TonightState {
  const opens = opensAt ? (typeof opensAt === "string" ? new Date(opensAt) : opensAt) : null;

  const isOpen =
    openingStatus === "open" || (openingStatus === "closed" && hasRevealed);

  if (!openingStatus || (opens && opens.getTime() > now.getTime()) || !isOpen) {
    if (openingStatus === "scheduled" || openingStatus === "open" || openingStatus === "closed") {
      return "not_available";
    }
    return "not_available";
  }

  if (!hasRevealed) {
    return "sealed_ready";
  }

  if (hasSixWords) {
    return "after_credits_open";
  }
  if (watchState === "watched") {
    return "six_words_requested";
  }
  if (watchState === "saved" || watchState === "opened_service") {
    return "saved";
  }
  return "revealed";
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

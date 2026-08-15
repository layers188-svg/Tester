/**
 * Brief §15 analytics vocabulary.
 *
 * The twelve events are fixed by the brief. This module is deliberately
 * free of any Supabase import so it can be shared with client
 * components — see `record.ts` for the server-only write path.
 */

/** The twelve events brief §15 permits, in the order it lists them. */
export const ANALYTICS_EVENTS = [
  "sign_in_completed",
  "opening_viewed",
  "dimming_started",
  "no_trailer_completed",
  "reveal_completed",
  "provider_handoff_selected",
  "saved_for_later",
  "marked_watched",
  "six_words_submitted",
  "recommendation_sent",
  "circle_invitation_accepted",
  "screening_attendance_response",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/**
 * The events a browser is allowed to report.
 *
 * Everything else happens inside a server route that already knows the
 * action succeeded, so it is recorded there and cannot be forged. These
 * three are moments only the client can observe: that the sealed card
 * was actually seen, that the member chose to dim, and that the No
 * Trailer ran to the end. A member can forge these three about
 * themselves; the cost of that is a slightly optimistic funnel, which is
 * a better trade than not measuring the ritual at all.
 */
export const CLIENT_REPORTABLE_EVENTS = [
  "opening_viewed",
  "dimming_started",
  "no_trailer_completed",
] as const satisfies readonly AnalyticsEvent[];

export type ClientReportableEvent = (typeof CLIENT_REPORTABLE_EVENTS)[number];

export function isClientReportableEvent(value: unknown): value is ClientReportableEvent {
  return (
    typeof value === "string" && (CLIENT_REPORTABLE_EVENTS as readonly string[]).includes(value)
  );
}

/**
 * The only variant an event may carry, matching the CHECK constraint in
 * `0013_analytics.sql`. Both sides must be changed together, in a
 * migration — that is the point of keeping it closed.
 */
export const ANALYTICS_DETAILS = ["invited", "attending", "maybe", "declined"] as const;

export type AnalyticsDetail = (typeof ANALYTICS_DETAILS)[number];

import type {
  AccessType,
  AnalyticsEventName,
  ModerationState,
  PlaybackAccessType,
  ReviewVisibility,
  WatchState,
} from "@/lib/supabase/types";

/**
 * Member-facing wording for the database enums.
 *
 * Rendering an enum straight into the interface leaks the schema into
 * the product's voice — `opened_service` and `house_approved` were
 * reaching members underscore and all. The guidelines put "generic tech
 * language" under "voice we avoid", and brief §6 asks for short, plain
 * sentences. One home for these keeps the wording consistent between
 * the sealed card and the reveal, which had drifted apart.
 */

/** The access line on a sealed card, before any provider is named. */
export const MINIMUM_ACCESS_LABEL: Record<AccessType, string> = {
  subscription: "Included with a subscription",
  rental: "Available to rent",
  free: "Free to watch",
  mixed: "Subscription or rental",
  unknown: "Availability confirmed after reveal",
};

/**
 * The same idea beside a named provider after reveal, where it sits
 * inline between the provider and the territory and has to stay short.
 */
export const PLAYBACK_ACCESS_LABEL: Record<PlaybackAccessType, string> = {
  subscription: "Subscription",
  rental: "Rent",
  purchase: "Buy",
  free: "Free",
};

export const WATCH_STATE_LABEL: Record<WatchState, string> = {
  saved: "Saved",
  opened_service: "Opened",
  watched: "Watched",
};

export const REVIEW_VISIBILITY_LABEL: Record<ReviewVisibility, string> = {
  private: "Private",
  circle: "Your Circle",
  house_approved: "Approved for the public site",
};

export const MODERATION_STATE_LABEL: Record<ModerationState, string> = {
  visible: "Visible",
  hidden: "Hidden",
  removed: "Removed",
};

/**
 * Owner-facing wording for the brief §15 events on /desk/analytics.
 * These never reach a member, but the same rule applies: no underscored
 * enum in the interface.
 */
export const ANALYTICS_EVENT_LABEL: Record<AnalyticsEventName, string> = {
  sign_in_completed: "Signed in",
  opening_viewed: "Opening viewed",
  dimming_started: "Dimming started",
  no_trailer_completed: "No Trailer watched to the end",
  reveal_completed: "Title revealed",
  provider_handoff_selected: "Provider opened",
  saved_for_later: "Saved for later",
  marked_watched: "Marked watched",
  six_words_submitted: "Six words left",
  recommendation_sent: "Film sent under seal",
  circle_invitation_accepted: "Circle invitation accepted",
  screening_attendance_response: "Screening response",
};

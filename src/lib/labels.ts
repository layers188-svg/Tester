import type {
  AccessType,
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

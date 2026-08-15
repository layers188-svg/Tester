/**
 * The Room's front door, and marketing consent helpers (brief §13).
 *
 * The older brief made six words the price of entry: watch, write,
 * then the conversation opens. The August handover changed that
 * (00_BUILD_BRIEF_FINAL.md §3 "Post watch"):
 *
 *   Skip still unlocks The Room. Do not guilt the member and do not
 *   create a fake blank review.
 *
 * So the rule is watched *and decided* — six words left, or "Skip for
 * now" chosen — rather than watched and written. What the gate is
 * really protecting is the order of events: the member's own reaction
 * forms before anyone else's arrives. A member who has watched and
 * decided they have nothing to say has satisfied that; a member who
 * has not yet reached the end of the picture has not.
 *
 * This mirrors is_room_eligible() in 0014_room.sql, which is the
 * boundary that actually holds — this copy decides what the interface
 * offers, not what the database will hand over.
 */

export interface RoomEligibilityInput {
  hasWatched: boolean;
  hasSubmittedSixWords: boolean;
  hasSkippedReview: boolean;
}

export function isRoomOpen({
  hasWatched,
  hasSubmittedSixWords,
  hasSkippedReview,
}: RoomEligibilityInput): boolean {
  return hasWatched && (hasSubmittedSixWords || hasSkippedReview);
}

/**
 * Has the member been asked for six words and not yet answered either
 * way? That is `review_undecided` in the product state machine, and it
 * is the only state that shows the post-watch prompt.
 */
export function isReviewUndecided({
  hasWatched,
  hasSubmittedSixWords,
  hasSkippedReview,
}: RoomEligibilityInput): boolean {
  return hasWatched && !hasSubmittedSixWords && !hasSkippedReview;
}

export interface MarketingConsentRecord {
  consentedAt: string | null;
  source: string | null;
}

/** Marketing consent must be its own explicit, unchecked opt-in — never inferred from auth. */
export function recordMarketingConsent(
  source: string,
  now: Date = new Date(),
): MarketingConsentRecord {
  if (!source || source.trim().length === 0) {
    throw new Error("Marketing consent requires a source.");
  }
  return { consentedAt: now.toISOString(), source };
}

export function withdrawMarketingConsent(): MarketingConsentRecord {
  return { consentedAt: null, source: null };
}

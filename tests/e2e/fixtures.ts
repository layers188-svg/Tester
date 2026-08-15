/**
 * The content the signed-in journeys need, and the exact list of what
 * has to be removed afterwards.
 *
 * Every id is in one deliberate namespace so the teardown can be
 * precise rather than heuristic: it deletes these rows by primary key,
 * not everything that looks like test data. That matters because this
 * suite is permitted to run against the real project, and a cleanup
 * that guessed could take something real with it.
 */

export const FIXTURE = {
  filmId: "e2e00000-0000-4000-8000-000000000001",
  openingId: "e2e00000-0000-4000-8000-000000000002",
  circleId: "e2e00000-0000-4000-8000-000000000003",
  /** Matches the title the spoiler journeys assert must never leak. */
  filmTitle: "Whiplash",
  providerName: "Example Streaming Service",
  /**
   * Opening numbers are unique and member-visible. 9000 is far outside
   * anything real programming would reach, so a leftover cannot be
   * mistaken for a genuine opening.
   */
  openingNumber: 9001,
} as const;

/** Tables the teardown clears, in dependency order. */
export const TEARDOWN_ORDER = [
  ["analytics_events", "opening_number", FIXTURE.openingNumber],
  ["six_word_reviews", "opening_id", FIXTURE.openingId],
  ["watches", "opening_id", FIXTURE.openingId],
  ["reveals", "opening_id", FIXTURE.openingId],
  ["opening_cues", "opening_id", FIXTURE.openingId],
  ["opening_secrets", "opening_id", FIXTURE.openingId],
  ["openings", "id", FIXTURE.openingId],
  ["playback_destinations", "film_id", FIXTURE.filmId],
  ["films", "id", FIXTURE.filmId],
  ["circles", "id", FIXTURE.circleId],
] as const;

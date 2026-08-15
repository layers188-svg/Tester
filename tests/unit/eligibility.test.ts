import { describe, expect, it } from "vitest";
import {
  isRoomOpen,
  isReviewUndecided,
  recordMarketingConsent,
  withdrawMarketingConsent,
} from "@/lib/opening/eligibility";

describe("isRoomOpen", () => {
  it("stays closed until the picture has been watched", () => {
    expect(
      isRoomOpen({ hasWatched: false, hasSubmittedSixWords: false, hasSkippedReview: false }),
    ).toBe(false);
    expect(
      isRoomOpen({ hasWatched: false, hasSubmittedSixWords: true, hasSkippedReview: false }),
    ).toBe(false);
    expect(
      isRoomOpen({ hasWatched: false, hasSubmittedSixWords: false, hasSkippedReview: true }),
    ).toBe(false);
  });

  it("stays closed while the member has watched but decided nothing", () => {
    expect(
      isRoomOpen({ hasWatched: true, hasSubmittedSixWords: false, hasSkippedReview: false }),
    ).toBe(false);
  });

  it("opens on six words", () => {
    expect(
      isRoomOpen({ hasWatched: true, hasSubmittedSixWords: true, hasSkippedReview: false }),
    ).toBe(true);
  });

  // The rule the August handover changed: "Skip still unlocks The Room."
  it("opens on Skip for now, with nothing written", () => {
    expect(
      isRoomOpen({ hasWatched: true, hasSubmittedSixWords: false, hasSkippedReview: true }),
    ).toBe(true);
  });
});

describe("isReviewUndecided", () => {
  it("is the one state that asks for six words", () => {
    expect(
      isReviewUndecided({ hasWatched: true, hasSubmittedSixWords: false, hasSkippedReview: false }),
    ).toBe(true);
  });

  it("stops asking once the member has answered either way", () => {
    expect(
      isReviewUndecided({ hasWatched: true, hasSubmittedSixWords: true, hasSkippedReview: false }),
    ).toBe(false);
    expect(
      isReviewUndecided({ hasWatched: true, hasSubmittedSixWords: false, hasSkippedReview: true }),
    ).toBe(false);
  });

  it("does not ask before the picture is watched", () => {
    expect(
      isReviewUndecided({
        hasWatched: false,
        hasSubmittedSixWords: false,
        hasSkippedReview: false,
      }),
    ).toBe(false);
  });
});

describe("marketing consent", () => {
  it("records a timestamp and source separately from authentication", () => {
    const consent = recordMarketingConsent("join_form", new Date("2026-08-11T00:00:00Z"));
    expect(consent.source).toBe("join_form");
    expect(consent.consentedAt).toBe("2026-08-11T00:00:00.000Z");
  });

  it("requires a source", () => {
    expect(() => recordMarketingConsent("")).toThrow();
  });

  it("withdrawal clears both fields", () => {
    expect(withdrawMarketingConsent()).toEqual({ consentedAt: null, source: null });
  });
});

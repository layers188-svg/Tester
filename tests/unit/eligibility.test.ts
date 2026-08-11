import { describe, expect, it } from "vitest";
import {
  isAfterCreditsEligible,
  recordMarketingConsent,
  withdrawMarketingConsent,
} from "@/lib/opening/eligibility";

describe("isAfterCreditsEligible", () => {
  it("requires both watched and six words", () => {
    expect(isAfterCreditsEligible({ hasWatched: false, hasSubmittedSixWords: false })).toBe(false);
    expect(isAfterCreditsEligible({ hasWatched: true, hasSubmittedSixWords: false })).toBe(false);
    expect(isAfterCreditsEligible({ hasWatched: false, hasSubmittedSixWords: true })).toBe(false);
    expect(isAfterCreditsEligible({ hasWatched: true, hasSubmittedSixWords: true })).toBe(true);
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

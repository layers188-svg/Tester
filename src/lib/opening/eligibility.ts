/**
 * After Credits eligibility (brief Journey A steps 11-12: six words
 * unlock the conversation) and marketing consent helpers (brief §13).
 */

export interface AfterCreditsInput {
  hasWatched: boolean;
  hasSubmittedSixWords: boolean;
}

export function isAfterCreditsEligible({ hasWatched, hasSubmittedSixWords }: AfterCreditsInput): boolean {
  return hasWatched && hasSubmittedSixWords;
}

export interface MarketingConsentRecord {
  consentedAt: string | null;
  source: string | null;
}

/** Marketing consent must be its own explicit, unchecked opt-in — never inferred from auth. */
export function recordMarketingConsent(source: string, now: Date = new Date()): MarketingConsentRecord {
  if (!source || source.trim().length === 0) {
    throw new Error("Marketing consent requires a source.");
  }
  return { consentedAt: now.toISOString(), source };
}

export function withdrawMarketingConsent(): MarketingConsentRecord {
  return { consentedAt: null, source: null };
}

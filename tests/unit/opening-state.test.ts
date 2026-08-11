import { describe, expect, it } from "vitest";
import {
  canTransitionOpeningStatus,
  computeTonightState,
  nextOpeningStatuses,
} from "@/lib/opening/state";

describe("computeTonightState", () => {
  const now = new Date("2026-08-11T20:00:00Z");

  it("is not_available before opens_at", () => {
    const state = computeTonightState({
      openingStatus: "scheduled",
      opensAt: "2026-08-12T20:00:00Z",
      now,
      hasRevealed: false,
      watchState: null,
      hasSixWords: false,
    });
    expect(state).toBe("not_available");
  });

  it("is sealed_ready once open and not revealed", () => {
    const state = computeTonightState({
      openingStatus: "open",
      opensAt: "2026-08-11T18:00:00Z",
      now,
      hasRevealed: false,
      watchState: null,
      hasSixWords: false,
    });
    expect(state).toBe("sealed_ready");
  });

  it("is revealed once revealed with no watch state yet", () => {
    const state = computeTonightState({
      openingStatus: "open",
      opensAt: "2026-08-11T18:00:00Z",
      now,
      hasRevealed: true,
      watchState: null,
      hasSixWords: false,
    });
    expect(state).toBe("revealed");
  });

  it("is saved once saved for later", () => {
    const state = computeTonightState({
      openingStatus: "open",
      opensAt: "2026-08-11T18:00:00Z",
      now,
      hasRevealed: true,
      watchState: "saved",
      hasSixWords: false,
    });
    expect(state).toBe("saved");
  });

  it("is six_words_requested once watched but not yet reviewed", () => {
    const state = computeTonightState({
      openingStatus: "open",
      opensAt: "2026-08-11T18:00:00Z",
      now,
      hasRevealed: true,
      watchState: "watched",
      hasSixWords: false,
    });
    expect(state).toBe("six_words_requested");
  });

  it("is after_credits_open once six words are on record", () => {
    const state = computeTonightState({
      openingStatus: "open",
      opensAt: "2026-08-11T18:00:00Z",
      now,
      hasRevealed: true,
      watchState: "watched",
      hasSixWords: true,
    });
    expect(state).toBe("after_credits_open");
  });
});

describe("opening lifecycle transitions", () => {
  it("allows the forward path draft -> approved -> scheduled -> open -> closed", () => {
    expect(canTransitionOpeningStatus("draft", "approved")).toBe(true);
    expect(canTransitionOpeningStatus("approved", "scheduled")).toBe(true);
    expect(canTransitionOpeningStatus("scheduled", "open")).toBe(true);
    expect(canTransitionOpeningStatus("open", "closed")).toBe(true);
  });

  it("rejects skipping a step", () => {
    expect(canTransitionOpeningStatus("draft", "open")).toBe(false);
    expect(canTransitionOpeningStatus("approved", "open")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransitionOpeningStatus("open", "scheduled")).toBe(false);
    expect(canTransitionOpeningStatus("closed", "open")).toBe(false);
  });

  it("treats re-applying the current status as a safe no-op", () => {
    expect(canTransitionOpeningStatus("open", "open")).toBe(true);
    expect(canTransitionOpeningStatus("closed", "closed")).toBe(true);
  });

  it("closed is a terminal state", () => {
    expect(nextOpeningStatuses("closed")).toEqual([]);
  });
});

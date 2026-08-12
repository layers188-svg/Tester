import { describe, expect, it } from "vitest";
import { assertNoTitleLeak, findTitleLeaks, TitleLeakError } from "@/lib/spoiler/detector";

const FORBIDDEN = ["Whiplash"];

describe("findTitleLeaks", () => {
  it("finds a leak in a plain string, case-insensitively", () => {
    expect(findTitleLeaks("Tonight's film is whiplash.", FORBIDDEN)).toHaveLength(1);
    expect(findTitleLeaks("Tonight's film is WHIPLASH.", FORBIDDEN)).toHaveLength(1);
  });

  it("finds a leak nested inside an object", () => {
    const payload = { subject: "Ready", body: { detail: "Tonight: Whiplash" } };
    const leaks = findTitleLeaks(payload, FORBIDDEN);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].path).toBe("$.body.detail");
  });

  it("finds a leak inside an array", () => {
    const payload = ["safe", "also safe", "Whiplash is next"];
    expect(findTitleLeaks(payload, FORBIDDEN)).toHaveLength(1);
  });

  it("finds every occurrence, not just the first", () => {
    const payload = { a: "Whiplash", b: "Whiplash" };
    expect(findTitleLeaks(payload, FORBIDDEN)).toHaveLength(2);
  });

  it("returns nothing for a clean payload", () => {
    const payload = {
      subject: "Tonight's opening is ready",
      cues: ["Drummer", "School", "Ambition"],
    };
    expect(findTitleLeaks(payload, FORBIDDEN)).toHaveLength(0);
  });

  it("does not loop forever on a circular object", () => {
    const payload: Record<string, unknown> = { subject: "safe" };
    payload.self = payload;
    expect(() => findTitleLeaks(payload, FORBIDDEN)).not.toThrow();
  });
});

describe("assertNoTitleLeak", () => {
  it("throws with the offending path when a leak is present", () => {
    expect(() => assertNoTitleLeak({ subject: "Whiplash" }, FORBIDDEN, "test payload")).toThrow(
      /\$\.subject/,
    );
  });

  it("never puts the leaked title in the error message", () => {
    // The message is the most likely thing to be logged, serialised into
    // a response, or written to notification_queue.last_error — which
    // the member can read. Naming the title there would make the guard
    // the leak. The excerpts stay on `error.leaks` for tests only.
    let caught: unknown;
    try {
      assertNoTitleLeak({ subject: "Tonight: Whiplash" }, FORBIDDEN, "test payload");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TitleLeakError);
    const error = caught as TitleLeakError;
    expect(error.message).not.toMatch(/Whiplash/i);
    expect(error.message).toContain("$.subject");
    expect(error.paths).toEqual(["$.subject"]);
    // The detail is still recoverable for debugging, just not in the message.
    expect(error.leaks[0].excerpt).toContain("Whiplash");
  });

  it("reports every distinct path without repeating one", () => {
    let caught: unknown;
    try {
      assertNoTitleLeak(
        { subject: "Whiplash", body: "Whiplash and Whiplash" },
        FORBIDDEN,
        "test payload",
      );
    } catch (error) {
      caught = error;
    }
    expect((caught as TitleLeakError).paths).toEqual(["$.subject", "$.body"]);
  });

  it("does not throw for a clean payload", () => {
    expect(() =>
      assertNoTitleLeak({ subject: "Tonight is sealed" }, FORBIDDEN, "test payload"),
    ).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { assertNoTitleLeak, findTitleLeaks } from "@/lib/spoiler/detector";

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
      /Whiplash/,
    );
  });

  it("does not throw for a clean payload", () => {
    expect(() =>
      assertNoTitleLeak({ subject: "Tonight is sealed" }, FORBIDDEN, "test payload"),
    ).not.toThrow();
  });
});

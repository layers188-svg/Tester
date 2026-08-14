// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { startViewTransition } from "@/lib/motion";

/**
 * The persistent-object mechanism, and its two escape hatches.
 *
 * What cannot be asserted here is the animation itself: jsdom has no
 * View Transition API and no compositor, so the browser's morph between
 * two elements sharing a `view-transition-name` is not something a unit
 * test can see. What it can prove is the part that would silently break
 * the product if it were wrong — that the state update always happens,
 * whether or not a transition runs.
 */
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
});

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reduce })),
  );
}

describe("startViewTransition", () => {
  it("runs the update directly where the API does not exist", () => {
    stubMatchMedia(false);
    const update = vi.fn();

    startViewTransition(update);

    // Every browser without the API still has to reach the new state.
    // A transition is decoration; the state change is the product.
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("runs the update directly, and immediately, under reduced motion", () => {
    stubMatchMedia(true);
    const start = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: start,
    });
    const update = vi.fn();

    startViewTransition(update);

    expect(update).toHaveBeenCalledTimes(1);
    // Not merely un-animated: no transition is started at all, so there
    // is nothing to sit through. A member who asked for less motion gets
    // the new screen now.
    expect(start).not.toHaveBeenCalled();
  });

  it("hands the update to the browser when a transition is possible", () => {
    stubMatchMedia(false);
    const update = vi.fn();
    const start = vi.fn((callback: () => void) => {
      callback();
      return { finished: Promise.resolve() };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: start,
    });

    startViewTransition(update);

    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("swallows an interrupted transition rather than reporting it", async () => {
    stubMatchMedia(false);
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (callback: () => void) => {
        callback();
        // What the browser does when a second transition starts before
        // the first has finished. Tapping twice is not an error.
        return { finished: Promise.reject(new Error("AbortError")) };
      },
    });

    const update = vi.fn();
    expect(() => startViewTransition(update)).not.toThrow();
    expect(update).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
});

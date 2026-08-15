import { describe, expect, it } from "vitest";
import { anchorFor, placeVoice, sceneHeightVh, windowFor } from "@/lib/room/field";

/**
 * The Room's field geometry (handover 01_MOTION_SYSTEM.md §11).
 *
 * The motion itself has to be judged in a browser — "If motion can only
 * be identified frame by frame, it is too subtle" — and it is, in
 * tests/e2e/motion.spec.ts. What is provable here is that the mapping
 * from one progress value to five properties is coherent: a voice
 * cannot be near in scale and far in opacity, and every property has to
 * actually travel far enough to be seen.
 */

const options = { anchor: 0.5, window: 0.4, depth: 1, drift: -1 };

describe("placeVoice", () => {
  it("puts a voice at rest, full size and sharp, at its anchor", () => {
    const at = placeVoice(0.5, options);
    expect(at.y).toBeCloseTo(0);
    expect(at.opacity).toBeCloseTo(1);
    expect(at.blur).toBeCloseTo(0);
    expect(at.scale).toBeGreaterThan(1.1);
  });

  it("approaches from below and passes above", () => {
    const approaching = placeVoice(0.2, options);
    const passed = placeVoice(0.8, options);
    expect(approaching.y).toBeGreaterThan(0);
    expect(passed.y).toBeLessThan(0);
  });

  it("softens and shrinks with distance, together", () => {
    const near = placeVoice(0.5, options);
    const mid = placeVoice(0.65, options);
    const far = placeVoice(0.9, options);

    expect(mid.opacity).toBeLessThan(near.opacity);
    expect(far.opacity).toBeLessThan(mid.opacity);

    expect(mid.scale).toBeLessThan(near.scale);
    expect(far.scale).toBeLessThan(mid.scale);

    expect(mid.blur).toBeGreaterThan(near.blur);
    expect(far.blur).toBeGreaterThan(mid.blur);
  });

  // Motion principle 5: 3 to 5px micro motion is not the effect.
  it("travels far enough to be seen at normal speed", () => {
    const start = placeVoice(0, options);
    const end = placeVoice(1, options);
    expect(Math.abs(start.y - end.y)).toBeGreaterThan(200);
  });

  it("holds a voice at the edge of the field rather than losing it", () => {
    const wayPast = placeVoice(5, options);
    const wayBefore = placeVoice(-5, options);
    expect(wayPast.opacity).toBeGreaterThan(0);
    expect(wayBefore.opacity).toBeGreaterThan(0);
    expect(Number.isFinite(wayPast.scale)).toBe(true);
    expect(Number.isFinite(wayBefore.scale)).toBe(true);
  });

  it("sits House voices deeper in the field than Circle voices", () => {
    const circle = placeVoice(0.5, { ...options, depth: 1 });
    const house = placeVoice(0.5, { ...options, depth: 0.86 });
    expect(house.scale).toBeLessThan(circle.scale);
  });

  it("drifts opposite ways for alternating voices", () => {
    const left = placeVoice(0.2, { ...options, drift: -1 });
    const right = placeVoice(0.2, { ...options, drift: 1 });
    expect(Math.sign(left.x)).toBe(-1);
    expect(Math.sign(right.x)).toBe(1);
  });
});

describe("anchorFor", () => {
  it("keeps the first and last voice inside the scroll rather than half seen", () => {
    expect(anchorFor(0, 4)).toBeGreaterThan(0);
    expect(anchorFor(3, 4)).toBeLessThan(1);
  });

  it("spreads voices in order", () => {
    const anchors = [0, 1, 2, 3].map((i) => anchorFor(i, 4));
    expect(anchors).toEqual([...anchors].sort((a, b) => a - b));
  });

  it("centres a lone voice", () => {
    expect(anchorFor(0, 1)).toBe(0.5);
  });
});

describe("windowFor", () => {
  it("overlaps neighbours, so the field never goes empty between voices", () => {
    for (const total of [2, 4, 8, 20]) {
      const gap = anchorFor(1, total) - anchorFor(0, total);
      expect(windowFor(total)).toBeGreaterThan(gap);
    }
  });
});

describe("sceneHeightVh", () => {
  it("stays inside the documented 350-450vh ceiling", () => {
    expect(sceneHeightVh(40)).toBeLessThanOrEqual(450);
  });

  it("gives a short Room less scroll than a long one", () => {
    expect(sceneHeightVh(2)).toBeLessThan(sceneHeightVh(8));
  });

  it("always leaves something to scroll", () => {
    expect(sceneHeightVh(0)).toBeGreaterThan(100);
  });
});

// @vitest-environment jsdom
// `prefersReducedMotion` reads window.matchMedia, which the default
// node environment does not have — and "returns false when there is no
// window" is the uninteresting half of the behaviour.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION, motionDuration, prefersReducedMotion } from "@/lib/motion";

const tokens = readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8");

/**
 * The token declared for `name` in the `:root` block — not the one in
 * the reduced-motion override, which is `0ms` for all of them.
 */
function rootToken(name: string): string {
  const root = tokens.slice(0, tokens.indexOf("@media (prefers-reduced-motion"));
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(root);
  if (!match) throw new Error(`No ${name} in the :root block of tokens.css`);
  return match[1].trim();
}

describe("motion vocabulary", () => {
  /**
   * The sequences in Tonight are half CSS and half setTimeout. If these
   * two files disagree, the next screen arrives before the previous one
   * has finished leaving — a bug that looks like a rendering glitch and
   * is very hard to trace back to a number.
   */
  const pairs: Array<[keyof typeof MOTION, string]> = [
    ["button", "--hd-motion-button"],
    ["panel", "--hd-motion-panel"],
    ["dim", "--hd-motion-dim"],
    ["reveal", "--hd-motion-reveal"],
    ["focus", "--hd-motion-focus"],
    ["unseal", "--hd-motion-unseal"],
    ["transform", "--hd-motion-transform"],
    ["hold", "--hd-hold"],
    ["holdLong", "--hd-hold-long"],
  ];

  it.each(pairs)("MOTION.%s matches %s in tokens.css", (key, token) => {
    expect(rootToken(token)).toBe(`${MOTION[key]}ms`);
  });

  it("collapses every timing under reduced motion", () => {
    const reduced = tokens.slice(tokens.indexOf("@media (prefers-reduced-motion"));
    for (const [, token] of pairs) {
      expect(reduced).toContain(`${token}: 0ms;`);
    }
  });
});

describe("motionDuration", () => {
  afterEach(() => vi.unstubAllGlobals());

  // jsdom implements no matchMedia at all, so this is defined rather
  // than spied on. That absence is also why prefersReducedMotion checks
  // for the function and not just for `window`.
  function withReducedMotion(matches: boolean) {
    vi.stubGlobal(
      "matchMedia",
      (query: string) => ({ matches: query.includes("reduce") && matches }) as MediaQueryList,
    );
  }

  it("answers false where the browser has no matchMedia", () => {
    expect(window.matchMedia).toBeUndefined();
    expect(prefersReducedMotion()).toBe(false);
    expect(motionDuration(MOTION.hold)).toBe(MOTION.hold);
  });

  it("passes the duration through when motion is welcome", () => {
    withReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(motionDuration(MOTION.hold)).toBe(MOTION.hold);
  });

  /**
   * The point of the whole helper. Reduced motion zeroes the CSS
   * tokens, so without this a member who asked for less motion would
   * get no animation and still wait out every pause.
   */
  it("collapses a hold to nothing when the member asked for less motion", () => {
    withReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(motionDuration(MOTION.holdLong)).toBe(0);
  });
});

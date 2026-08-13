/**
 * The House Dark motion vocabulary, in milliseconds.
 *
 * These are the same numbers as the `--hd-motion-*` and `--hd-hold-*`
 * tokens in `src/styles/tokens.css`, and they have to be: a sequence
 * like DIM → HOLD → FOCUS is half CSS transition and half JavaScript
 * timeout, and if the two halves disagree the member sees the next
 * screen arrive before the previous one has finished leaving.
 *
 * `tests/motion-tokens.test.ts` parses tokens.css and fails if these
 * drift apart, so the duplication cannot rot quietly.
 */
export const MOTION = {
  /** Buttons and other direct feedback. */
  button: 100,
  /** Panels and disclosures. */
  panel: 220,
  /** DIM — the room falls into darkness. */
  dim: 360,
  /** A thing arriving on screen. */
  reveal: 560,
  /** FOCUS — the clue frame becomes the dominant object. */
  focus: 620,
  /** UNSEAL — a concealed thing opens. */
  unseal: 720,
  /** REVEAL — the page transforms into the answer. */
  transform: 900,
  /** HOLD — a deliberate pause. */
  hold: 420,
  /** HOLD, at a moment that earns a longer one. */
  holdLong: 900,
} as const;

export type MotionName = keyof typeof MOTION;

/**
 * Whether the member has asked their system for less motion.
 *
 * Safe to call during render and on the server: it answers `false`
 * where there is no `window`, which is also the correct first paint —
 * the server cannot know the preference, and the client corrects it
 * before anything has had time to move.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A duration to use for a `setTimeout`, honouring reduced motion.
 *
 * The CSS tokens already collapse to `0ms` under the media query, but
 * a timeout in a component does not, and that asymmetry is worse than
 * no support at all: the animation would be gone while the member sat
 * through the same pause, staring at a screen that had already
 * finished. Every timing in a sequence goes through here.
 */
export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

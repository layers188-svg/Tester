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

  /* The three ordinary speeds. See tokens.css for what each is for. */
  fast: 180,
  standard: 320,
  slow: 560,
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

/**
 * The three levels of the House Dark motion system.
 *
 * Not every change deserves the same amount of movement. If everything
 * moves, nothing reads as important, so each transition is deliberately
 * assigned a level and the level fixes its budget.
 *
 *   TACTILE     a control answering a touch
 *   STRUCTURAL  a piece of the page changing: navigation, a record
 *               opening, a search result being chosen
 *   CINEMATIC   one of the six verbs. Reserved for the moments the
 *               product exists for, and never spent anywhere else.
 */
export const LEVEL = {
  tactile: MOTION.fast,
  structural: MOTION.standard,
  cinematic: MOTION.focus,
} as const;

/**
 * Run a state change inside a View Transition.
 *
 * This is the mechanism behind the persistent-object rule. React
 * unmounts one tree and mounts another; without this the browser has no
 * idea the large title on the reveal and the smaller one on the House
 * are the same words, so it cross-fades two unrelated pictures. Inside
 * a view transition, any two elements sharing a `view-transition-name`
 * are treated as one object that moved, and the browser interpolates
 * position, size and shape for free — no measuring, no FLIP maths, no
 * animation library.
 *
 * Three things it deliberately does NOT do:
 *
 *   * wait. The returned promise is ignored by callers, because a
 *     transition that has to be awaited is a transition that can block
 *     an interaction if it goes wrong.
 *   * animate under reduced motion. The update runs immediately, so the
 *     member gets the new state with no travel and no delay.
 *   * require support. Browsers without `startViewTransition` run the
 *     update directly, which is exactly the old behaviour.
 */
export function startViewTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };

  if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }

  /*
   * React 19 batches state updates asynchronously, so the callback has
   * to flush synchronously for the browser to capture the "after" state
   * at the right moment. `flushSync` is the documented way, but calling
   * it from inside an event handler that React is already processing
   * warns — and the warning is right. Instead the update is scheduled
   * and the transition captures on the next frame, which is what the
   * View Transition API is built to do with `startViewTransition`
   * returning a promise that resolves once the DOM has settled.
   */
  doc
    .startViewTransition(() => {
      update();
      // Give React a chance to commit before the browser snapshots.
      return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    })
    .finished.catch(() => {
      // A transition interrupted by another one rejects. That is normal
      // when somebody taps twice, and it is not an error worth surfacing.
    });
}

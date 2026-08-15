"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import styles from "./EntryAperture.module.css";

/**
 * The way into the House (handover 00_BUILD_BRIEF_FINAL.md §11,
 * 01_MOTION_SYSTEM.md §5).
 *
 *   The site begins in darkness. A controlled field of warm optical
 *   light partially reveals the House Dark wordmark. The pointer can
 *   move the light slightly. The effect should feel precise and
 *   expensive, not nostalgic or distressed.
 *
 * So: no film scratches, no sepia, no Super 8 jitter, no projector
 * icon, no fake countdown leader. The light is a real mask over the
 * approved wordmark rather than an image of light over a picture of
 * one, which is why the wordmark stays crisp while the field moves.
 *
 * Deliberately CSS and a mask rather than canvas or WebGL. The brief
 * asks for heavy work to be reserved for something that cannot be done
 * otherwise, and this can: the pointer writes two custom properties and
 * the compositor does the rest.
 *
 * The failure mode that matters here is being stranded. An entry that
 * covers the House and waits for an animation event that never fires is
 * a black screen with no way out — one of the prototype's recorded
 * failures. So every step is driven by a timer that has already been
 * scheduled, `ready` is forced on after a deadline regardless, and
 * Escape dismisses at any point.
 */

/** Milestones from 01_MOTION_SYSTEM.md §5 "Timeline". */
const LIGHT_CATCHES_AT = 300;
const LINE_RESOLVES_AT = 1100;
const ACTION_APPEARS_AT = 1400;
/** If nothing has fired by here, show everything anyway. */
const SAFETY_DEADLINE = 2600;

/** "Enter transition", §5. */
const IRIS_CLOSE_MS = 650;
const BLACK_HOLD_MS = 350;

type Phase = "dark" | "light" | "settled" | "closing" | "held";

export function EntryAperture({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("dark");

  /*
   * `reducedMotion` is false on the server and on the first client
   * render — the preference is an external store and only resolves
   * after that. Seeding state from it would therefore start every
   * reduced-motion visitor at "dark" and leave them there, because the
   * timeline that advances the phase is exactly the thing reduced
   * motion turns off. Deriving instead means the correction lands
   * whenever the store resolves.
   */
  const shown: Phase = reducedMotion && (phase === "dark" || phase === "light") ? "settled" : phase;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };

    at(LIGHT_CATCHES_AT, () => setPhase("light"));
    at(LINE_RESOLVES_AT, () => setPhase("settled"));
    // The safety path. Nothing here waits on an animation event, but a
    // backgrounded tab can starve timers, so the last word is a
    // deadline that only ever moves the entry forward.
    at(SAFETY_DEADLINE, () =>
      setPhase((current) => (current === "dark" || current === "light" ? "settled" : current)),
    );

    return clearTimers;
  }, [reducedMotion, clearTimers]);

  /*
   * The pointer moves the light "by a small amount". The field is
   * followed at roughly a fifth of the pointer's travel and written
   * straight to custom properties — no React state, so this costs a
   * style recalculation rather than a render.
   */
  useEffect(() => {
    if (reducedMotion) return;
    const field = fieldRef.current;
    if (!field) return;

    let frame = 0;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    const handlePointer = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      targetX = 50 + (((event.clientX - rect.left) / rect.width) * 100 - 50) * 0.22;
      targetY = 50 + (((event.clientY - rect.top) / rect.height) * 100 - 50) * 0.22;
      if (!frame) frame = requestAnimationFrame(follow);
    };

    function follow() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      field!.style.setProperty("--light-x", `${currentX.toFixed(2)}%`);
      field!.style.setProperty("--light-y", `${currentY.toFixed(2)}%`);
      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        frame = requestAnimationFrame(follow);
      } else {
        frame = 0;
      }
    }

    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  const enter = useCallback(
    (event: React.MouseEvent) => {
      clearTimers();
      if (reducedMotion) return; // let the link navigate
      // The ceremony replaces the plain navigation, and only once we
      // know we can run it.
      event.preventDefault();
      setPhase("closing");
      timers.current.push(
        setTimeout(() => {
          setPhase("held");
          timers.current.push(setTimeout(() => router.push("/join"), BLACK_HOLD_MS));
        }, IRIS_CLOSE_MS),
      );
    },
    [clearTimers, reducedMotion, router],
  );

  // Never a trap. Escape leaves at any point in the sequence.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearTimers();
        onDismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTimers, onDismiss]);

  const showLine = shown !== "dark" && shown !== "light";
  const showAction = showLine;

  return (
    <div className={styles.entry} data-phase={shown} role="dialog" aria-label="Enter House Dark">
      <div className={styles.field} ref={fieldRef}>
        {/*
         * The wordmark is always here and always crisp; the light
         * decides how much of it you see.
         *
         * Not a heading. A wordmark is the identity, not the page's
         * title — and the House underneath already has an h1, so making
         * this one too would put two on the page. The aperture names
         * itself through role="dialog" and its label.
         */}
        <div className={styles.markLayer}>
          <Wordmark />
        </div>
        <div className={styles.bloom} aria-hidden="true" />
        <div className={styles.dust} aria-hidden="true" />
      </div>

      <div className={styles.copy}>
        <p className={styles.kicker} data-visible={showLine}>
          A private film club
        </p>
        <p className={styles.line} data-visible={showLine}>
          Find the joy in not knowing.
        </p>
      </div>

      <div className={styles.actions} data-visible={showAction}>
        {/*
         * A real link, so it works before hydration and without
         * JavaScript at all. The click handler upgrades it to the
         * aperture close when it can, and otherwise lets the browser
         * follow it.
         */}
        <Link
          href="/join"
          className={styles.enter}
          onClick={enter}
          // Before the copy resolves there is nothing to read yet, so
          // the control is not reachable — rather than reachable and
          // invisible, which is worse for a keyboard than being late.
          tabIndex={showAction ? 0 : -1}
          aria-hidden={!showAction}
        >
          Enter in the dark
        </Link>
        <button
          type="button"
          className={styles.aside}
          onClick={() => {
            clearTimers();
            onDismiss();
          }}
          tabIndex={showAction ? 0 : -1}
          aria-hidden={!showAction}
        >
          Read about the House
        </button>
      </div>
    </div>
  );
}

/** Milestone timings, exported so the rendered-motion tests assert the same numbers. */
export const ENTRY_TIMELINE = {
  LIGHT_CATCHES_AT,
  LINE_RESOLVES_AT,
  ACTION_APPEARS_AT,
  SAFETY_DEADLINE,
  IRIS_CLOSE_MS,
  BLACK_HOLD_MS,
};

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import styles from "./SealedFrame.module.css";

/**
 * `TONIGHT IS SEALED`, and the deliberate act that opens the clue.
 *
 * Motion system §6 asks for the member to *cause* the state change
 * rather than press a button and watch an animation, and the reference
 * for it is Mouthful of Dust — direct manipulation. So the seal opens
 * on a press held for a beat, with a brass rule drawing across the
 * frame as it goes: releasing early returns the object to sealed,
 * exactly as §6 requires, and the member can feel that they are the one
 * opening it.
 *
 * The same element handles a held Enter or Space, so the keyboard path
 * is the identical interaction rather than a lesser fallback
 * (03_TECHNICAL_INTEGRATION "keyboard path for every direct-manipulation
 * interaction"). Under reduced motion the hold is dropped entirely and
 * a press opens the clue at once — a member who has asked for no motion
 * should not be made to hold still while something animates.
 *
 * This component never receives a title. It receives the opening number
 * and the safe cues, which is everything the sealed state is allowed to
 * know.
 */

const HOLD_MS = 620;

export function SealedFrame({
  openingNumber,
  cues,
  open,
  onOpenClue,
  onContinue,
}: {
  openingNumber: number;
  cues: string[];
  /** True once the clue has been opened — the frame keeps its identity, its contents change. */
  open: boolean;
  onOpenClue: () => void;
  onContinue: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [holdProgress, setHoldProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const keyHeld = useRef(false);

  const cancelHold = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    startedAt.current = null;
    setHoldProgress(0);
  }, []);

  useEffect(() => cancelHold, [cancelHold]);

  const beginHold = useCallback(() => {
    if (open) return;
    if (reducedMotion) {
      onOpenClue();
      return;
    }
    if (startedAt.current !== null) return;
    startedAt.current = performance.now();

    const step = (now: number) => {
      if (startedAt.current === null) return;
      const elapsed = now - startedAt.current;
      const progress = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        cancelHold();
        onOpenClue();
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [open, reducedMotion, onOpenClue, cancelHold]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    // Key repeat would restart the hold on every tick.
    if (keyHeld.current) return;
    keyHeld.current = true;
    beginHold();
  }

  function handleKeyUp(event: React.KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    keyHeld.current = false;
    cancelHold();
  }

  if (open) {
    return (
      <div className={styles.opened}>
        <p className={styles.eyebrow}>Opening {openingNumber}</p>
        {cues.length > 0 ? (
          <p className={styles.clue}>{cues.join(" · ")}</p>
        ) : (
          <p className={styles.clue}>No clue tonight.</p>
        )}
        <p className={styles.clueNote}>That is the whole clue.</p>
        <button type="button" className={styles.continue} onClick={onContinue}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.seal}
      style={{ "--hold": holdProgress } as React.CSSProperties}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => {
        keyHeld.current = false;
        cancelHold();
      }}
    >
      <span className={styles.eyebrow}>Opening {openingNumber}</span>
      <span className={styles.sealedLine}>Tonight is sealed.</span>
      <span className={styles.instruction}>
        {reducedMotion ? "See tonight's clue" : "Press and hold to see tonight's clue"}
      </span>
      <span className={styles.holdRule} aria-hidden="true">
        <span className={styles.holdFill} />
      </span>
    </button>
  );
}

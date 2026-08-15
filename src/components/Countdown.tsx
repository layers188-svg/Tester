"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./Countdown.module.css";

/**
 * Time to the next Opening (handover 00_BUILD_BRIEF_FINAL.md §9).
 *
 * Three rules from that section, all of them about not lying to the
 * member or to their screen reader:
 *
 *   "Use one canonical nextOpeningAt timestamp. Calculate remaining
 *   time from the timestamp every second. Do not store and decrement a
 *   counter." A decremented counter drifts, and it is wrong by minutes
 *   after a phone sleeps. This subtracts from the timestamp on every
 *   tick, so a backgrounded tab returns correct.
 *
 *   "At zero, refresh or invalidate Opening state without requiring a
 *   hard page reload." `onElapsed` fires once, and Tonight answers it
 *   with router.refresh().
 *
 *   "Do not announce every second to screen readers." The ticking
 *   figures are aria-hidden. What assistive tech gets instead is the
 *   one sentence that actually carries the information: the wall-clock
 *   time the House opens.
 */

interface CountdownProps {
  /** ISO timestamp. The single source of truth — nothing else is stored. */
  target: string;
  onElapsed?: () => void;
}

/*
 * The clock is an external store, so it is read as one. Polling at
 * 250ms and snapping to whole seconds means the display never sits on a
 * stale figure for most of a second, while the snapshot only changes
 * once a second — so React re-renders once a second, not four times.
 */
function subscribeToClock(onChange: () => void): () => void {
  const timer = setInterval(onChange, 250);
  return () => clearInterval(timer);
}

function readSecond(): number {
  return Math.floor(Date.now() / 1000);
}

/** No clock on the server: render nothing until the browser has one. */
function readSecondOnServer(): null {
  return null;
}

function remainingFrom(target: string, now: number): number {
  return Math.max(0, new Date(target).getTime() - now);
}

function parts(ms: number) {
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function Countdown({ target, onElapsed }: CountdownProps) {
  const second = useSyncExternalStore(subscribeToClock, readSecond, readSecondOnServer);
  const fired = useRef(false);

  // Recomputed from the timestamp on every tick, never decremented —
  // so a phone that slept for an hour comes back correct rather than an
  // hour behind.
  const remaining = second === null ? null : remainingFrom(target, second * 1000);

  useEffect(() => {
    fired.current = false;
  }, [target]);

  useEffect(() => {
    if (remaining !== 0 || fired.current) return;
    fired.current = true;
    onElapsed?.();
  }, [remaining, onElapsed]);

  if (remaining === null) return null;

  const { hours, minutes, seconds } = parts(remaining);
  const opensAt = new Date(target);

  return (
    <div className={styles.countdown}>
      <p className={styles.label}>Next opening</p>
      <p className={styles.figures} aria-hidden="true">
        {hours > 0 && (
          <>
            <span className={styles.unit}>{String(hours).padStart(2, "0")}</span>
            <span className={styles.separator}>:</span>
          </>
        )}
        <span className={styles.unit}>{String(minutes).padStart(2, "0")}</span>
        <span className={styles.separator}>:</span>
        <span className={styles.unit}>{String(seconds).padStart(2, "0")}</span>
      </p>
      <p className="hd-visually-hidden">
        The next opening is at{" "}
        {opensAt.toLocaleString(undefined, {
          weekday: "long",
          hour: "numeric",
          minute: "2-digit",
        })}
        .
      </p>
    </div>
  );
}

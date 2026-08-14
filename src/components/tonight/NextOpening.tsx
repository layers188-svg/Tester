"use client";

import { useEffect, useState } from "react";
import { countdownSegments, remainingUntil, tickInterval } from "@/lib/opening/countdown";
import styles from "./NextOpening.module.css";

/**
 * When the house opens next.
 *
 * Always counts to a real `opens_at` from the database. There is a
 * daily 7pm rhythm and the Desk defaults to it, but a countdown is a
 * promise, and the only thing entitled to make one is a scheduled
 * opening. With nothing scheduled this says so instead.
 *
 * The clock starts null and fills in after mount, deliberately. The
 * server renders at one instant and the browser reads it at another,
 * so any countdown rendered on the server is wrong by the time it
 * arrives and React reports it as a hydration mismatch. The label is
 * present in the server HTML; only the number waits.
 */
export function NextOpening({
  opensAt,
  openingNumber,
  label = "Next opening",
  large = false,
}: {
  opensAt: string | null;
  openingNumber: number | null;
  label?: string;
  /** Tonight sets this: before the house opens, the clock is the page. */
  large?: boolean;
}) {
  const [remaining, setRemaining] = useState<ReturnType<typeof remainingUntil> | null>(null);

  useEffect(() => {
    if (!opensAt) return;

    let timer: ReturnType<typeof setTimeout>;

    // Reschedules itself rather than running on a fixed interval, so
    // the tick can slow to once a minute for the hours in the middle
    // and speed up for the final sixty seconds.
    const tick = () => {
      const next = remainingUntil(opensAt);
      setRemaining(next);
      timer = setTimeout(tick, tickInterval(next));
    };
    tick();

    return () => clearTimeout(timer);
  }, [opensAt]);

  if (!opensAt) {
    return (
      <p className={styles.wrap}>
        <span className={styles.label}>The house opens at 7pm</span>
      </p>
    );
  }

  const at = new Date(opensAt);
  const clock = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const weekday = at.toLocaleDateString(undefined, { weekday: "long" });

  return (
    <div className={styles.wrap} data-large={large || undefined}>
      <span className={styles.label}>{openingNumber ? `${label} ${openingNumber}` : label}</span>
      <span className={styles.rule} aria-hidden="true" />

      {/*
        `time` carries the machine-readable instant, so the countdown is
        recoverable by anything that cannot use the rendered text, and
        the title gives the wall-clock time in the member's own zone —
        which is what toLocaleTimeString formats to without being asked.

        One timestamp drives all of it: the weekday, the clock and every
        digit below are read from `opensAt`. There is no second source
        to drift against.
      */}
      <time className={styles.when} dateTime={opensAt} title={`Opens at ${clock}`}>
        {weekday} · {clock}
      </time>

      {/*
        The clock itself.
        
        `aria-live` is deliberately absent: a countdown announcing
        itself every second is unusable with a screen reader, and the
        `time` element above already carries the real instant in a form
        assistive technology can read once and understand.
      */}
      {remaining && !remaining.done ? (
        <p className={styles.clock} aria-hidden="true">
          {countdownSegments(remaining).map((segment, index) => (
            <span key={segment.unit} className={styles.segment}>
              {index > 0 && <span className={styles.colon}>:</span>}
              <span className={styles.digits}>{segment.value}</span>
              <span className={styles.unit}>{segment.unit}</span>
            </span>
          ))}
        </p>
      ) : remaining?.done ? (
        <p className={styles.clock}>Opening now</p>
      ) : null}
    </div>
  );
}

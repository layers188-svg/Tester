"use client";

import { useEffect, useState } from "react";
import { formatRemaining, remainingUntil, tickInterval } from "@/lib/opening/countdown";
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
}: {
  opensAt: string | null;
  openingNumber: number | null;
  label?: string;
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

  return (
    <p className={styles.wrap}>
      <span className={styles.label}>{openingNumber ? `${label} ${openingNumber}` : label}</span>
      <span className={styles.rule} aria-hidden="true" />
      {/*
        `time` carries the machine-readable instant, so the countdown is
        recoverable by anything that cannot use the rendered text, and
        the title gives the wall-clock time in the member's own zone —
        which is what toLocaleTimeString formats to without being asked.
      */}
      <time className={styles.value} dateTime={opensAt} title={`Opens at ${clock}`}>
        {remaining ? formatRemaining(remaining) : clock}
      </time>
    </p>
  );
}

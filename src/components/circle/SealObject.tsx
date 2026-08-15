"use client";

import styles from "./SealObject.module.css";

/**
 * The sealed recommendation, as a physical object.
 *
 * Both directions of Circle use this one component, which is the point:
 * the sender composes into the same object the recipient later opens,
 * and neither side ever sees a different thing appear in its place
 * (handover 00_BUILD_BRIEF_FINAL.md §6, 01_MOTION_SYSTEM.md §13).
 *
 * The seam down the middle is what closes when a recommendation is
 * sent, and what parts when one is opened. It is drawn rather than
 * imagined so that both motions have something real to act on.
 *
 * Nothing in this component takes a title. The sender's own preview is
 * title-free too — not because the sender does not know it, but because
 * the preview's job is to show them exactly what their friend will see,
 * and a preview that quietly included the title would be showing them
 * the wrong thing.
 */

export type SealState =
  /** Composed, or received and not yet opened. */
  | "sealed"
  /** Sending: compressing, seam closing. */
  | "sealing"
  /** The beat after the seam meets. */
  | "held"
  /** Sent under seal. */
  | "sent"
  /** Opening: the same object unfolding. */
  | "opening"
  /** Open, showing what is inside. */
  | "open";

export function SealObject({
  state,
  senderName,
  note,
  cues,
  runtimeMinutes,
  recipientCount,
  children,
}: {
  state: SealState;
  senderName: string | null;
  note: string | null;
  cues: string[];
  runtimeMinutes: number | null;
  /** Sender side only: how many people this is addressed to. */
  recipientCount?: number;
  /** Revealed content, once the object is open. */
  children?: React.ReactNode;
}) {
  const closed = state === "sealed" || state === "sealing" || state === "held";

  return (
    <div className={styles.object} data-state={state}>
      <span className={styles.seam} aria-hidden="true" />

      {state === "sent" ? (
        <div className={styles.sentFace}>
          <SealMark />
          <p className={styles.sentLine}>Sent under seal</p>
        </div>
      ) : (
        <div className={styles.face}>
          {closed && <SealMark />}

          <p className={styles.eyebrow}>Under seal</p>

          {senderName && <p className={styles.sender}>From {senderName}</p>}
          {recipientCount !== undefined && (
            <p className={styles.sender}>
              To {recipientCount} {recipientCount === 1 ? "person" : "people"}
            </p>
          )}

          {closed && <p className={styles.waiting}>A film is waiting.</p>}

          {note && <p className={styles.note}>{note}</p>}

          {cues.length > 0 && (
            <ul className={styles.cues}>
              {cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          )}

          {runtimeMinutes !== null && <p className={styles.runtime}>{runtimeMinutes} minutes</p>}

          {children}
        </div>
      )}
    </div>
  );
}

/** The brass registration mark that resolves as the seam closes. */
function SealMark() {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Sealed"
      focusable="false"
    >
      <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M24 13v22M13 24h22" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { countWords, validateSixWords, withinEditWindow } from "@/lib/validation/six-words";
import { MOTION, motionDuration } from "@/lib/motion";
import { Button } from "@/components/Button";
import { WordSlots } from "./WordSlots";
import styles from "./SixWordsPanel.module.css";

interface OwnReview {
  id: string;
  body: string;
  createdAt: string;
}

interface SixWordsPanelProps {
  target: { openingId: string } | { sealedRecommendationId: string };
  initialOwnReview: OwnReview | null;
  /**
   * Fired when the member publishes, so the screen around this one can
   * change without a reload.
   */
  onPublished?: () => void;
  /**
   * Offered when the member can reasonably move on without writing.
   * Absent means there is nowhere for them to go yet.
   */
  onSkip?: () => void;
}

/** The submission moment, in the order the member sees it. */
type Stage = "writing" | "settling" | "yours" | "open";

/**
 * Six words, written before the member has read anybody else's.
 *
 * This screen used to end with a list of everyone else's words directly
 * underneath the form. That was the whole product backwards: the member
 * could read the room with their own words still uncommitted in the
 * field above. Others now live only in the Room, which is a separate
 * page reachable only from the end of this sequence.
 *
 * The rule is still enforced twice over. `can_view_six_word_review` in
 * RLS and `get_after_credits` in migration 0017 both refuse to return
 * anyone else's words to a member who has not published, so removing
 * the list here is a product decision resting on a database guarantee,
 * not the guarantee itself.
 */
export function SixWordsPanel({
  target,
  initialOwnReview,
  onPublished,
  onSkip,
}: SixWordsPanelProps) {
  const [own, setOwn] = useState(initialOwnReview);
  const [draft, setDraft] = useState(initialOwnReview?.body ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("writing");

  const validation = validateSixWords(draft);
  const wordCount = countWords(draft);

  // The Room is per opening. A sealed recommendation has no room to
  // enter, so its sequence stops at "your words are in".
  const openingId = "openingId" in target ? target.openingId : null;

  /**
   * The sequence, once the words are saved:
   *
   *   settling  the six words hold, the house dims around them
   *   yours     a brass rule draws, then "Your words are in."
   *   open      "The room is open", and a way into it
   *
   * Each beat is a state rather than a nested timeout, so leaving
   * halfway through cancels cleanly and nothing fires into an unmounted
   * component.
   */
  useEffect(() => {
    if (stage === "writing" || stage === "open") return;
    const next = stage === "settling" ? "yours" : "open";
    const wait = stage === "settling" ? MOTION.transform : MOTION.holdLong;
    const timer = setTimeout(() => setStage(next), motionDuration(wait));
    return () => clearTimeout(timer);
  }, [stage]);

  async function submit() {
    setError(null);
    if (!validation.valid) {
      setError(validation.error ?? "Not quite six words yet.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/six-words", {
        method: own ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: own?.id,
          body: validation.normalized,
          ...(openingId
            ? { openingId }
            : {
                sealedRecommendationId: (target as { sealedRecommendationId: string })
                  .sealedRecommendationId,
              }),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not save your six words.");
      }
      const saved = await res.json();
      setOwn({ id: saved.id, body: saved.body, createdAt: saved.created_at });
      onPublished?.();
      // Editing an existing review is a correction, not the moment. Only
      // a first publication earns the sequence.
      setStage(editing ? "writing" : "settling");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!own) return;
    setBusy(true);
    try {
      await fetch(`/api/six-words/${own.id}`, { method: "DELETE" });
      setOwn(null);
      setDraft("");
      setStage("writing");
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------------
  // The submission moment.
  // ------------------------------------------------------------------
  if (own && stage !== "writing") {
    return (
      <section className={styles.moment} data-stage={stage} aria-live="polite">
        <p className={styles.momentWords}>{own.body}</p>

        <span className={styles.momentRule} aria-hidden="true" />

        {stage !== "settling" && <p className={styles.momentSaid}>Your words are in.</p>}

        {stage === "open" && (
          <div className={styles.momentOpen}>
            <p className={styles.momentRoom}>The room is open</p>
            {openingId ? (
              <Button variant="primary" href={`/room/${openingId}`}>
                Enter the room
              </Button>
            ) : (
              // A sealed recommendation is between two people. There is
              // no room of strangers to open, and pretending otherwise
              // would promise a screen that does not exist.
              <p className={styles.momentPrivate}>
                This one was sent to you alone, so it stays between you and the sender.
              </p>
            )}
          </div>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Writing.
  // ------------------------------------------------------------------
  if (!own || editing) {
    return (
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Six words after the picture</p>
        <p className={styles.lead}>Leave the first thought that stayed with you.</p>

        <WordSlots
          value={draft}
          onChange={setDraft}
          disabled={busy}
          invalid={Boolean(error)}
          describedBy={error ? "six-words-count six-words-error" : "six-words-count"}
        />

        <div className={styles.meta}>
          <span id="six-words-count">{wordCount} of 6 words</span>
          {error && (
            <span className={styles.error} id="six-words-error" role="alert">
              {error}
            </span>
          )}
        </div>

        <Button variant="primary" fullWidth onClick={submit} disabled={busy || !validation.valid}>
          {busy ? "Leaving your words…" : "Leave my six words"}
        </Button>

        {/*
          Not everybody has something to say, and a film met in silence
          is still a film met. Skipping costs nothing and takes nothing
          away: the Room stays shut, because the rule is that your words
          come before anyone else's, not that you are made to have any.
          The prompt is still here whenever they come back.
        */}
        {onSkip && !editing && (
          <button type="button" className={styles.skip} onClick={onSkip}>
            Skip for now
          </button>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Already published, arriving fresh.
  // ------------------------------------------------------------------
  return (
    <section className={styles.panel}>
      <p className={styles.eyebrow}>Your six words</p>
      <p className={styles.ownWord}>{own.body}</p>

      <div className={styles.ownActions}>
        {withinEditWindow(own.createdAt) && (
          <button type="button" className={styles.linkButton} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button type="button" className={styles.linkButton} onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>

      {openingId && (
        <Link href={`/room/${openingId}`} className={styles.roomLink}>
          Enter the room
        </Link>
      )}
    </section>
  );
}

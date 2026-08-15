"use client";

import { useState } from "react";
import { countWords } from "@/lib/validation/six-words";
import { Button } from "@/components/Button";
import styles from "./SixWordsAfter.module.css";

export type SixWordsTarget = { openingId: string } | { sealedRecommendationId: string };

/**
 * `SIX WORDS AFTER THE PICTURE` / `What stayed with you?`
 * (handover 00_BUILD_BRIEF_FINAL.md §3 "Post watch").
 *
 * Two things here differ from the earlier six-words panel, and both
 * come from that section.
 *
 * "Allow 1 to 6 words, optional." Six was previously exact, and a
 * five-word reaction was rejected as incomplete. The line is still
 * called six words and six is still the ceiling — but a member who
 * needed four is not wrong, and being told so at that moment is the
 * opposite of what this prompt is for. Seven is still refused.
 *
 * "Skip still unlocks The Room. Do not guilt the member and do not
 * create a fake blank review." So Skip is an equal action rather than a
 * quiet dismissal, it writes no review row (see /api/six-words/skip),
 * and nothing here tells the member what they have missed.
 *
 * Other members' words are not on this screen at all. The Room is where
 * they live, and the order matters: the member's own reaction forms
 * first.
 */

const MAX_WORDS = 6;

export function SixWordsAfter({
  target,
  hasSixWords,
  hasSkipped,
  ownWords,
  onSubmitted,
  onSkipped,
}: {
  target: SixWordsTarget;
  hasSixWords: boolean;
  hasSkipped: boolean;
  ownWords: string | null;
  onSubmitted: (body: string) => void;
  onSkipped: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(hasSixWords ? ownWords : null);
  const [skipped, setSkipped] = useState(hasSkipped);

  const wordCount = countWords(draft);
  const canSubmit = wordCount >= 1 && wordCount <= MAX_WORDS;

  async function submit() {
    setError(null);
    if (!canSubmit) {
      setError(
        wordCount > MAX_WORDS ? "Six words at most." : "One word is enough, if it is the word.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/six-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, body: draft.trim().replace(/\s+/g, " ") }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not keep your words.");
      }
      const saved = await res.json();
      setSubmitted(saved.body);
      setSkipped(false);
      onSubmitted(saved.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/six-words/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not do that just now.");
      }
      setSkipped(true);
      onSkipped();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className={styles.panel} aria-label="Your six words">
        <p className={styles.eyebrow}>Your words</p>
        <p className={styles.ownWords}>{submitted}</p>
      </section>
    );
  }

  if (skipped) {
    // No guilt, no second ask, and no fake review standing in for one.
    return (
      <section className={styles.panel} aria-label="Six words after the picture">
        <p className={styles.eyebrow}>Six words after the picture</p>
        <p className={styles.skipped}>Kept to yourself. They will wait, if they ever come.</p>
        <button type="button" className={styles.reopen} onClick={() => setSkipped(false)}>
          Leave them now
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="Six words after the picture">
      <p className={styles.eyebrow}>Six words after the picture</p>
      <h2 className={styles.question}>What stayed with you?</h2>

      <textarea
        className={styles.textarea}
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-describedby="hd-six-words-count"
        placeholder="Up to six words."
      />

      <p
        id="hd-six-words-count"
        className={styles.count}
        data-over={wordCount > MAX_WORDS || undefined}
      >
        {wordCount} of {MAX_WORDS}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Button variant="primary" onClick={() => void submit()} disabled={busy || !canSubmit}>
          Leave my six words
        </Button>
        <Button variant="ghost" onClick={() => void skip()} disabled={busy}>
          Skip for now
        </Button>
      </div>
    </section>
  );
}

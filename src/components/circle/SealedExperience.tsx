"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import type { RevealPayload } from "@/lib/reveal/payload";
import { PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { SixWordsAfter } from "@/components/tonight/SixWordsAfter";
import type { SealedProgress } from "@/lib/sealed/queries";
import { isRoomOpen } from "@/lib/opening/eligibility";
import { SealObject, type SealState } from "./SealObject";
import styles from "./SealedExperience.module.css";

/**
 * Receiving Under Seal (handover 00_BUILD_BRIEF_FINAL.md §6, motion §13).
 *
 *   The closed object survives opening. Environment darkens, seal line
 *   changes, object grows / unfolds, safe information resolves inside
 *   it. No `Opening...` interstitial.
 *
 * The previous version had exactly that interstitial — a bare
 * "Opening…" paragraph rendered while the reveal request was in
 * flight, which replaced the object with a loading state at the one
 * moment the object is supposed to be doing the work. The seal now
 * unfolds and the title resolves inside it.
 */

export function SealedExperience({
  recommendation,
  progress,
}: {
  recommendation: {
    id: string;
    senderDisplayName: string;
    personalNote: string | null;
    runtimeMinutes: number;
    cues: string[];
    revealedAt: string | null;
  };
  progress: SealedProgress;
}) {
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [sealState, setSealState] = useState<SealState>(
    recommendation.revealedAt ? "opening" : "sealed",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchState, setWatchState] = useState(progress.watchState);
  const [hasSixWords, setHasSixWords] = useState(progress.hasSixWords);
  const [hasSkipped, setHasSkipped] = useState(progress.hasSkippedReview);
  const [copyLabel, setCopyLabel] = useState("Copy title");

  // A recipient returning to something they already opened: the object
  // is already unfolding, and the title comes back the same way it came
  // the first time — from the reveal route, never from the page.
  useEffect(() => {
    if (recommendation.revealedAt && !reveal && !busy && !error) {
      void doReveal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doReveal() {
    setBusy(true);
    setError(null);
    // The seal parts first. The request happens behind an object that
    // is already moving, rather than behind a spinner.
    setSealState("opening");
    try {
      const res = await fetch(`/api/reveal/recommendation/${recommendation.id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not reveal this.");
      const data = (await res.json()) as RevealPayload;
      setReveal(data);
      setSealState("open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSealState("sealed");
    } finally {
      setBusy(false);
    }
  }

  async function setWatch(state: "saved" | "opened_service" | "watched") {
    setWatchState(state);
    await fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sealedRecommendationId: recommendation.id, state }),
    });
  }

  async function copyTitle() {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.title);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy title"), 2000);
    } catch {
      // ignore
    }
  }

  const roomOpen = isRoomOpen({
    hasWatched: watchState === "watched",
    hasSubmittedSixWords: hasSixWords,
    hasSkippedReview: hasSkipped,
  });

  return (
    <div className={styles.stage} data-state={sealState}>
      <SealObject
        state={sealState}
        senderName={recommendation.senderDisplayName}
        note={recommendation.personalNote}
        cues={sealState === "open" ? [] : recommendation.cues}
        runtimeMinutes={sealState === "open" ? null : recommendation.runtimeMinutes}
      >
        {/*
         * Inside the object once it is open. The title arrives here —
         * in the same frame the seal was — rather than on a new screen.
         */}
        {reveal && (
          <div className={styles.opened}>
            <h1 className={styles.title}>{reveal.title}</h1>
            {reveal.releaseYear && <p className={styles.year}>{reveal.releaseYear}</p>}
          </div>
        )}
      </SealObject>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {sealState === "sealed" && (
        <div className={styles.enterRow}>
          <Button variant="primary" onClick={doReveal} disabled={busy}>
            Enter under seal
          </Button>
        </div>
      )}

      {/*
       * "opening" with nothing to show yet is the unfolding itself, not
       * a loading state — the object is on screen and moving. The only
       * thing that appears here is a way back if the request failed,
       * which the error branch above already covers.
       */}

      {reveal && (
        <div className={styles.afterReveal}>
          {reveal.providers.length > 0 ? (
            <ul className={styles.providers}>
              {reveal.providers.map((p) => (
                <li key={`${p.provider_name}-${p.territory}`}>
                  <a href={p.deep_link} target="_blank" rel="noreferrer">
                    {p.provider_name}
                  </a>
                  <span className={styles.providerMeta}>
                    {" · "}
                    {PLAYBACK_ACCESS_LABEL[p.access_type]} · {p.territory}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>No verified playback destination is on record yet.</p>
          )}

          <div className={styles.actionsRow}>
            <Button variant="secondary" onClick={copyTitle}>
              {copyLabel}
            </Button>
            <Button
              variant={watchState === "saved" ? "primary" : "secondary"}
              onClick={() => setWatch("saved")}
            >
              Save for later
            </Button>
            <Button
              variant={watchState === "watched" ? "primary" : "secondary"}
              onClick={() => setWatch("watched")}
            >
              Mark watched
            </Button>
          </div>

          {watchState === "watched" && (
            <SixWordsAfter
              target={{ sealedRecommendationId: recommendation.id }}
              hasSixWords={hasSixWords}
              hasSkipped={hasSkipped}
              ownWords={progress.sixWordsBody}
              onSubmitted={() => setHasSixWords(true)}
              onSkipped={() => setHasSkipped(true)}
            />
          )}

          {roomOpen && (
            <p className={styles.roomNote}>
              Your words are with the picture. The Room for a sent film opens with whoever else has
              watched it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

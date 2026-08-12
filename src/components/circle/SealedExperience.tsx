"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import type { RevealPayload } from "@/lib/reveal/payload";
import { PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { SixWordsPanel } from "@/components/tonight/SixWordsPanel";
import type { SealedProgress } from "@/lib/sealed/queries";
import styles from "./SealedExperience.module.css";

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
  const [revealed, setRevealed] = useState(Boolean(recommendation.revealedAt));
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchState, setWatchState] = useState(progress.watchState);
  const [copyLabel, setCopyLabel] = useState("Copy title");

  async function doReveal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reveal/recommendation/${recommendation.id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not reveal this.");
      const data = (await res.json()) as RevealPayload;
      setReveal(data);
      setRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

  if (!revealed) {
    return (
      <div className={styles.card}>
        <p className={styles.eyebrow}>From {recommendation.senderDisplayName}</p>
        <h1>A film under seal.</h1>
        {recommendation.personalNote && (
          <p className={styles.note}>&ldquo;{recommendation.personalNote}&rdquo;</p>
        )}
        <dl className={styles.factList}>
          <div>
            <dt>Running time</dt>
            <dd>{recommendation.runtimeMinutes} minutes</dd>
          </div>
        </dl>
        {recommendation.cues.length > 0 && (
          <ul className={styles.cues}>
            {recommendation.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        )}
        {error && <p className={styles.error}>{error}</p>}
        <Button variant="primary" fullWidth onClick={doReveal} disabled={busy}>
          {busy ? "Opening…" : "Reveal the title"}
        </Button>
      </div>
    );
  }

  if (!reveal) {
    return (
      <div className={styles.card}>
        <p>Opening…</p>
        <Button variant="secondary" onClick={doReveal}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>From {recommendation.senderDisplayName}</p>
      <h1>
        {reveal.title}
        {reveal.releaseYear ? <span className={styles.year}> ({reveal.releaseYear})</span> : null}
      </h1>
      {recommendation.personalNote && (
        <p className={styles.note}>&ldquo;{recommendation.personalNote}&rdquo;</p>
      )}

      {reveal.providers.length > 0 ? (
        <ul className={styles.providers}>
          {reveal.providers.map((p) => (
            <li key={`${p.provider_name}-${p.territory}`}>
              <a href={p.deep_link} target="_blank" rel="noreferrer">
                {p.provider_name}
              </a>
              <span className={styles.providerMeta}>
                {" "}
                · {PLAYBACK_ACCESS_LABEL[p.access_type]} · {p.territory}
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
      </div>

      <div className={styles.actionsRow}>
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
        <SixWordsPanel
          target={{ sealedRecommendationId: recommendation.id }}
          initialOwnReview={
            progress.hasSixWords &&
            progress.sixWordsId &&
            progress.sixWordsBody &&
            progress.sixWordsCreatedAt
              ? {
                  id: progress.sixWordsId,
                  body: progress.sixWordsBody,
                  createdAt: progress.sixWordsCreatedAt,
                }
              : null
          }
        />
      )}
    </div>
  );
}

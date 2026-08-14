"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import type { RevealPayload } from "@/lib/reveal/payload";
import { PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { MOTION, motionDuration, startViewTransition } from "@/lib/motion";
import { SixWordsPanel } from "@/components/tonight/SixWordsPanel";
import type { SealedProgress } from "@/lib/sealed/queries";
import { SealMark } from "./SealMark";
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

  /**
   * UNSEAL, as a state of its own.
   *
   * Without it the seal broke and the title landed in the same frame,
   * which read as a page swap rather than as something opening. Here
   * the seal parts first and the card underneath only starts arriving
   * once it has: `breaking` is set the moment the payload lands, and
   * `revealed` follows a beat later.
   *
   * A member who arrives on an already-revealed recommendation skips
   * all of it — the seal was broken on some other evening, and
   * re-enacting it every visit would turn a moment into a mannerism.
   */
  const [breaking, setBreaking] = useState(false);

  useEffect(() => {
    if (!breaking) return;
    const timer = setTimeout(
      // Inside a transition, so the sealed card and the opened one are
      // the same composition rearranging. The seal is `hd-seal` on both
      // sides and the sender line is `hd-seal-from`, so the two things
      // the member was looking at hold their place while everything
      // else finds a new one.
      () => startViewTransition(() => setRevealed(true)),
      motionDuration(MOTION.unseal),
    );
    return () => clearTimeout(timer);
  }, [breaking]);

  /**
   * The one place the title is asked for. Every path here goes through
   * the server reveal route: the title is not in the page, in the
   * props, or in any earlier response, so there is nothing to read
   * back from and no faster way to get it.
   */
  const fetchReveal = useCallback(async (): Promise<RevealPayload> => {
    const res = await fetch(`/api/reveal/recommendation/${recommendation.id}`, { method: "POST" });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? "Could not reveal this.");
    }
    return (await res.json()) as RevealPayload;
  }, [recommendation.id]);

  /** Breaking the seal, on the member's gesture. This one animates. */
  async function breakSeal() {
    setBusy(true);
    setError(null);
    try {
      setReveal(await fetchReveal());
      setBreaking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * A recommendation revealed on an earlier visit arrives with
   * `revealedAt` set and no payload, because the title is never in the
   * page. Without this the member met "Opening…" above a Try again
   * button, with nothing opening and nothing to try again — the state
   * announced work that no one had started.
   *
   * No UNSEAL here. The seal was broken on some other evening, and
   * re-enacting it on every visit would turn a moment into a mannerism.
   */
  useEffect(() => {
    if (!revealed || reveal || error) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchReveal();
        if (!cancelled) setReveal(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revealed, reveal, error, fetchReveal]);

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
      <div className={styles.card} data-state={breaking ? "breaking" : "sealed"}>
        <div className={styles.sealHead}>
          <SealMark broken={breaking} className={styles.namedSeal} />
          <p className={`${styles.eyebrow} ${styles.namedFrom}`}>
            From {recommendation.senderDisplayName}
          </p>
        </div>
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
        <Button
          variant="primary"
          fullWidth
          onClick={() => void breakSeal()}
          disabled={busy || breaking}
        >
          {busy || breaking ? "Breaking the seal…" : "Reveal the title"}
        </Button>
      </div>
    );
  }

  /*
   * Revealed on a previous visit, so there is no payload in memory and
   * no seal to break. Fetching it is the only way to see the title
   * again — it is never in the page — and this is the honest version of
   * that: a beat, and a way back if the request fails.
   */
  if (!reveal) {
    return (
      <div className={styles.card}>
        <div className={styles.sealHead}>
          <SealMark broken className={styles.namedSeal} />
          <p className={`${styles.eyebrow} ${styles.namedFrom}`}>
            From {recommendation.senderDisplayName}
          </p>
        </div>
        <p>{error ? "The house could not open this one." : "Opening…"}</p>
        {error && <p className={styles.error}>{error}</p>}
        {/* Clearing the error is what retries: the effect above holds
            off while one is set and fetches again the moment it goes. */}
        {error && (
          <Button variant="secondary" onClick={() => setError(null)}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card} data-state="revealed">
      <div className={styles.sealHead}>
        <SealMark broken />
        <p className={styles.eyebrow}>From {recommendation.senderDisplayName}</p>
      </div>
      <span className={styles.revealRule} aria-hidden="true" />
      <h1 className={styles.revealTitle}>
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

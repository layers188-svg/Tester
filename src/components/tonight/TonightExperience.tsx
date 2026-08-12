"use client";

import { useEffect, useState } from "react";
import type { OpeningSafe, MemberOpeningProgress } from "@/lib/opening/queries";
import type { RevealPayload } from "@/lib/reveal/payload";
import { Button } from "@/components/Button";
import { MINIMUM_ACCESS_LABEL, PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { NoTrailerPlayer } from "./NoTrailerPlayer";
import { SixWordsPanel } from "./SixWordsPanel";
import styles from "./TonightExperience.module.css";

type Phase = "not_available" | "sealed" | "dimming" | "trailer" | "revealing" | "revealed";

export function TonightExperience({
  opening,
  progress,
}: {
  opening: OpeningSafe | null;
  progress: MemberOpeningProgress | null;
}) {
  const [phase, setPhase] = useState<Phase>(() => {
    if (!opening || opening.status !== "open") return "not_available";
    return progress?.hasRevealed ? "revealed" : "sealed";
  });
  const [contentNotesOpen, setContentNotesOpen] = useState(false);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [watchState, setWatchState] = useState(progress?.watchState ?? null);
  const [copyLabel, setCopyLabel] = useState("Copy title");

  useEffect(() => {
    if (phase === "dimming") {
      const timer = setTimeout(() => setPhase("trailer"), 360);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "revealed" && !reveal && opening) {
      void doReveal(opening.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, opening?.id]);

  async function doReveal(openingId: string) {
    setPhase("revealing");
    setRevealError(null);
    try {
      const res = await fetch(`/api/reveal/opening/${openingId}`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "The house could not open tonight's opening.");
      }
      const data = (await res.json()) as RevealPayload;
      setReveal(data);
      setPhase("revealed");
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("sealed");
    }
  }

  async function setWatch(state: "saved" | "opened_service" | "watched") {
    if (!opening) return;
    setWatchState(state);
    await fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingId: opening.id, state }),
    });
  }

  async function copyTitle() {
    if (!reveal) return;
    try {
      await navigator.clipboard.writeText(reveal.title);
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy title"), 2000);
    } catch {
      // Clipboard unavailable — not fatal, just leave the button unchanged.
    }
  }

  if (!opening || phase === "not_available") {
    return (
      <div className={styles.centeredCard}>
        <p className={styles.eyebrow}>Tonight</p>
        <h1>Opening not yet available.</h1>
        <p>
          {opening
            ? `Opening ${opening.openingNumber} opens ${new Date(opening.opensAt).toLocaleString(
                undefined,
                {
                  weekday: "long",
                  hour: "numeric",
                  minute: "2-digit",
                },
              )}.`
            : "Nothing is scheduled yet. Check back soon."}
        </p>
      </div>
    );
  }

  if (phase === "sealed") {
    return (
      <div className={styles.sealedCard}>
        <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
        <h1>Tonight is sealed.</h1>
        <dl className={styles.factList}>
          <div>
            <dt>Running time</dt>
            <dd>{opening.runtimeMinutes} minutes</dd>
          </div>
          <div>
            <dt>Verified places to watch</dt>
            <dd>{opening.availabilityCount || "Confirmed after reveal"}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>{MINIMUM_ACCESS_LABEL[opening.minimumAccessType]}</dd>
          </div>
        </dl>

        {opening.cues.length > 0 && (
          <ul className={styles.cues}>
            {opening.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        )}

        {opening.contentNotes && (
          <div className={styles.disclosure}>
            <button
              type="button"
              className={styles.disclosureButton}
              onClick={() => setContentNotesOpen((v) => !v)}
              aria-expanded={contentNotesOpen}
            >
              Content notes
            </button>
            {contentNotesOpen && <p className={styles.disclosureBody}>{opening.contentNotes}</p>}
          </div>
        )}

        {revealError && <p className={styles.error}>{revealError}</p>}

        <Button variant="primary" fullWidth onClick={() => setPhase("dimming")}>
          Dim the house
        </Button>
      </div>
    );
  }

  if (phase === "dimming") {
    return <div className={styles.dimming} aria-live="polite" aria-label="Dimming the house" />;
  }

  if (phase === "trailer") {
    return (
      <div className={styles.trailerStage}>
        <NoTrailerPlayer
          src={publicStorageUrl(opening.noTrailerStoragePath)}
          captionsSrc={
            opening.noTrailerCaptionsPath ? publicStorageUrl(opening.noTrailerCaptionsPath) : null
          }
          onComplete={() => setPhase("revealing")}
        />
        <Button variant="secondary" fullWidth onClick={() => void doReveal(opening.id)}>
          Reveal the title
        </Button>
      </div>
    );
  }

  if (phase === "revealing") {
    return (
      <div className={styles.centeredCard}>
        <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
        <p>Opening the house…</p>
      </div>
    );
  }

  // phase === "revealed"
  return (
    <div className={styles.revealedCard}>
      <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
      {reveal ? (
        <>
          <h1>
            {reveal.title}
            {reveal.releaseYear ? (
              <span className={styles.year}> ({reveal.releaseYear})</span>
            ) : null}
          </h1>

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
            <Button variant="ghost" href="/tonight">
              Stay in the house
            </Button>
          </div>

          <div className={styles.watchActions}>
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
              target={{ openingId: opening.id }}
              initialOwnReview={
                progress?.hasSixWords &&
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
        </>
      ) : (
        <p className={styles.error}>{revealError ?? "Loading…"}</p>
      )}
    </div>
  );
}

/** `path` is the object name within the public "no-trailer" Storage bucket — never a descriptive filename (brief §12). */
function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/no-trailer/${path}`;
}

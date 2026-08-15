"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpeningSafe, MemberOpeningProgress } from "@/lib/opening/queries";
import type { RevealPayload } from "@/lib/reveal/payload";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { MINIMUM_ACCESS_LABEL, PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { isRoomOpen } from "@/lib/opening/eligibility";
import { noTrailerUrl } from "@/lib/media/storage";
import { NoTrailerPlayer } from "./NoTrailerPlayer";
import { SealedFrame } from "./SealedFrame";
import { RoomPreview } from "./RoomPreview";
import { SixWordsAfter } from "./SixWordsAfter";
import styles from "./TonightExperience.module.css";

/**
 * The evening, as one object.
 *
 * Handover 00_BUILD_BRIEF_FINAL.md §3 gives the ritual exactly:
 *
 *   TONIGHT IS SEALED → member deliberately enters the clue → clue
 *   object becomes the No Trailer frame → member presses Play → the No
 *   Trailer plays for the full 10 seconds → picture goes to black →
 *   300 to 500 ms black hold → server reveal is recorded → only now
 *   does the server return the film identity → title reveal
 *
 * Two properties of this file matter more than its length.
 *
 * First: one frame survives the whole sequence. `.frame` is a single
 * element from sealed through to revealed, and each phase changes its
 * geometry rather than replacing it — motion system §1, "Can you watch
 * one state physically become the next?" Rendering a different card per
 * phase would be easier and would fail that test.
 *
 * Second: the title cannot exist here before the reveal call returns.
 * It is not held in state and hidden, not fetched early, not passed as
 * a prop. `opening` is OpeningSafe, which structurally has no title
 * field. The one way a title enters this component is the response to
 * POST /api/reveal/opening/:id, which the server only answers after
 * recording the reveal.
 */

type Phase =
  "not_available" | "sealed" | "clue" | "no_trailer" | "hold" | "revealed" | "reveal_failed";

/**
 * The black between the picture ending and the title arriving
 * (§3: "300 to 500 ms black hold"). It is punctuation, not decoration,
 * so it survives reduced motion — see --hd-motion-hold in tokens.css.
 */
const BLACK_HOLD_MS = 420;

export function TonightExperience({
  opening,
  progress,
  nextOpeningAt,
}: {
  opening: OpeningSafe | null;
  progress: MemberOpeningProgress | null;
  nextOpeningAt: string | null;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(() => {
    if (!opening || opening.status !== "open") return "not_available";
    return progress?.hasRevealed ? "revealed" : "sealed";
  });
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [holdElapsed, setHoldElapsed] = useState(false);
  const [watchState, setWatchState] = useState(progress?.watchState ?? null);
  const [hasSkippedReview, setHasSkippedReview] = useState(progress?.hasSkippedReview ?? false);
  const [hasSixWords, setHasSixWords] = useState(progress?.hasSixWords ?? false);
  const [ownWords, setOwnWords] = useState(progress?.sixWordsBody ?? null);
  const [contentNotesOpen, setContentNotesOpen] = useState(false);

  const revealRequested = useRef(false);

  const requestReveal = useCallback(async (openingId: string) => {
    revealRequested.current = true;
    setRevealError(null);
    try {
      const res = await fetch(`/api/reveal/opening/${openingId}`, { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "The House could not open tonight's picture.");
      }
      setReveal((await res.json()) as RevealPayload);
    } catch (err) {
      revealRequested.current = false;
      setRevealError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("reveal_failed");
    }
  }, []);

  // A member returning to an evening they already opened. The reveal
  // RPC is idempotent (it upserts the reveals row), so asking again
  // costs nothing and is the only way to get the title back — it is
  // deliberately not rendered into the page.
  useEffect(() => {
    if (phase === "revealed" && !reveal && opening && !revealRequested.current) {
      void requestReveal(opening.id);
    }
  }, [phase, reveal, opening, requestReveal]);

  // The hold runs on its own clock, started by the picture ending. The
  // reveal request runs in parallel, so the black is the hold rather
  // than a disguised network wait — but the title still cannot appear
  // until both have finished.
  useEffect(() => {
    if (phase !== "hold") return;
    const timer = setTimeout(() => setHoldElapsed(true), BLACK_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  function handleNoTrailerEnded() {
    if (!opening) return;
    setPhase("hold");
    void requestReveal(opening.id);
  }

  async function setWatch(state: "saved" | "opened_service" | "watched") {
    if (!opening) return;
    const previous = watchState;
    setWatchState(state);
    const res = await fetch("/api/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingId: opening.id, state }),
    });
    if (!res.ok) setWatchState(previous);
  }

  if (!opening || phase === "not_available") {
    return (
      <div className={styles.stage} data-phase="not_available">
        <p className={styles.eyebrow}>Tonight</p>
        <h1 className={styles.quietTitle}>The House is dark.</h1>
        {opening ? (
          <p className={styles.support}>
            Opening {opening.openingNumber} is programmed and not yet open.
          </p>
        ) : (
          <p className={styles.support}>Nothing is programmed yet.</p>
        )}
        {nextOpeningAt && <Countdown target={nextOpeningAt} onElapsed={() => router.refresh()} />}
      </div>
    );
  }

  const roomOpen = isRoomOpen({
    hasWatched: watchState === "watched",
    hasSubmittedSixWords: hasSixWords,
    hasSkippedReview,
  });

  /*
   * The join between the two clocks, derived rather than stored. The
   * hold ends when its timer says so; the title arrives when the server
   * says so; the reveal is on screen only once both have happened.
   * Writing that as a third piece of state and an effect to set it
   * would give the same picture with an extra render and one more way
   * to be wrong.
   */
  const shown: Phase = phase === "hold" && holdElapsed && reveal ? "revealed" : phase;

  const sealedPhase = shown === "sealed" || shown === "clue" || shown === "reveal_failed";

  return (
    <div className={styles.stage} data-phase={shown}>
      {/*
       * Supporting information. It recedes when the clue opens (motion
       * system §6: "surrounding information recedes 40 to 80 px / global
       * field dims") and is gone by the time the picture plays. It is
       * outside .frame on purpose — the frame is what survives.
       */}
      <div className={styles.support} aria-hidden={!sealedPhase}>
        <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
        {sealedPhase && (
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
        )}
      </div>

      <div className={styles.frame} data-phase={shown}>
        {sealedPhase && (
          <SealedFrame
            openingNumber={opening.openingNumber}
            cues={opening.cues}
            open={phase === "clue"}
            onOpenClue={() => setPhase("clue")}
            onContinue={() => setPhase("no_trailer")}
          />
        )}

        {shown === "no_trailer" && (
          <NoTrailerPlayer
            src={noTrailerUrl(opening.noTrailerStoragePath)}
            posterSrc={
              opening.noTrailerPosterPath ? noTrailerUrl(opening.noTrailerPosterPath) : null
            }
            captionsSrc={
              opening.noTrailerCaptionsPath ? noTrailerUrl(opening.noTrailerCaptionsPath) : null
            }
            onEnded={handleNoTrailerEnded}
          />
        )}

        {/*
         * The hold. Deliberately empty: this is the black, and the
         * whole point is that nothing is in it. aria-live announces the
         * beat so a screen reader member knows the House is not stuck.
         */}
        {shown === "hold" && (
          <div className={styles.hold} role="status">
            <span className="hd-visually-hidden">The picture has ended. Opening the House.</span>
          </div>
        )}

        {shown === "revealed" && (
          <div className={styles.revealed}>
            {reveal ? (
              <>
                <h1 className={styles.title}>{reveal.title}</h1>
                <p className={styles.titleMeta}>
                  {[reveal.releaseYear, `${opening.runtimeMinutes} min`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </>
            ) : (
              // Not a loading state — the frame is already the right
              // shape and the opening number is already on screen. The
              // title is simply not here yet.
              <p className={styles.support} role="status">
                Opening the House.
              </p>
            )}
          </div>
        )}
      </div>

      {shown === "reveal_failed" && revealError && (
        <div className={styles.failure} role="alert">
          <p className={styles.error}>{revealError}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setPhase("hold");
              setHoldElapsed(true);
              void requestReveal(opening.id);
            }}
          >
            Try the reveal again
          </Button>
        </div>
      )}

      {shown === "revealed" && reveal && (
        <div className={styles.afterReveal}>
          {reveal.providers.length > 0 ? (
            <ul className={styles.providers}>
              {reveal.providers.map((p) => (
                <li key={`${p.provider_name}-${p.territory}`}>
                  <a
                    href={p.deep_link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => void setWatch("opened_service")}
                  >
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
            <p className={styles.support}>No verified place to watch is on record yet.</p>
          )}

          <div className={styles.watchActions}>
            <Button
              variant={watchState === "saved" ? "primary" : "secondary"}
              onClick={() => void setWatch("saved")}
            >
              Save for later
            </Button>
            <Button
              variant={watchState === "watched" ? "primary" : "secondary"}
              onClick={() => void setWatch("watched")}
            >
              Mark watched
            </Button>
          </div>

          {watchState === "watched" && (
            <SixWordsAfter
              target={{ openingId: opening.id }}
              hasSixWords={hasSixWords}
              hasSkipped={hasSkippedReview}
              ownWords={progress?.sixWordsBody ?? null}
              onSubmitted={(body) => {
                setHasSixWords(true);
                setOwnWords(body);
              }}
              onSkipped={() => setHasSkippedReview(true)}
            />
          )}

          {roomOpen && (
            <RoomPreview
              openingId={opening.id}
              openingNumber={opening.openingNumber}
              title={reveal.title}
              ownWords={hasSixWords ? (ownWords ?? progress?.sixWordsBody ?? null) : null}
            />
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

          {nextOpeningAt && <Countdown target={nextOpeningAt} onElapsed={() => router.refresh()} />}
        </div>
      )}
    </div>
  );
}

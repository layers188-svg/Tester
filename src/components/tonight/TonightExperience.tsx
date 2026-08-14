"use client";

import { useEffect, useRef, useState } from "react";
import type { OpeningSafe, MemberOpeningProgress } from "@/lib/opening/queries";
import type { RevealPayload } from "@/lib/reveal/payload";
import { Button } from "@/components/Button";
import { useHouseLights } from "@/components/HouseLights";
import { MINIMUM_ACCESS_LABEL, PLAYBACK_ACCESS_LABEL } from "@/lib/labels";
import { MOTION, motionDuration } from "@/lib/motion";
import { isLive } from "@/lib/opening/schedule";
import { reportAnalyticsEvent } from "@/lib/analytics/client";
import { NoTrailerPlayer } from "./NoTrailerPlayer";
import { NextOpening } from "./NextOpening";
import { SixWordsPanel } from "./SixWordsPanel";
import styles from "./TonightExperience.module.css";

type Phase = "not_available" | "sealed" | "dimming" | "trailer" | "revealing" | "revealed";

export function TonightExperience({
  opening,
  progress,
  nextOpening = null,
  previousOpening = null,
  archive = false,
}: {
  opening: OpeningSafe | null;
  progress: MemberOpeningProgress | null;
  /** The next scheduled opening, for the countdown. Null when none is programmed. */
  nextOpening?: { openingNumber: number; opensAt: string } | null;
  /**
   * Last night's opening, offered only to a member who has never opened
   * one. The countdown alone explains the product without ever showing
   * it.
   */
  previousOpening?: OpeningSafe | null;
  /**
   * Whether a past opening may be walked through here.
   *
   * Tonight refuses anything that is not `open`, which is what keeps a
   * scheduled opening sealed until its hour. The archive route sets
   * this so a member can go back through a night that has already run
   * without that gate treating it as unavailable.
   */
  archive?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(() => {
    // Live by the clock, not by the status column — see isLive() and
    // getTonightOpening(). The archive route additionally allows a
    // night that has already closed.
    const watchable = opening && (isLive(opening) || (archive && opening.status !== "scheduled"));
    if (!watchable) return "not_available";
    return progress?.hasRevealed ? "revealed" : "sealed";
  });
  const [contentNotesOpen, setContentNotesOpen] = useState(false);
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [watchState, setWatchState] = useState(progress?.watchState ?? null);
  const [copyLabel, setCopyLabel] = useState("Copy title");

  /**
   * DIM reaches past this component. The masthead and the four tabs
   * belong to the signed-in layout, so the clue borrows the house
   * lights rather than painting a black sheet over them.
   */
  const { setDimmed } = useHouseLights();

  /**
   * DIM, then HOLD, then FOCUS.
   *
   * The pause is the point. The room takes --hd-motion-dim to go dark,
   * and then nothing happens for a beat before the clue opens. Cutting
   * straight from the sealed card to the film is the version that feels
   * like a web page; this one feels like a light going down.
   */
  useEffect(() => {
    if (phase !== "dimming") return;
    const timer = setTimeout(() => setPhase("trailer"), motionDuration(MOTION.dim + MOTION.hold));
    return () => clearTimeout(timer);
  }, [phase]);

  /**
   * The house is dark from the moment the member asks for the clue
   * until the title has arrived. Bringing the chrome back up is half of
   * what makes REVEAL read as the page transforming rather than as a
   * new screen.
   */
  useEffect(() => {
    setDimmed(phase === "dimming" || phase === "trailer" || phase === "revealing");
  }, [phase, setDimmed]);

  // Leaving mid-clue must not leave the shell dark for the next screen.
  useEffect(() => () => setDimmed(false), [setDimmed]);

  // Brief §15 event 2, once per mounted opening. The ref keeps React's
  // development double-invoke — and any later re-render — from counting
  // the same view twice.
  const viewReported = useRef<number | null>(null);
  useEffect(() => {
    if (!opening || !isLive(opening)) return;
    if (viewReported.current === opening.openingNumber) return;
    viewReported.current = opening.openingNumber;
    reportAnalyticsEvent("opening_viewed", opening.openingNumber);
  }, [opening]);

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
    // The countdown targets whichever is real: the opening sitting in
    // `opening` when it is merely scheduled, or the next one after it.
    const target =
      opening && opening.status === "scheduled"
        ? { openingNumber: opening.openingNumber, opensAt: opening.opensAt }
        : nextOpening;

    return (
      <div className={styles.waitingCard}>
        <p className={`${styles.eyebrow} hd-stage`} style={stageIndex(0)}>
          Tonight at House Dark
        </p>
        <h1 className="hd-stage" style={stageIndex(1)}>
          The house is closed until seven.
        </h1>

        <div className="hd-stage" style={stageIndex(2)}>
          <NextOpening
            opensAt={target?.opensAt ?? null}
            openingNumber={target?.openingNumber ?? null}
            label="Opening"
          />
        </div>

        {/*
          Someone who has never opened one gets last night's rather than
          a countdown and nothing else. It is the whole product in
          miniature, and it costs them nothing to walk through it before
          tonight lands.
        */}
        {previousOpening && (
          <div className={`${styles.previously} hd-stage`} style={stageIndex(3)}>
            <p className={styles.previouslyLabel}>While you wait</p>
            <p className={styles.previouslyLead}>
              Last night&rsquo;s opening is still here. Ten seconds, then the film, then the room.
              It is the whole evening, and it will show you how this works before tonight arrives.
            </p>
            <Button variant="secondary" href={`/opening/${previousOpening.id}`}>
              Open last night&rsquo;s
            </Button>
          </div>
        )}

        {!previousOpening && !target && (
          <p className={styles.hint}>Nothing is scheduled yet. Check back soon.</p>
        )}
      </div>
    );
  }

  /*
   * The sealed card stays mounted through DIM rather than being
   * swapped for a black overlay. It is the thing going dark, so it has
   * to be there to do it — and the member watches the room they were
   * just reading fall away, which is the whole gesture.
   */
  if (phase === "sealed" || phase === "dimming") {
    return (
      <div className={styles.sealedCard} data-leaving={phase === "dimming"}>
        <p className={`${styles.eyebrow} hd-stage`} style={stageIndex(0)}>
          Tonight at House Dark
        </p>
        <h1 className="hd-stage" style={stageIndex(1)}>
          Tonight&rsquo;s film is sealed.
        </h1>
        <p className={`${styles.sealedLead} hd-stage`} style={stageIndex(2)}>
          Ten seconds. A person, a world, a pressure. Nothing more.
        </p>
        <dl className={`${styles.factList} hd-stage`} style={stageIndex(3)}>
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
          <ul className={`${styles.cues} hd-stage`} style={stageIndex(4)}>
            {opening.cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </ul>
        )}

        {opening.contentNotes && (
          <div className={`${styles.disclosure} hd-stage`} style={stageIndex(5)}>
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

        {/* The rhythm stays visible even with tonight's in front of
            them: the house opens again tomorrow, and knowing that is
            part of what makes it a house rather than a page. */}
        {nextOpening && (
          <div className="hd-stage" style={stageIndex(6)}>
            <NextOpening opensAt={nextOpening.opensAt} openingNumber={nextOpening.openingNumber} />
          </div>
        )}

        <div className="hd-stage" style={stageIndex(7)}>
          <Button
            variant="primary"
            fullWidth
            disabled={phase === "dimming"}
            onClick={() => {
              // Brief §15 event 3, recorded on the gesture itself.
              reportAnalyticsEvent("dimming_started", opening.openingNumber);
              setPhase("dimming");
            }}
          >
            {phase === "dimming" ? "Dimming the house…" : "See tonight’s clue"}
          </Button>
        </div>
      </div>
    );
  }

  /*
   * FOCUS. The clue is not a video embedded in a page — it takes the
   * viewport, and the page it came from is gone. The stage is fixed and
   * full-bleed so there is nothing else on screen to look at, which is
   * the difference between watching a clue and watching a widget.
   */
  if (phase === "trailer") {
    return (
      <div className={styles.trailerStage}>
        <NoTrailerPlayer
          src={publicStorageUrl(opening.noTrailerStoragePath)}
          captionsSrc={
            opening.noTrailerCaptionsPath ? publicStorageUrl(opening.noTrailerCaptionsPath) : null
          }
          fallbackCues={opening.cues}
          fill
          onComplete={() => {
            // Brief §15 event 4 — the No Trailer ran to the end, which
            // only the player can know.
            reportAnalyticsEvent("no_trailer_completed", opening.openingNumber);
            setPhase("revealing");
          }}
        />
        {/* "The rest belongs to the film" is the beat after the clue,
            so it lives in the post-playback state below rather than
            competing with the film while it runs.

            Set as a quiet line rather than a filled button: while the
            clue is running this is the way out, not the way on, and a
            primary control under a playing film is exactly the chrome
            FOCUS is trying to get rid of. */}
        <button type="button" className={styles.skip} onClick={() => void doReveal(opening.id)}>
          Choose tonight&rsquo;s film
        </button>
      </div>
    );
  }

  /*
   * The beat before the answer. The room is still dark and the frame
   * that held the clue is still on screen, empty — so the title lands
   * in the space the film was in rather than on a fresh screen.
   */
  if (phase === "revealing") {
    return (
      <div className={styles.openingStage} aria-live="polite">
        <span className={styles.openingRule} aria-hidden="true" />
        <p className={styles.openingWord}>Opening the house</p>
        <span className={styles.openingRule} aria-hidden="true" />
      </div>
    );
  }

  /*
   * REVEAL. The page transforms into the answer.
   *
   * Three things move together and none of them is a page transition:
   * the house lights come back up under the shell (the effect above),
   * a brass rule draws itself across the width, and the title wipes in
   * behind it. The wipe is a clip-path on the same text node the card
   * has always rendered, so nothing about what the browser was told
   * changes — the title still arrives only from /api/reveal.
   */
  return (
    <div className={styles.revealedCard}>
      <p className={`${styles.eyebrow} hd-stage`} style={stageIndex(0)}>
        Opening {opening.openingNumber}
      </p>
      {reveal ? (
        <>
          <span className={styles.revealRule} aria-hidden="true" />
          <h1 className={styles.revealTitle}>
            {reveal.title}
            {reveal.releaseYear ? (
              <span className={styles.year}> ({reveal.releaseYear})</span>
            ) : null}
          </h1>

          {/*
            Once the member has marked it watched, the page is about
            their response and nothing else. Where to watch it, the
            title on the clipboard and the watch controls have all done
            their job by then, and leaving them on screen underneath the
            six-word field is the difference between "answer this" and
            "here are nine things, one of which is a form".
          */}
          {watchState !== "watched" && (
            <>
              {reveal.providers.length > 0 ? (
                <ul className={`${styles.providers} hd-stage`} style={stageIndex(4)}>
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
                <p className={`${styles.hint} hd-stage`} style={stageIndex(4)}>
                  No verified playback destination is on record yet.
                </p>
              )}

              <div className={`${styles.actionsRow} hd-stage`} style={stageIndex(5)}>
                <Button variant="secondary" onClick={copyTitle}>
                  {copyLabel}
                </Button>
                <Button variant="ghost" href="/tonight">
                  Stay in the house
                </Button>
              </div>

              <div className={`${styles.watchActions} hd-stage`} style={stageIndex(6)}>
                <Button
                  variant={watchState === "saved" ? "primary" : "secondary"}
                  onClick={() => setWatch("saved")}
                >
                  Save for later
                </Button>
                <Button variant="secondary" onClick={() => setWatch("watched")}>
                  Mark watched
                </Button>
              </div>
            </>
          )}

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

/**
 * Position in a staged entry, as the inline custom property `.hd-stage`
 * reads. A plain object literal would be typed as `string`, which
 * `CSSProperties` rejects for an unknown key, so the cast is confined
 * to this one helper rather than repeated at every call site.
 */
function stageIndex(index: number): React.CSSProperties {
  return { "--hd-stage-index": index } as React.CSSProperties;
}

/** `path` is the object name within the public "no-trailer" Storage bucket — never a descriptive filename (brief §12). */
function publicStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/no-trailer/${path}`;
}

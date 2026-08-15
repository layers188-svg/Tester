"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoomVoice } from "@/lib/supabase/types";
import type { RoomOpening } from "@/lib/room/queries";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import { useRoomArrival } from "@/lib/motion/room-transition";
import { anchorFor, placeVoice, sceneHeightVh, windowFor } from "@/lib/room/field";
import styles from "./TheRoom.module.css";

/**
 * The Room (handover 00_BUILD_BRIEF_FINAL.md §5, 01_MOTION_SYSTEM.md §11).
 *
 * "The Room is not three card grids. It is a spatial typography
 * environment. The words are the scenery."
 *
 * The scroll scene is the part most likely to be got wrong, and the
 * handover says so explicitly: "Do not use raw window.scrollY without
 * accounting for the Room section's own position… some Room scroll
 * versions calculated progress from global scroll incorrectly."
 *
 * This reads the scene's own `getBoundingClientRect()` every frame, so
 * progress is local by construction — there is no page offset to
 * subtract and get wrong, and it is correct whether the member landed
 * here directly or navigated in from Tonight with the page already
 * scrolled (acceptance test E9).
 *
 * Transforms are written straight to the DOM inside the rAF callback
 * rather than through React state. Sixty renders a second of a list of
 * voices would be the wrong tool; the one source of truth for progress
 * is the ref below.
 */

type Mode = "review" | "circle" | "house";

const MODE_LABELS: Record<Mode, string> = {
  review: "Your Review",
  circle: "Your Circle",
  house: "The House",
};

export function TheRoom({ opening, voices }: { opening: RoomOpening; voices: RoomVoice[] }) {
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("review");

  // The transition layer hands back as soon as the real Room has
  // painted (motion system §10 step 9).
  useRoomArrival();

  const circleVoices = useMemo(() => voices.filter((v) => v.source === "circle"), [voices]);
  const houseVoices = useMemo(() => voices.filter((v) => v.source === "house"), [voices]);

  const shown = mode === "circle" ? circleVoices : mode === "house" ? houseVoices : [];

  return (
    <div className={styles.room}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Opening {opening.openingNumber}</p>
        {opening.title && (
          <p className={styles.filmTitle}>
            {opening.title}
            {opening.releaseYear ? (
              <span className={styles.year}> {opening.releaseYear}</span>
            ) : null}
          </p>
        )}
        <h1 className={styles.roomTitle}>The Room</h1>
        <span className={styles.brassRule} aria-hidden="true" />
      </header>

      <nav className={styles.modes} aria-label="The Room">
        {(["review", "circle", "house"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={styles.mode}
            data-active={mode === value}
            aria-current={mode === value ? "true" : undefined}
            onClick={() => setMode(value)}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </nav>

      {mode === "review" ? (
        <YourReview words={opening.ownWords} />
      ) : (
        <VoiceField
          key={mode}
          voices={shown}
          mode={mode}
          reducedMotion={reducedMotion}
          ownWords={opening.ownWords}
        />
      )}
    </div>
  );
}

/**
 * "The member's own six words are the dominant typographic object. If
 * they skipped, show a quiet invitation to add them later. Do not
 * invent words."
 */
function YourReview({ words }: { words: string | null }) {
  return (
    <section className={styles.review} aria-label="Your review">
      {words ? (
        <p className={styles.ownWords}>{words}</p>
      ) : (
        <div className={styles.noWords}>
          <p className={styles.invitation}>You kept it to yourself.</p>
          <p className={styles.invitationNote}>
            Your words can go in whenever they arrive. The Room is open either way.
          </p>
        </div>
      )}
    </section>
  );
}

function VoiceField({
  voices,
  mode,
  reducedMotion,
  ownWords,
}: {
  voices: RoomVoice[];
  mode: Mode;
  reducedMotion: boolean;
  ownWords: string | null;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const voiceRefs = useRef<(HTMLElement | null)[]>([]);

  const placements = useMemo(
    () =>
      voices.map((_, index) => ({
        anchor: anchorFor(index, voices.length),
        window: windowFor(voices.length),
        // Circle voices sit forward; House voices sit deeper.
        depth: mode === "circle" ? 1 : 0.86,
        drift: index % 2 === 0 ? -1 : 1,
      })),
    [voices, mode],
  );

  const paint = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Local progress, from the scene's own box. No global scrollY, so
    // nothing to subtract and nothing to get wrong after a navigation.
    const rect = scene.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));

    scene.style.setProperty("--room-progress", progress.toFixed(4));

    placements.forEach((options, index) => {
      const element = voiceRefs.current[index];
      if (!element) return;
      const { y, x, scale, opacity, blur } = placeVoice(progress, options);
      element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      element.style.opacity = opacity.toFixed(3);
      element.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
    });
  }, [placements]);

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    let queued = false;

    const schedule = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(() => {
        queued = false;
        paint();
      });
    };

    // Paint once for the position the member arrives at, then follow.
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [paint, reducedMotion]);

  if (voices.length === 0) {
    return (
      <section className={styles.empty} aria-label={MODE_LABELS[mode]}>
        <p className={styles.emptyLine}>
          {mode === "circle" ? "Nobody in your Circle has spoken yet." : "You're first in."}
        </p>
      </section>
    );
  }

  /*
   * Reduced motion keeps the Room and drops the field: the same voices,
   * the same order, the same quiet names, as a readable column. Every
   * state change survives; only the movement goes (motion principle 9).
   */
  if (reducedMotion) {
    return (
      <section className={styles.staticField} aria-label={MODE_LABELS[mode]}>
        {voices.map((voice) => (
          <article key={voice.id} className={styles.staticVoice}>
            <p className={styles.voiceBody}>{voice.body}</p>
            <p className={styles.voiceName}>{voice.author_display_name}</p>
          </article>
        ))}
      </section>
    );
  }

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      style={{ height: `${sceneHeightVh(voices.length)}vh` }}
    >
      <div className={styles.viewport}>
        {/*
         * The member's own words stay in the field as the anchor —
         * §11: "Your Review anchors the Room" — so the member always
         * has something of their own to orient by while other voices
         * pass.
         */}
        {ownWords && <p className={styles.anchorWords}>{ownWords}</p>}

        <section className={styles.field} aria-label={MODE_LABELS[mode]}>
          {voices.map((voice, index) => (
            <article
              key={voice.id}
              ref={(node) => {
                voiceRefs.current[index] = node;
              }}
              className={styles.voice}
              data-source={voice.source}
            >
              <p className={styles.voiceBody}>{voice.body}</p>
              <p className={styles.voiceName}>{voice.author_display_name}</p>
            </article>
          ))}
        </section>

        {/* Brass rules extend to mark progression through the field. */}
        <span className={styles.progressRule} aria-hidden="true" />
      </div>
    </div>
  );
}

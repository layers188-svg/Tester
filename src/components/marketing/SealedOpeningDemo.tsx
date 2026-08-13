"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./SealedOpeningDemo.module.css";

/** Exactly ten title-free seconds, per the review's media behaviour. */
const SAMPLE_SECONDS = 10;

type Phase = "sealed" | "playing" | "ended" | "unavailable";

/**
 * The public demonstration of the opening ritual.
 *
 * This is the one place a visitor can feel the product before signing
 * in, so it has to be the real gesture rather than a picture of one.
 * It is also the one place where getting spoiler safety wrong would be
 * public, so:
 *
 *   - It never receives, requests or renders a film title. There is no
 *     API call here at all; the only dynamic input is an opening number.
 *   - It writes nothing. No account, no analytics, no watch state.
 *   - It ends on "Enter to reveal tonight", never on a title. Revealing
 *     is a signed-in, server-verified action and stays that way.
 *
 * Nothing autoplays: the visitor presses, the room dims, ten seconds
 * run, it stops itself. `preload="metadata"` means the 10MB asset is
 * not pulled until it is wanted.
 */
export function SealedOpeningDemo({
  openingNumber,
  src,
}: {
  openingNumber: number | null;
  src: string;
}) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [remaining, setRemaining] = useState(SAMPLE_SECONDS);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stop = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setPhase("ended");
  }, []);

  // Stop at ten seconds even if the asset runs longer. Driven by the
  // media clock rather than a timer, so a slow start cannot hand the
  // visitor eleven seconds of footage.
  useEffect(() => {
    if (phase !== "playing") return;
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      const left = Math.max(0, SAMPLE_SECONDS - video.currentTime);
      setRemaining(Math.ceil(left));
      if (video.currentTime >= SAMPLE_SECONDS) stop();
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", stop);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", stop);
    };
  }, [phase, stop]);

  async function dim() {
    const video = videoRef.current;
    if (!video) return setPhase("unavailable");
    setRemaining(SAMPLE_SECONDS);
    setPhase("playing");
    try {
      video.currentTime = 0;
      await video.play();
    } catch {
      // Autoplay policy, a missing codec, a dead asset — all the same
      // to the visitor, and none of them may say anything about the
      // film. The card falls back to its sealed face.
      setPhase("unavailable");
    }
  }

  const label = openingNumber ? `Opening ${openingNumber}` : "Tonight";

  return (
    <figure className={`${styles.frame} ${phase === "playing" ? styles.dimmed : ""}`}>
      <div className={styles.window}>
        <video
          ref={videoRef}
          className={styles.video}
          src={src}
          muted
          playsInline
          preload="metadata"
          // Silent by design — this is a mood sample in a public page,
          // not a trailer. There is no dialogue to caption.
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setPhase("unavailable")}
          data-visible={phase === "playing" ? "true" : "false"}
        />

        <div className={styles.plate} data-hidden={phase === "playing" ? "true" : "false"}>
          <p className={styles.tonight}>Tonight</p>
          <p className={styles.opening}>{label}</p>
          <p className={styles.sealed}>Title sealed</p>
        </div>

        {phase === "playing" && (
          <p className={styles.counter} aria-live="off">
            {remaining}s
          </p>
        )}
      </div>

      <figcaption className={styles.caption}>
        {phase === "sealed" && (
          <>
            <button type="button" className={styles.dim} onClick={() => void dim()}>
              Dim the house
            </button>
            <span className={styles.note}>Ten seconds. Mood only. No plot, no title.</span>
          </>
        )}

        {phase === "playing" && <span className={styles.note}>The house is dark.</span>}

        {phase === "ended" && (
          <>
            <Link href="/join" className={styles.enter}>
              Enter to reveal tonight
            </Link>
            <span className={styles.note}>
              The title waits until you are inside. Members choose when it appears.
            </span>
          </>
        )}

        {phase === "unavailable" && (
          <>
            <Link href="/join" className={styles.enter}>
              Enter tonight
            </Link>
            <span className={styles.note}>
              The sample will not play on this device. The opening itself is waiting inside.
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

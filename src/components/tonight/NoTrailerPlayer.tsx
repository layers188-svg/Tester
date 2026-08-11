"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./NoTrailerPlayer.module.css";

interface NoTrailerPlayerProps {
  /** Public Storage URL for the No Trailer file. Never a title, never a descriptive filename (brief §12). */
  src: string;
  posterSrc?: string | null;
  onComplete: () => void;
}

/**
 * The No Trailer player (brief §7). Native <video>, no browser
 * controls, a restrained custom progress indicator, replay, and a
 * retry path that never falls back to revealing the title.
 */
export function NoTrailerPlayer({ src, posterSrc, onComplete }: NoTrailerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  // Reduced motion: skip straight to the still poster frame and let the
  // member advance manually rather than forcing motion on them. Read
  // synchronously on mount (lazy initializer) rather than via an effect
  // that calls setState, which would trigger an avoidable extra render.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [status, setStatus] = useState<"idle" | "playing" | "ended" | "error">(() =>
    reducedMotion ? "ended" : "idle",
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => setStatus("playing")).catch(() => setStatus("idle"));
    }
  }, [reducedMotion]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress(Math.min(1, video.currentTime / video.duration));
  }

  function handleEnded() {
    setStatus("ended");
  }

  function handleError() {
    // Never reveal the title as an error fallback (brief §7 rule 8).
    setStatus("error");
  }

  function replay() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setStatus("playing");
    setProgress(0);
    video.play().catch(() => setStatus("idle"));
  }

  function retry() {
    const video = videoRef.current;
    if (!video) return;
    setStatus("idle");
    video.load();
    video.play().then(() => setStatus("playing")).catch(() => setStatus("error"));
  }

  return (
    <div className={styles.wrap}>
      <video
        ref={videoRef}
        className={styles.video}
        src={src}
        poster={posterSrc ?? undefined}
        playsInline
        muted={false}
        controls={false}
        preload="auto"
        aria-label="Tonight's No Trailer — an original, spoiler safe introduction"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
      />

      <div className={styles.progressTrack} role="presentation">
        <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
      </div>

      {status === "error" && (
        <div className={styles.overlay}>
          <p>The No Trailer could not play.</p>
          <button type="button" className={styles.overlayButton} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {status === "ended" && (
        <div className={styles.overlay}>
          <button type="button" className={styles.overlayButton} onClick={replay}>
            Replay
          </button>
          <button type="button" className={styles.overlayButtonPrimary} onClick={onComplete}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

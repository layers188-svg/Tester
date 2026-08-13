"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NoTrailerPlayer.module.css";

/** The sample is exactly ten seconds, whatever the asset's own length. */
const SAMPLE_SECONDS = 10;

interface NoTrailerPlayerProps {
  /** Public Storage URL for the No Trailer file. Never a title, never a descriptive filename (brief §12). */
  src: string;
  posterSrc?: string | null;
  /** WebVTT captions URL. Required whenever the No Trailer carries speech (brief §16). */
  captionsSrc?: string | null;
  /**
   * The opening's safe cues. Used only if the video cannot play, so a
   * member who gets nothing still gets something to go on. They are the
   * same words already shown on the sealed card, so this reveals
   * nothing new and cannot leak a title.
   */
  fallbackCues?: string[];
  onComplete: () => void;
}

type Status = "idle" | "playing" | "ended" | "error";

/**
 * The No Trailer player (brief §7). Native <video>, no browser
 * controls, a restrained custom progress indicator, replay, and a
 * retry path that never falls back to revealing the title.
 *
 * Playback starts muted on purpose. Brief §7 rule 10: "Autoplay must
 * not depend on sound. Original room tone can play after user
 * interaction when available." Browsers block an autoplay that carries
 * audio unless a direct user gesture is still in scope, and the gesture
 * here — dimming the house — is a different component and ~360ms ago,
 * so an unmuted start is rejected in practice. Muted always plays; the
 * member turns the room tone on with the control below.
 */
export function NoTrailerPlayer({
  src,
  posterSrc,
  captionsSrc,
  fallbackCues = [],
  onComplete,
}: NoTrailerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  // The OS preference seeds the initial value; the control below can
  // override it for this session. Read synchronously on mount rather
  // than via an effect that calls setState, which would cost a render.
  const [systemReducedMotion, setSystemReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const reducedMotion = motionOverride ?? systemReducedMotion;

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "ended"
      : "idle",
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // React does not reliably reflect `muted` as an attribute, so drive
  // the DOM property directly.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const start = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setProgress(0);
    const playPromise = video.play();
    if (playPromise) {
      playPromise.then(() => setStatus("playing")).catch(() => setStatus("idle"));
    } else {
      setStatus("playing");
    }
  }, []);

  useEffect(() => {
    // Reduced motion: hold on the still frame and let the member choose
    // to play, rather than moving the room without being asked.
    if (reducedMotion) return;
    start();
  }, [reducedMotion, start]);

  /**
   * Ten seconds, measured on the media clock rather than a timer, so a
   * slow start cannot hand the member eleven seconds of footage. The
   * asset may be longer; the sample is not.
   */
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setProgress(Math.min(1, video.currentTime / SAMPLE_SECONDS));
    if (video.currentTime >= SAMPLE_SECONDS) {
      video.pause();
      setProgress(1);
      setStatus("ended");
    }
  }

  function handleEnded() {
    setStatus("ended");
  }

  function handleError() {
    // Never reveal the title as an error fallback (brief §7 rule 8).
    setStatus("error");
  }

  function retry() {
    const video = videoRef.current;
    if (!video) return;
    setStatus("idle");
    video.load();
    video
      .play()
      .then(() => setStatus("playing"))
      .catch(() => setStatus("error"));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.stage}>
        {/*
         * The monogram's own linework, separated into the frame around
         * the film. The H stem and the shared spine become the left and
         * right edges, their serif bars the corners. It is the mark
         * taken apart rather than a border drawn to look like one, so
         * nothing here is a redrawn logo.
         */}
        <svg
          className={styles.frame}
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <g fill="none" stroke="currentColor" strokeLinecap="square">
            <path d="M18 40 L18 360" strokeWidth="3" />
            <path d="M8 40 L28 40" strokeWidth="1.5" />
            <path d="M8 360 L28 360" strokeWidth="1.5" />
            <path d="M282 40 L282 360" strokeWidth="3" />
            <path d="M272 40 L292 40" strokeWidth="1.5" />
            <path d="M272 360 L292 360" strokeWidth="1.5" />
          </g>
        </svg>

        <video
          ref={videoRef}
          className={styles.video}
          src={src}
          poster={posterSrc ?? undefined}
          playsInline
          muted
          controls={false}
          preload="auto"
          aria-label="Tonight's No Trailer, an original, spoiler safe introduction"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
        >
          {captionsSrc && (
            <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
          )}
        </video>

        <div className={styles.progressTrack} role="presentation">
          <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
        </div>

        {/*
         * An autoplay the browser declined must never be a dead end:
         * "idle" always offers a way in.
         */}
        {status === "idle" && (
          <div className={styles.overlay}>
            <button type="button" className={styles.overlayButtonPrimary} onClick={start}>
              Play the No Trailer
            </button>
          </div>
        )}

        {/*
         * A failed asset is not a dead end and never an excuse to show
         * the title. The member gets the same safe cues the sealed card
         * carried, so they can still decide.
         */}
        {status === "error" && (
          <div className={styles.overlay}>
            <p className={styles.fallbackLead}>Tonight&rsquo;s clue will not play.</p>
            {fallbackCues.length > 0 && (
              <ul className={styles.fallbackCues}>
                {fallbackCues.map((cue) => (
                  <li key={cue}>{cue}</li>
                ))}
              </ul>
            )}
            <div className={styles.fallbackActions}>
              <button type="button" className={styles.overlayButton} onClick={retry}>
                Try again
              </button>
              <button type="button" className={styles.overlayButtonPrimary} onClick={onComplete}>
                Continue
              </button>
            </div>
          </div>
        )}

        {status === "ended" && (
          <div className={styles.overlay}>
            <button type="button" className={styles.overlayButton} onClick={start}>
              Replay
            </button>
            <button type="button" className={styles.overlayButtonPrimary} onClick={onComplete}>
              Continue
            </button>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          aria-pressed={!muted}
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
        <span className={styles.controlDivider} aria-hidden="true" />
        <button
          type="button"
          className={styles.control}
          aria-pressed={reducedMotion}
          onClick={() => setMotionOverride(!reducedMotion)}
        >
          Reduced motion
        </button>
      </div>
    </div>
  );
}

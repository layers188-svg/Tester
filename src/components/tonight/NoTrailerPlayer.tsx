"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NoTrailerPlayer.module.css";

interface NoTrailerPlayerProps {
  /** Public Storage URL for the No Trailer file. Never a title, never a descriptive filename (brief §12). */
  src: string;
  posterSrc?: string | null;
  /** WebVTT captions URL. Required whenever the No Trailer carries speech (brief §16). */
  captionsSrc?: string | null;
  /**
   * The picture has finished. The caller takes it from here: black
   * hold, then the server reveal. Never called for any other reason —
   * not on error, not on a skip, because there is no skip.
   */
  onEnded: () => void;
}

type Status = "ready" | "playing" | "error";

/**
 * The No Trailer (handover 00_BUILD_BRIEF_FINAL.md §10, motion system §7).
 *
 * Ten seconds, silent by default, and it does not begin until the
 * member presses Play — "explicit member press before playback", "No
 * autoplay". The earlier build autoplayed muted and then offered
 * Replay/Continue at the end; both are gone. Autoplay took the decision
 * away from the member, and Continue put a button between the picture
 * ending and the title arriving, where the handover puts black.
 *
 * At `ended` this hands straight back to the ritual. The only branch
 * that does not is a media failure, which offers Retry and never, under
 * any circumstance, advances — a broken video must not become a reveal
 * (§10: "media failure gets a proper Retry state / do not silently skip
 * to reveal").
 */
export function NoTrailerPlayer({ src, posterSrc, captionsSrc, onEnded }: NoTrailerPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  // React does not reliably reflect `muted` as an attribute, so drive
  // the DOM property directly.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setProgress(0);
    const started = video.play();
    if (started) {
      started.then(() => setStatus("playing")).catch(() => setStatus("ready"));
    } else {
      setStatus("playing");
    }
  }, []);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress(Math.min(1, video.currentTime / video.duration));
  }

  function retry() {
    const video = videoRef.current;
    if (!video) return;
    setStatus("ready");
    setProgress(0);
    video.load();
  }

  return (
    <div className={styles.wrap} data-status={status}>
      <div className={styles.stage}>
        <video
          ref={videoRef}
          className={styles.video}
          src={src}
          poster={posterSrc ?? undefined}
          playsInline
          muted
          controls={false}
          preload="metadata"
          aria-label="Tonight's No Trailer — an original, spoiler safe introduction"
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          onError={() => setStatus("error")}
        >
          {captionsSrc && (
            <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
          )}
        </video>

        {status === "playing" && (
          <div className={styles.progressTrack} role="presentation">
            <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
          </div>
        )}

        {status === "ready" && (
          <div className={styles.gate}>
            <p className={styles.gateLabel}>No Trailer</p>
            <p className={styles.gateLength}>10 seconds</p>
            <button type="button" className={styles.play} onClick={play}>
              Play
            </button>
          </div>
        )}

        {status === "error" && (
          <div className={styles.gate}>
            <p className={styles.gateLabel}>The No Trailer could not play.</p>
            <p className={styles.gateNote}>Tonight stays sealed until it does.</p>
            <button type="button" className={styles.play} onClick={retry}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/*
       * Silent by default (§10). The control stays available during
       * playback because room tone is the one thing a member may want
       * to change mid-picture, and pausing to change it would break
       * the ten seconds.
       */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          aria-pressed={!muted}
          onClick={() => setMuted((value) => !value)}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>
    </div>
  );
}

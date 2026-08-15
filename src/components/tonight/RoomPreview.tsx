"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoomTransition } from "@/lib/motion/room-transition";
import styles from "./RoomPreview.module.css";

/**
 * The Room, seen from Tonight (motion system §10).
 *
 * This is the object that becomes the Room. It shows the member's own
 * words, one voice from their Circle, and the words THE ROOM — and when
 * they press it, that same composition is promoted into a fixed layer
 * and travels to the Room's own header. The quote they were looking at
 * is still on screen when they arrive.
 *
 * A preview with nothing in it would be a worse door than a button, so
 * a Room with no other voices yet says so plainly rather than showing
 * an empty frame.
 */

interface PreviewVoice {
  body: string;
  author: string;
}

export function RoomPreview({
  openingId,
  openingNumber,
  title,
  ownWords,
}: {
  openingId: string;
  openingNumber: number;
  title: string | null;
  ownWords: string | null;
}) {
  const router = useRouter();
  const transition = useRoomTransition();
  const panelRef = useRef<HTMLButtonElement>(null);
  const [voice, setVoice] = useState<PreviewVoice | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/room/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ openingId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { voice: PreviewVoice | null };
        if (!cancelled) setVoice(data.voice);
      } catch {
        // No preview voice. The door still opens.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  function open() {
    const panel = panelRef.current;
    if (!panel || !transition) {
      router.push("/tonight/room");
      return;
    }
    transition.enter(panel, {
      openingNumber,
      title,
      quote: voice?.body ?? null,
      quoteAuthor: voice?.author ?? null,
    });
  }

  return (
    <button ref={panelRef} type="button" className={styles.preview} onClick={open}>
      <span className={styles.eyebrow}>The Room is open</span>

      {ownWords ? (
        <span className={styles.ownWords}>{ownWords}</span>
      ) : (
        <span className={styles.ownWordsEmpty}>Your words can go in whenever they arrive.</span>
      )}

      <span className={styles.rule} aria-hidden="true" />

      {voice ? (
        <span className={styles.voice}>
          {voice.body}
          <span className={styles.voiceName}> {voice.author}</span>
        </span>
      ) : (
        <span className={styles.voiceEmpty}>You&rsquo;re first in.</span>
      )}

      <span className={styles.enter}>Enter The Room</span>
    </button>
  );
}

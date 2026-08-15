"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JoinForm } from "@/app/(marketing)/join/JoinForm";
import styles from "./Entrance.module.css";

/**
 * The public entrance.
 *
 * One room, one light, one way in. The light is architectural rather
 * than cinematic: a narrow warm shaft falling through a dark room,
 * catching part of the monogram and one line of type at a time. It is
 * not a projector, and there is deliberately no beam origin, no dust
 * and no flicker.
 *
 * What the light touches is atmosphere. What a visitor needs — the
 * headline, the copy, the way in — is never masked, so the page is
 * fully usable if the mask is unsupported, if motion is reduced, or if
 * someone is reading it with a screen reader.
 *
 * Nothing about tonight's film appears here, and no film asset is
 * requested. That is the point of the public page: it sells the
 * feeling, the club delivers the film.
 */

const PHRASES = ["Before the trailer.", "Before the reviews.", "Before the verdict."];
const PHRASE_MS = 3600;

export function Entrance({ testKey }: { testKey: string | null }) {
  const [entering, setEntering] = useState(false);
  const [phrase, setPhrase] = useState(0);
  const [reduced, setReduced] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Pointer offset from centre, in percentages of the field. The light
  // has its own path; this only nudges it.
  const nudge = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 50, y: 44 });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // One phrase at a time, never three blocks of copy. Held still under
  // reduced motion rather than swapped abruptly.
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), PHRASE_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  /**
   * The light travels on its own slow path and the pointer only nudges
   * it. Two reasons, both learned by looking at it: a narrow shaft that
   * tracks the cursor exactly reads as a highlight gimmick, and it
   * spends most of its time nowhere near the things it is supposed to
   * reveal, so the monogram and the phrase simply never light up.
   *
   * The path is a slow Lissajous figure that crosses the monogram and
   * the phrase in turn. The pointer adds at most a third of the way to
   * the edge, which is enough to feel responsive without taking over.
   *
   * The whole loop lives in this effect, holding its frame id in a
   * local, so nothing is mutated outside it.
   */
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const field = fieldRef.current;
      if (field) {
        const t = (now - start) / 1000;
        const baseX = 50 + Math.sin(t / 9) * 26;
        const baseY = 46 + Math.sin(t / 6.5 + 1.1) * 24;
        const wantX = baseX + nudge.current.x * 0.34;
        const wantY = baseY + nudge.current.y * 0.34;
        current.current.x += (wantX - current.current.x) * 0.05;
        current.current.y += (wantY - current.current.y) * 0.05;
        field.style.setProperty("--lx", `${current.current.x.toFixed(2)}%`);
        field.style.setProperty("--ly", `${current.current.y.toFixed(2)}%`);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  function track(clientX: number, clientY: number) {
    const field = fieldRef.current;
    if (!field || reduced) return;
    const rect = field.getBoundingClientRect();
    nudge.current = {
      x: ((clientX - rect.left) / rect.width) * 100 - 50,
      y: ((clientY - rect.top) / rect.height) * 100 - 50,
    };
  }

  function enter() {
    setEntering(true);
    // Move focus to the form rather than leaving it at the button that
    // just disappeared.
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLInputElement>("input[type='email']")?.focus();
    }, 220);
  }

  return (
    <section
      ref={fieldRef}
      className={`${styles.field} ${entering ? styles.open : ""} ${reduced ? styles.still : ""}`}
      onPointerMove={(e) => track(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) track(touch.clientX, touch.clientY);
      }}
    >
      {/* The light itself, and everything it catches. Decorative: the
          phrases are repeated in the copy below for anyone who cannot
          see them. */}
      <div className={styles.light} aria-hidden="true">
        <div className={styles.lit}>
          <svg className={styles.monogram} viewBox="0 0 1000 1200" role="presentation">
            <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round">
              <path d="M555 165 L555 925" strokeWidth="24" />
              <path d="M505 165 L605 165" strokeWidth="13" />
              <path d="M505 925 L605 925" strokeWidth="13" />
              <path d="M330 315 L330 760" strokeWidth="24" />
              <path d="M290 315 L370 315" strokeWidth="13" />
              <path d="M290 760 L370 760" strokeWidth="13" />
              <path d="M330 535 L555 535" strokeWidth="24" />
            </g>
          </svg>
          {!entering && (
            <p className={styles.phrase} key={phrase}>
              {PHRASES[phrase]}
            </p>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.eyebrow}>A private film club</p>
        {/*
         * An offer, not an instruction. "Find the joy" tells a visitor
         * what to feel; "get it back" says they already had it and
         * something took it, which is the actual pitch. Changed by
         * direction on 15 August.
         */}
        <h1 className={styles.headline}>Get the excitement of not knowing back.</h1>
        {/*
          Two lines, not four. The old copy argued against trailers,
          reviews, clips and consensus, which made the entrance a
          complaint about other products. What House Dark offers is
          the pleasure on the other side of that, so the page says
          what it is and then stops.
        */}
        <p className={styles.body}>
          A film club built around knowing less before you watch. Get just enough to choose. Leave
          the rest for the film.
        </p>

        {!entering ? (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={enter}>
              Enter House Dark
            </button>
            {/* Carries the testing key. Without it a visitor who
                arrived at /?k=... and chose to sign in rather than
                enter here landed on the ordinary form and was asked
                for a code that cannot currently be delivered. */}
            <Link
              href={testKey ? `/join?k=${encodeURIComponent(testKey)}` : "/join"}
              className={styles.secondary}
            >
              Member sign in
            </Link>
          </div>
        ) : (
          <div className={styles.entry} ref={formRef}>
            <JoinForm testKey={testKey} />
          </div>
        )}
      </div>
    </section>
  );
}

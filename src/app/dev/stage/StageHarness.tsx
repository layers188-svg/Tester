"use client";

import { useMemo, useState } from "react";
import { TonightExperience } from "@/components/tonight/TonightExperience";
import { TheRoom } from "@/components/room/TheRoom";
import { TrustUs } from "@/components/trust/TrustUs";
import { SealedExperience } from "@/components/circle/SealedExperience";
import { LibraryArchive } from "@/components/library/LibraryArchive";
import { MotionPreferenceProvider } from "@/lib/motion/reduced-motion";
import { RoomTransitionProvider } from "@/lib/motion/room-transition";
import {
  stageOpening,
  stageProgress,
  stageReveal,
  stageRoomOpening,
  stageVoices,
  stageTerritories,
  stageTrustUs,
  stageRecommendation,
  stageSealedProgress,
  stageLibrary,
} from "./fixtures";
import styles from "./stage.module.css";

/**
 * The staging state simulator (handover 03_TECHNICAL_INTEGRATION.md,
 * "Staging state simulator": support equivalent test states — sealed,
 * clue, trailer, reveal, watched, room).
 *
 * This exists so the signature motion can be rendered and measured in a
 * real browser, which the motion system insists on: "Do not approve
 * motion by reading CSS… render in a real browser, record or inspect
 * intermediate frames, verify geometry actually changes." The Playwright
 * suite in tests/e2e/motion.spec.ts drives this page.
 *
 * It renders the *real* components — not copies — with fixture props.
 * The network is stubbed at `window.fetch` rather than by adding dev
 * API routes, so there is no server surface to leak into production:
 * the route that mounts this refuses to render outside development, and
 * even if it did render, the only thing it could reveal is a fixture.
 *
 * The one thing it must never do is change server eligibility, and it
 * cannot — nothing here has a session, and every real boundary is a
 * security-definer function in Postgres.
 */

type StageState =
  "sealed" | "revealed" | "watched" | "door" | "room" | "trust" | "seal" | "library";

const STATES: { value: StageState; label: string }[] = [
  { value: "sealed", label: "Sealed" },
  { value: "revealed", label: "Revealed" },
  { value: "watched", label: "Watched" },
  { value: "door", label: "Room door" },
  { value: "room", label: "The Room" },
  { value: "trust", label: "Trust Us" },
  { value: "seal", label: "Under Seal" },
  { value: "library", label: "Library" },
];

/**
 * Answers the handful of calls the ritual makes, with the same shapes
 * the real routes return.
 *
 * Installed at module scope — this module is only ever imported by the
 * dev-only route, so importing it *is* the decision to stub, and doing
 * it here means the stub is in place before anything can render, with
 * no hook and no render-phase side effect.
 */
function installStageFetch() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __hdStageFetch?: boolean }).__hdStageFetch) return;
  (window as unknown as { __hdStageFetch?: boolean }).__hdStageFetch = true;

  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    if (url.includes("/api/reveal/")) {
      // A deliberate beat, so the black hold and the network wait are
      // visibly two different things when the sequence is recorded.
      await new Promise((resolve) => setTimeout(resolve, 120));
      return json(stageReveal);
    }
    if (url.includes("/api/trust-us")) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return json(stageTrustUs(body));
    }
    if (url.includes("/api/watch")) return json({ id: "stage-watch", state: "watched" });
    if (url.includes("/api/room/preview")) {
      return json({
        voice: { body: stageVoices[0].body, author: stageVoices[0].author_display_name },
      });
    }
    if (url.includes("/api/six-words/skip")) {
      return json({ skippedAt: new Date().toISOString() });
    }
    if (url.includes("/api/six-words")) {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return json({ id: "stage-review", body: body.body, created_at: new Date().toISOString() });
    }

    return realFetch(input, init);
  };
}

installStageFetch();

export function StageHarness({ initialState }: { initialState: StageState }) {
  const [state, setState] = useState<StageState>(initialState);

  // A fixed target, chosen once, so the countdown is not re-seeded on
  // every render (which would freeze it).
  const [nextOpeningAt] = useState(() => new Date(Date.now() + 3_600_000).toISOString());

  const progress = useMemo(() => {
    switch (state) {
      case "revealed":
        return { ...stageProgress, hasRevealed: true };
      case "watched":
        return { ...stageProgress, hasRevealed: true, watchState: "watched" as const };
      case "door":
        return {
          ...stageProgress,
          hasRevealed: true,
          watchState: "watched" as const,
          hasSixWords: true,
          sixWordsBody: stageRoomOpening.ownWords,
        };
      default:
        return stageProgress;
    }
  }, [state]);

  return (
    <MotionPreferenceProvider>
      <RoomTransitionProvider onNavigate={() => setState("room")}>
        <nav className={styles.bar} aria-label="Staging states">
          <span className={styles.barLabel}>Stage</span>
          {STATES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={styles.barButton}
              data-active={state === value}
              data-stage-state={value}
              onClick={() => setState(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        <main id="hd-main" className={styles.main}>
          {state === "library" ? (
            <LibraryArchive items={stageLibrary} />
          ) : state === "seal" ? (
            <SealedExperience recommendation={stageRecommendation} progress={stageSealedProgress} />
          ) : state === "trust" ? (
            <TrustUs territories={stageTerritories} />
          ) : state === "room" ? (
            <TheRoom opening={stageRoomOpening} voices={stageVoices} />
          ) : (
            <TonightExperience
              key={state}
              opening={stageOpening}
              progress={progress}
              nextOpeningAt={nextOpeningAt}
            />
          )}
        </main>
      </RoomTransitionProvider>
    </MotionPreferenceProvider>
  );
}

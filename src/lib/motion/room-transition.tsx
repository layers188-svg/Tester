"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "./reduced-motion";
import styles from "./room-transition.module.css";

/**
 * Home to The Room (handover 01_MOTION_SYSTEM.md §10).
 *
 *   The Room preview must become the full Room. Capture preview
 *   geometry → promote the preview into a fixed transition layer → Home
 *   content moves back and loses contrast → preview expands into the
 *   Room stage → a Circle quote that was visible in the preview stays
 *   visible and relocates → brass rule extends → THE ROOM resolves →
 *   additional voices enter at different depth → transition layer hands
 *   back to the real Room DOM. Duration: 700 to 900 ms.
 *
 * The hard part is that this crosses a route boundary, and a component
 * inside the page cannot survive its own unmount. So the layer lives in
 * the signed-in layout, which persists across every route in the group:
 * Tonight starts the transition, the router changes underneath it, and
 * the Room hands back when it arrives.
 *
 * Rule 4 from the prototype post-mortem applies with full force here —
 * "Keep a safety path that removes blocking intro overlays if animation
 * fails". The layer removes itself on a deadline no matter what
 * happens, so a navigation that stalls leaves a member in the Room
 * rather than behind a frozen sheet.
 */

export interface RoomHandoff {
  openingNumber: number;
  /** The member has revealed this film, so naming it here is allowed. */
  title: string | null;
  /** A Circle quote that was visible in the preview, and stays visible. */
  quote: string | null;
  quoteAuthor: string | null;
}

/** §10: 700 to 900 ms. */
const TRAVEL_MS = 800;
/** §16 step 6: resolve the destination at roughly 60 per cent. */
const NAVIGATE_AT_MS = 480;
/** The layer goes, animation or no animation. */
const SAFETY_MS = 2200;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RoomTransitionApi {
  /** Promote `source` into the layer and go. */
  enter: (source: HTMLElement, handoff: RoomHandoff) => void;
  /** Called by the Room when its own DOM is on screen. */
  arrived: () => void;
  active: boolean;
}

const RoomTransitionContext = createContext<RoomTransitionApi | null>(null);

/** Where the Room's header sits, so the layer lands on it rather than near it. */
function roomTargetRect(): Rect {
  const gutter = 16;
  const width = Math.min(window.innerWidth - gutter * 2, 480);
  return {
    top: 56,
    left: Math.max(gutter, (window.innerWidth - width) / 2),
    width,
    height: 200,
  };
}

export function RoomTransitionProvider({
  children,
  onNavigate,
}: {
  children: ReactNode;
  /**
   * Where the layer hands to. Defaults to the Room's route.
   *
   * The staging simulator has no router to push to — it swaps state in
   * place — so it supplies its own, and in doing so exercises this
   * layer for real rather than a copy of it. Production passes nothing.
   */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const [handoff, setHandoff] = useState<RoomHandoff | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [phase, setPhase] = useState<"idle" | "travelling" | "leaving">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAt = useRef(0);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    clear();
    setPhase("leaving");
    timers.current.push(
      setTimeout(() => {
        setPhase("idle");
        setHandoff(null);
        setRect(null);
      }, 220),
    );
  }, [clear]);

  const enter = useCallback(
    (source: HTMLElement, next: RoomHandoff) => {
      // Reduced motion still changes state — it just does not travel.
      const go = onNavigate ?? (() => router.push("/tonight/room"));

      if (reducedMotion) {
        go();
        return;
      }

      const box = source.getBoundingClientRect();
      startedAt.current = performance.now();
      setHandoff(next);
      setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      setPhase("idle");

      // One frame at the source geometry, so the transition has
      // somewhere to start from.
      requestAnimationFrame(() => {
        setRect(roomTargetRect());
        setPhase("travelling");
      });

      clear();
      timers.current.push(setTimeout(go, NAVIGATE_AT_MS));
      timers.current.push(setTimeout(finish, SAFETY_MS));
    },
    [clear, finish, onNavigate, reducedMotion, router],
  );

  /*
   * The Room arrives at 480ms, well before the layer has finished
   * travelling. Handing back the moment it mounts would cut the
   * movement in half and put the panel's landing off screen — the
   * member would see it leave and never see it arrive. So the layer
   * plays out its full travel and hands back at the end, over a Room
   * that has been painted and waiting underneath since 480ms.
   */
  const arrived = useCallback(() => {
    if (phase === "idle") return;
    const elapsed = performance.now() - startedAt.current;
    const remaining = Math.max(0, TRAVEL_MS - elapsed);
    clear();
    timers.current.push(setTimeout(finish, remaining));
  }, [clear, finish, phase]);

  useEffect(() => clear, [clear]);

  const active = phase !== "idle";

  return (
    <RoomTransitionContext.Provider value={{ enter, arrived, active }}>
      {/*
       * Home moves back and loses contrast while the layer is up
       * (§10 step 3). It is the page behind, not the layer.
       */}
      <div className={styles.behind} data-receding={active || undefined}>
        {children}
      </div>

      {handoff && rect && (
        <div className={styles.layer} data-phase={phase} aria-hidden="true">
          <div
            className={styles.panel}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              transitionDuration: `${TRAVEL_MS}ms`,
            }}
          >
            <p className={styles.eyebrow}>Opening {handoff.openingNumber}</p>
            {handoff.title && <p className={styles.film}>{handoff.title}</p>}
            <p className={styles.roomTitle}>The Room</p>
            <span className={styles.rule} />
            {handoff.quote && (
              <p className={styles.quote}>
                {handoff.quote}
                {handoff.quoteAuthor && (
                  <span className={styles.quoteAuthor}> {handoff.quoteAuthor}</span>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </RoomTransitionContext.Provider>
  );
}

export function useRoomTransition(): RoomTransitionApi | null {
  return useContext(RoomTransitionContext);
}

/** Call from the Room. The layer hands back as soon as the real thing is on screen. */
export function useRoomArrival() {
  const transition = useContext(RoomTransitionContext);
  const arrived = transition?.arrived;

  useEffect(() => {
    if (!arrived) return;
    // One frame, so the Room has actually painted before the layer goes.
    const frame = requestAnimationFrame(() => arrived());
    return () => cancelAnimationFrame(frame);
  }, [arrived]);
}

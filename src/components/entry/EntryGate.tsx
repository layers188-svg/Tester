"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { EntryAperture } from "./EntryAperture";
import apertureStyles from "./EntryAperture.module.css";
import styles from "./EntryGate.module.css";

/**
 * Holds the entry over the public site, and hands the House back when
 * the member is finished with it.
 *
 * Dismissing runs the other half of §5's enter transition — "The House
 * opens from a horizontal slit or controlled aperture. Main composition
 * comes into focus" — on the page underneath, so the aperture closing
 * and the House opening are one movement rather than two screens.
 *
 * Seen once per session, not once per lifetime. A member who came back
 * to read the FAQ does not need the ceremony again, and an owner
 * showing the House to somebody does not want to clear site data to get
 * it back (acceptance test I8: "Entry is replayable in staging" — here
 * it is replayable everywhere, by opening a new tab).
 */

const SESSION_KEY = "hd-entry-seen";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function readSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    // No session storage. Show the entry — being shown it twice is
    // better than being trapped behind a broken check.
    return false;
  }
}

/**
 * The server always says "not seen", so the markup it sends is the
 * dark. Correcting the other way would flash the House before the
 * entry, which is the one thing this must never do.
 */
function readSeenOnServer(): boolean {
  return false;
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // Fine. The entry simply shows again on the next navigation.
  }
  for (const listener of listeners) listener();
}

export function EntryGate({ children }: { children: React.ReactNode }) {
  // The entry is the way into the House, not a splash screen in front
  // of the terms page. Only "/" gets it.
  const isEntryRoute = usePathname() === "/";
  const seen = useSyncExternalStore(subscribe, readSeen, readSeenOnServer);

  const showEntry = isEntryRoute && !seen;
  const dismiss = useCallback(() => markSeen(), []);

  /*
   * The House is hidden from assistive tech only once we know the
   * aperture in front of it is real.
   *
   * Rendering `aria-hidden` from the server looked equivalent and was
   * not: with scripting off, the noscript rule below makes the House
   * visible again, but no rule can undo an aria-hidden attribute — so a
   * screen reader was handed a page with nothing in it. Setting it here
   * means the markup that ships has no aria-hidden at all, and the
   * attribute only ever appears alongside a working overlay.
   */
  const houseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const house = houseRef.current;
    if (!house) return;
    if (showEntry) {
      house.setAttribute("aria-hidden", "true");
      house.setAttribute("inert", "");
    } else {
      house.removeAttribute("aria-hidden");
      house.removeAttribute("inert");
    }
  }, [showEntry]);

  return (
    <>
      {/*
       * Without JavaScript the aperture is a fixed overlay whose only
       * two controls are inert, and the House underneath is clipped to
       * nothing — a black screen with no way out, which is exactly the
       * prototype failure the handover records. So if scripting never
       * arrives, the entry removes itself and the House is simply open.
       * The ceremony is the part that needs JavaScript; the way in is
       * not.
       */}
      <noscript>
        <style>{`.${apertureStyles.entry}{display:none!important}.${styles.house}{clip-path:none!important;opacity:1!important}`}</style>
      </noscript>
      {showEntry && <EntryAperture onDismiss={dismiss} />}
      <div ref={houseRef} className={styles.house} data-open={!showEntry}>
        {children}
      </div>
    </>
  );
}

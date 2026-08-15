"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

/**
 * Reduced motion, as a House-wide preference.
 *
 * The OS media query is the default and is honoured everywhere by
 * `@media (prefers-reduced-motion: reduce)` in tokens.css. This adds a
 * member-facing override on top, because a member who wants the House
 * still should not have to go and find a system panel — and because
 * the setting has to reach the whole House, not one component. The
 * override is mirrored onto `<html data-reduced-motion>`, which
 * tokens.css reads with the same rules as the media query, so CSS-only
 * choreography obeys it without any component doing anything.
 *
 * Both sources are read through useSyncExternalStore rather than an
 * effect that calls setState. They are external stores — one is a
 * MediaQueryList, the other is localStorage — and this is the hook that
 * exists for them: no cascading render on mount, and a server snapshot
 * that keeps hydration honest.
 *
 * Motion principle 9: reduced motion preserves every state change. It
 * removes movement, never steps of the ritual. The black hold before a
 * title survives it deliberately — see --hd-motion-hold.
 */

const STORAGE_KEY = "hd-reduced-motion";
const MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

/* ------------------------------------------------------------------ */
/* The OS preference                                                    */
/* ------------------------------------------------------------------ */

function subscribeToMediaQuery(onChange: () => void): () => void {
  const query = window.matchMedia(MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readMediaQuery(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches;
}

/*
 * The server cannot know, so it says "not reduced" and the client
 * corrects on hydration. That direction is the safe one: the correction
 * only ever removes motion. Guessing "reduced" and then starting to
 * move would be the exact thing the preference exists to prevent.
 */
function readMediaQueryOnServer(): boolean {
  return false;
}

function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToMediaQuery, readMediaQuery, readMediaQueryOnServer);
}

/* ------------------------------------------------------------------ */
/* The member's override                                                */
/* ------------------------------------------------------------------ */

const overrideListeners = new Set<() => void>();

function emitOverrideChange() {
  for (const listener of overrideListeners) listener();
}

function subscribeToOverride(onChange: () => void): () => void {
  overrideListeners.add(onChange);
  // Another tab of the same House counts too.
  window.addEventListener("storage", onChange);
  return () => {
    overrideListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `useSyncExternalStore` compares snapshots by identity, so this must
 * return a stable primitive — "true" | "false" | null, never a fresh
 * object.
 */
function readOverride(): "true" | "false" | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "true" || stored === "false" ? stored : null;
  } catch {
    // Private mode, or storage disabled. The OS preference still works.
    return null;
  }
}

function readOverrideOnServer(): null {
  return null;
}

function writeOverride(value: boolean | null) {
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    }
  } catch {
    // Nothing to persist to. The next reader falls back to the OS.
  }
  emitOverrideChange();
}

/* ------------------------------------------------------------------ */

interface MotionPreference {
  /** What the House should actually do: the override if set, otherwise the OS preference. */
  reducedMotion: boolean;
  /** Null when the member has not chosen and the OS preference is in charge. */
  override: boolean | null;
  setOverride: (value: boolean | null) => void;
}

const MotionPreferenceContext = createContext<MotionPreference | null>(null);

function useMotionPreferenceValue(): MotionPreference {
  const systemPrefers = useSystemReducedMotion();
  const stored = useSyncExternalStore(subscribeToOverride, readOverride, readOverrideOnServer);

  const override = stored === null ? null : stored === "true";
  const reducedMotion = override ?? systemPrefers;

  const setOverride = useCallback((value: boolean | null) => writeOverride(value), []);

  return { reducedMotion, override, setOverride };
}

export function MotionPreferenceProvider({ children }: { children: React.ReactNode }) {
  const value = useMotionPreferenceValue();

  // Mirror onto <html> so the CSS in tokens.css can act on it. This is
  // the legitimate use of an effect here: pushing React state out to an
  // external system.
  useEffect(() => {
    const root = document.documentElement;
    if (value.reducedMotion) {
      root.setAttribute("data-reduced-motion", "true");
    } else {
      root.removeAttribute("data-reduced-motion");
    }
  }, [value.reducedMotion]);

  return (
    <MotionPreferenceContext.Provider value={value}>{children}</MotionPreferenceContext.Provider>
  );
}

/**
 * Outside the provider — the marketing site, a unit test rendering one
 * component — this falls back to the OS preference alone, so a
 * component never has to care whether it is inside the House.
 */
export function useReducedMotion(): boolean {
  const context = useContext(MotionPreferenceContext);
  const systemPrefers = useSystemReducedMotion();
  return context ? context.reducedMotion : systemPrefers;
}

export function useMotionPreference(): MotionPreference | null {
  return useContext(MotionPreferenceContext);
}

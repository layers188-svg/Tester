"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface HouseLights {
  /** True while the room around the clue is dark. */
  dimmed: boolean;
  setDimmed: (dimmed: boolean) => void;
}

/**
 * The state of the house lights, shared by the signed-in shell.
 *
 * DIM is the one verb that cannot live inside the screen that triggers
 * it. The masthead and the four tabs belong to the layout, and Tonight
 * has no way to reach them — which is why the previous dim was a black
 * sheet painted on top of the shell instead of the shell going dark.
 * This is the smallest thing that lets the clue turn the room off:
 * a boolean, a setter, and two components that read it.
 *
 * The default is a working no-op rather than a thrown error, so a
 * screen outside the signed-in shell (or a component under test) can
 * call `dim()` without the caller needing to know whether anyone is
 * listening.
 */
const HouseLightsContext = createContext<HouseLights>({
  dimmed: false,
  setDimmed: () => {},
});

export function HouseLights({ children }: { children: React.ReactNode }) {
  const [dimmed, setDimmed] = useState(false);
  const value = useMemo(() => ({ dimmed, setDimmed }), [dimmed]);
  return <HouseLightsContext.Provider value={value}>{children}</HouseLightsContext.Provider>;
}

export function useHouseLights(): HouseLights {
  return useContext(HouseLightsContext);
}

/**
 * A piece of the shell that goes dark with the room.
 *
 * `inert` is the half that matters and the half CSS cannot do: at
 * opacity 0 the chrome is invisible but still tabbable and still read
 * aloud, so without this the member sits in a dark room with a screen
 * reader announcing four navigation tabs.
 */
export function Dimmable({
  as = "div",
  className,
  children,
}: {
  as?: "header" | "div";
  className?: string;
  children: React.ReactNode;
}) {
  const { dimmed } = useHouseLights();
  const props = {
    className: className ? `${className} hd-dimmable` : "hd-dimmable",
    "data-dimmed": dimmed,
    inert: dimmed,
  };
  return as === "header" ? (
    <header {...props}>{children}</header>
  ) : (
    <div {...props}>{children}</div>
  );
}

/**
 * Turn the house lights down and back up around an awaited moment.
 * Returns a stable callback so effects can depend on it.
 */
export function useDimmer() {
  const { setDimmed } = useHouseLights();
  return useCallback((dimmed: boolean) => setDimmed(dimmed), [setDimmed]);
}

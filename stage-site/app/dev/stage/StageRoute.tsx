"use client";

import { useCallback, useSyncExternalStore } from "react";
import { StageHarness, type StageState, parseStageState } from "@/app/dev/stage/StageHarness";

/**
 * Reads `?state=` on the client.
 *
 * The route in the product reads it on the server, which an exported
 * site cannot do — there is no server. So the URL is read as an external
 * store instead: "" during prerender, the real query string once the
 * browser has it. `key` remounts the harness when that resolves, which
 * is what makes a deep link land in the state it names rather than in
 * whatever was prerendered.
 *
 * useSyncExternalStore rather than an effect, matching how this codebase
 * reads every other browser-owned value (see lib/motion/reduced-motion).
 * An effect that called setState here would be the exact pattern React
 * 19's lint rules reject.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function StageRoute() {
  const getSnapshot = useCallback(() => window.location.search, []);
  const search = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const initial: StageState = parseStageState(new URLSearchParams(search).get("state"));

  return <StageHarness key={initial} initialState={initial} />;
}

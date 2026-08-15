"use client";

/** Keeps the Desk chrome around a failed panel. */

import { ErrorScreen } from "@/components/ErrorScreen";

export default function DeskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} where="desk" />;
}

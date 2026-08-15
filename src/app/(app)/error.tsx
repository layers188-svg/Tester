"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

/**
 * Sits inside the signed-in layout, so a failed screen keeps the four
 * tabs and the member can move somewhere else instead of being dropped
 * onto a bare page.
 */
export default function SignedInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} where="signed-in" />;
}

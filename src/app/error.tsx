"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

/** Catches anything the nested boundaries below do not. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen error={error} reset={reset} where="root" />;
}

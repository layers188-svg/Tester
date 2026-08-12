"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";
import { Button } from "@/components/Button";

/**
 * The shared body of every error boundary (brief §16 resilience rule
 * 1). Boundaries differ only in where they sit, so the copy lives here
 * once.
 *
 * It renders fixed copy and never `error.message`. That is the point:
 * brief §11 lists error messages among the places a film's identity
 * must not appear, and an error thrown deep in a query can quote the
 * row that caused it. Next redacts server messages in production but
 * not in development — and the Programming Desk is used in development
 * — so the message is rendered in neither.
 *
 * `error.digest` is safe to log: it is a hash Next generates for
 * correlating with the server log, not the message itself.
 */
export function ErrorScreen({
  error,
  reset,
  where,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  where: string;
}) {
  useEffect(() => {
    console.error(`House Dark ${where} error boundary${error.digest ? ` (${error.digest})` : ""}`);
  }, [error.digest, where]);

  return (
    <StatusScreen
      eyebrow="The house"
      title="Something went dark."
      body="That is on us, not on you. Nothing you have saved is affected. Try again, and if it keeps happening, come back a little later."
    >
      <Button variant="primary" fullWidth onClick={() => reset()}>
        Try again
      </Button>
    </StatusScreen>
  );
}

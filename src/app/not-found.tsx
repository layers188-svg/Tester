import type { Metadata } from "next";
import { StatusScreen } from "@/components/StatusScreen";
import { Button } from "@/components/Button";

export const metadata: Metadata = { title: "Not found" };

/**
 * Serves both a mistyped URL and every `notFound()` call — a Circle you
 * have left, a sealed recommendation that was never yours, an opening
 * that no longer exists.
 *
 * The copy is deliberately identical for all of those. "This Circle is
 * private" and "no such Circle" are different sentences, and the
 * difference tells an outsider which ids are real. One line, no
 * distinction (brief §11).
 */
export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="The house"
      title="Nothing here."
      body="This page does not exist, or it is not yours to see. The house does not say which."
    >
      <Button variant="primary" href="/tonight">
        Go to Tonight
      </Button>
      <Button variant="ghost" href="/">
        Back to the front
      </Button>
    </StatusScreen>
  );
}

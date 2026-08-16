import type { Metadata } from "next";
import { Button } from "@/components/Button";
import styles from "@/app/(marketing)/content.module.css";

/**
 * Where the aperture lets you out, on the review site.
 *
 * The product's /join takes a six digit code by email, which needs
 * Supabase and Resend. Neither exists here, so this route deliberately
 * does not import the real one: a sign-in form that accepts an address
 * and then silently fails is a worse thing to publish than a page that
 * says what this site is. The path is kept because the aperture's exit
 * points at it, and that link is part of what is being reviewed.
 */

export const metadata: Metadata = {
  title: "Join or sign in",
  robots: { index: false, follow: false },
};

export default function ReviewJoinPage() {
  return (
    <div className={styles.page}>
      <h1>This is the motion, not the House.</h1>
      <p className={styles.lead}>
        You have just come through the projection aperture, which is one of the sequences up for
        review. Everything past this point — signing in, tonight&rsquo;s opening, your Circle —
        needs a database, and this site does not have one.
      </p>
      <p>
        The signature motion does not need one. It runs on the staging simulator, which mounts the
        real components and answers their network calls with fixtures.
      </p>
      <p>
        <Button href="/dev/stage/" variant="primary">
          Open the simulator
        </Button>
      </p>
      <p>
        Eight states across the top: sealed, revealed, watched, the Room door, the Room, Trust Us,
        under seal, and the Library. What to look for in each is in
        <code> docs/REVIEWING_THE_MOTION.md</code>.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getMemberOpeningProgress, getTonightOpening } from "@/lib/opening/queries";
import { getRoomOpening, getRoomVoices } from "@/lib/room/queries";
import { isRoomOpen } from "@/lib/opening/eligibility";
import { TheRoom } from "@/components/room/TheRoom";
import styles from "./page.module.css";

// Post-watch, per member, and it carries a title the member has earned.
// Never static, never shared across members.
export const dynamic = "force-dynamic";

/**
 * The metadata is deliberately the constant word "The Room". The page
 * body may name the film — the member revealed it themselves — but the
 * document title reaches browser history, the tab strip and any link
 * preview, which are places the spoiler rules put off limits.
 */
export const metadata: Metadata = { title: "The Room" };

export default async function RoomPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const opening = await getTonightOpening(supabase);
  if (!opening) return <RoomClosed reason="Nothing is programmed yet." />;

  const progress = await getMemberOpeningProgress(supabase, user.id, opening.id);

  // Acceptance test E1: the Room cannot open before eligibility. This
  // check decides what to render; get_room_voices() enforces the same
  // rule in SQL and is the boundary that actually holds.
  const open = isRoomOpen({
    hasWatched: progress.watchState === "watched",
    hasSubmittedSixWords: progress.hasSixWords,
    hasSkippedReview: progress.hasSkippedReview,
  });

  if (!open) {
    return (
      <RoomClosed
        reason={
          progress.watchState === "watched"
            ? "Six words, or skip them. Either one opens the door."
            : "The Room opens after the picture."
        }
      />
    );
  }

  const [roomOpening, voices] = await Promise.all([
    getRoomOpening(supabase, opening.id, opening.openingNumber),
    getRoomVoices(supabase, opening.id),
  ]);

  return <TheRoom opening={roomOpening} voices={voices} />;
}

function RoomClosed({ reason }: { reason: string }) {
  return (
    <div className={styles.closed}>
      <p className={styles.eyebrow}>The Room</p>
      <h1>Not yet.</h1>
      <p>{reason}</p>
      <Link href="/tonight" className={styles.back}>
        Back to Tonight
      </Link>
    </div>
  );
}

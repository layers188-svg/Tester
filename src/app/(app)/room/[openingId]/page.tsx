import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { Room } from "@/components/room/Room";
import styles from "./page.module.css";

/**
 * The Room: what everybody else said, once you have said yours.
 *
 * Dynamic, never prefetched, never statically generated. This page
 * renders a title, so it falls under the same rule as the reveal
 * routes: a build-time render would put a film's name in a static
 * artefact, and a prefetch would fetch it into the browser of a member
 * who is merely hovering a link on some other screen.
 */
export const dynamic = "force-dynamic";

/**
 * Deliberately not the film. A page title becomes the browser tab, the
 * history entry and the share sheet, and this one is reachable from a
 * link that a member who has not revealed could conceivably follow.
 * "The Room" is true on every one of those surfaces.
 */
export const metadata: Metadata = { title: "The Room" };

export default async function RoomPage({ params }: { params: Promise<{ openingId: string }> }) {
  const { openingId } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_room_opening", { p_opening_id: openingId });
  const opening = data?.[0];

  if (error || !opening) notFound();

  // Two ways in that are not really ways in. A member who never opened
  // this night has no business reading the room for it, and one who has
  // not written their own words goes back to write them — which is the
  // entire product, so it is a redirect rather than a message.
  if (!opening.has_revealed) redirect("/tonight");
  if (!opening.has_published) redirect("/tonight");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Opening {opening.opening_number}</p>
      <h1 className={styles.title}>
        {opening.title}
        {opening.release_year ? <span className={styles.year}> {opening.release_year}</span> : null}
      </h1>

      <Room openingId={openingId} />
    </div>
  );
}

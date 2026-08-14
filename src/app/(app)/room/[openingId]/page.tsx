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

  // Two ways in that are not really ways in.
  //
  // A member who never opened this night has no business reading the
  // room for it. A member who has not watched it goes back, because the
  // whole point is that their own reaction to the film forms before
  // anybody else's words reach them.
  //
  // Writing is no longer required. It never was the thing being
  // protected — watching is when the reaction forms, and publishing was
  // only the evidence. Demanding the evidence made the Room a toll on
  // members who genuinely had nothing to say. See migration 0023.
  if (!opening.has_revealed) redirect("/tonight");
  if (!opening.has_watched) redirect("/tonight");

  /*
   * The member's own words, server-rendered rather than waited for.
   *
   * They used to arrive with everybody else's, which meant the Room's
   * first paint said "Opening the room." where the member's own anchor
   * should already be — and the words they had just written appeared to
   * be fetched back from somewhere. They are the one thing on this page
   * that needs no permission check beyond the row's own author, so
   * `can_view_six_word_review` returns them directly.
   *
   * No spoiler exposure: a six-word review is the member's own writing,
   * and the title on this page has already been earned by has_revealed.
   */
  const { data: own } = await supabase
    .from("six_word_reviews")
    .select("body")
    .eq("user_id", user.id)
    .eq("opening_id", openingId)
    .maybeSingle();

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Opening {opening.opening_number}</p>
      <h1 className={styles.title}>
        {opening.title}
        {opening.release_year ? <span className={styles.year}> {opening.release_year}</span> : null}
      </h1>

      <Room openingId={openingId} ownSixWords={own?.body ?? null} />
    </div>
  );
}

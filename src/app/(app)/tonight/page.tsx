import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getMemberOpeningProgress,
  getNextOpening,
  getPreviousOpening,
  getTonightOpening,
} from "@/lib/opening/queries";
import { TonightExperience } from "@/components/tonight/TonightExperience";
import { TheHouse } from "@/components/house/TheHouse";
import { isLive } from "@/lib/opening/schedule";
import styles from "./page.module.css";

// This screen is the spoiler-critical surface of the whole product — it
// must never be statically generated or cached across members.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tonight",
};

export default async function TonightPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [opening, next] = await Promise.all([
    getTonightOpening(supabase),
    getNextOpening(supabase),
  ]);

  const progress =
    user && opening ? await getMemberOpeningProgress(supabase, user.id, opening.id) : null;

  /**
   * Last night's, for someone who has arrived before tonight opens.
   *
   * Only fetched when there is nothing to do yet: a member who can
   * already open tonight's should be looking at tonight's. `reveals`
   * is the test for "have they ever done this" because it is the one
   * action that means they have been through the sequence — a watch or
   * a review without one is not possible.
   */
  const waiting = !opening || opening.status !== "open";
  let previous = null;
  let isNewcomer = false;

  if (waiting && user) {
    const { count } = await supabase
      .from("reveals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    isNewcomer = (count ?? 0) === 0;
    if (isNewcomer) previous = await getPreviousOpening(supabase);
  }

  /*
   * Two landing states, one route.
   *
   * Before the reveal, Tonight is the event and nothing else belongs on
   * screen. Once this member has revealed it, the event has happened
   * and returning to a reveal card they have already read is being
   * shown a finished evening on a loop — so the same route opens into
   * the House instead.
   *
   * The switch is per member, not global: `hasRevealed` is theirs, so a
   * member who has not opened tonight still gets the sealed card while
   * someone who has gets the House.
   */
  if (opening && user && progress?.hasRevealed && isLive(opening)) {
    const [{ data: waiting }, { data: library }, { data: room }] = await Promise.all([
      supabase.rpc("list_my_sealed_recommendations"),
      supabase.rpc("get_my_library"),
      supabase.rpc("get_room_opening", { p_opening_id: opening.id }),
    ]);

    const header = room?.[0];
    const items = library ?? [];

    // Only what is genuinely waiting for this member: something someone
    // else sent them, still sealed.
    const unopened = (waiting ?? []).filter((rec) => !rec.is_sender && !rec.revealed_at);

    if (header?.title) {
      return (
        <div className={styles.page}>
          <TheHouse
            state={{
              openingId: opening.id,
              openingNumber: header.opening_number,
              title: header.title,
              releaseYear: header.release_year,
              hasWatched: progress.watchState === "watched",
              hasPublished: header.has_published,
              ownSixWords: progress.sixWordsBody,
              waiting: unopened,
              recent: items,
              libraryCount: items.length,
              next,
            }}
          />
        </div>
      );
    }
  }

  return (
    <div className={styles.page}>
      <TonightExperience
        opening={opening}
        progress={progress}
        nextOpening={next}
        previousOpening={previous}
      />
    </div>
  );
}

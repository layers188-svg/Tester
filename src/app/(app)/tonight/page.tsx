import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getMemberOpeningProgress,
  getNextOpening,
  getPreviousOpening,
  getTonightOpening,
} from "@/lib/opening/queries";
import { TonightExperience } from "@/components/tonight/TonightExperience";
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

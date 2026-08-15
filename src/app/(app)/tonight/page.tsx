import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getMemberOpeningProgress,
  getNextOpeningAt,
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

  const [opening, nextOpeningAt] = await Promise.all([
    getTonightOpening(supabase),
    getNextOpeningAt(supabase),
  ]);

  if (!opening) {
    return (
      <div className={styles.page}>
        <TonightExperience opening={null} progress={null} nextOpeningAt={nextOpeningAt} />
      </div>
    );
  }

  const progress = user ? await getMemberOpeningProgress(supabase, user.id, opening.id) : null;

  return (
    <div className={styles.page}>
      <TonightExperience opening={opening} progress={progress} nextOpeningAt={nextOpeningAt} />
    </div>
  );
}

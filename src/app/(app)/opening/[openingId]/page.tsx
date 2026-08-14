import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getMemberOpeningProgress, getOpeningById } from "@/lib/opening/queries";
import { TonightExperience } from "@/components/tonight/TonightExperience";
import styles from "../../tonight/page.module.css";

/**
 * A night that has already run, walked through from the beginning.
 *
 * Same experience as Tonight and deliberately the same component: the
 * sealed card, the clue, the reveal, the six words, the room. A
 * separate "archive viewer" would drift from the real one and quietly
 * stop being the product.
 *
 * Nothing here relaxes the spoiler rules. The opening arrives through
 * the same safe projection Tonight uses, which reads only `openings`
 * and `opening_cues`, and the title still comes solely from
 * /api/reveal when the member chooses to open it.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "An earlier opening" };

export default async function ArchiveOpeningPage({
  params,
}: {
  params: Promise<{ openingId: string }>;
}) {
  const { openingId } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const opening = await getOpeningById(supabase, openingId);

  // Only nights that have actually happened. A scheduled opening is
  // sealed until its hour, and this route is not a way around that.
  if (!opening || opening.status === "scheduled" || opening.status === "draft") notFound();

  const progress = await getMemberOpeningProgress(supabase, user.id, opening.id);

  return (
    <div className={styles.page}>
      <TonightExperience opening={opening} progress={progress} archive />
    </div>
  );
}

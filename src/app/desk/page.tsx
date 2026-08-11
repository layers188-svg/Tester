import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listDeskOpenings } from "@/lib/desk/queries";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Programming Desk" };

export default async function DeskHomePage() {
  const supabase = await getServerSupabase();
  const openings = await listDeskOpenings(supabase);
  const open = openings.find((o) => o.status === "open");
  const scheduled = openings.filter((o) => o.status === "scheduled");
  const drafts = openings.filter((o) => o.status === "draft" || o.status === "approved");

  const { count: pendingReviews } = await supabase
    .from("six_word_reviews")
    .select("id", { count: "exact", head: true })
    .eq("moderation_state", "visible");

  const { count: failedEmails } = await supabase
    .from("notification_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");

  return (
    <div>
      <h1>Programming Desk</h1>
      <p className={styles.lead}>Logan operates House Dark from here — no code required.</p>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Tonight</h2>
          <p>{open ? `Opening ${open.openingNumber} is open.` : "No opening is live."}</p>
        </div>
        <div className={styles.card}>
          <h2>Scheduled</h2>
          <p>
            {scheduled.length} opening{scheduled.length === 1 ? "" : "s"} queued.
          </p>
        </div>
        <div className={styles.card}>
          <h2>In progress</h2>
          <p>
            {drafts.length} opening{drafts.length === 1 ? "" : "s"} awaiting approval.
          </p>
        </div>
        <div className={styles.card}>
          <h2>Email queue</h2>
          <p>
            {failedEmails ?? 0} failed send{failedEmails === 1 ? "" : "s"}.
          </p>
        </div>
        <div className={styles.card}>
          <h2>Moderation</h2>
          <p>
            {pendingReviews ?? 0} visible six-word review{pendingReviews === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <Link href="/desk/openings/new" className={styles.cta}>
        + New opening
      </Link>
    </div>
  );
}

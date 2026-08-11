import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { CircleForms } from "@/components/circle/CircleForms";
import { Button } from "@/components/Button";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Circle" };

export default async function CirclePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: memberships }, { data: recommendations }] = await Promise.all([
    supabase.from("circle_members").select("role, circles(id, name, invite_code)").eq("user_id", user.id),
    supabase.rpc("list_my_sealed_recommendations"),
  ]);

  const sentToYou = (recommendations ?? []).filter((r) => !r.is_sender && !r.watched_at);
  const sentByYou = (recommendations ?? []).filter((r) => r.is_sender);

  return (
    <div className={styles.page}>
      <h1>Circle</h1>
      <p className={styles.lead}>Trust people, not percentages.</p>
      <Button href="/circle/send" variant="primary">
        Send a film under seal
      </Button>

      {sentToYou.length > 0 && (
        <section className={styles.section}>
          <h2>Sent to you</h2>
          <ul className={styles.recList}>
            {sentToYou.map((rec) => (
              <li key={rec.id}>
                <Link href={`/circle/recommendation/${rec.id}`} className={styles.recCard}>
                  <span className={styles.recSender}>{rec.sender_display_name}</span>
                  <span className={styles.recMeta}>
                    {rec.revealed_at ? "Revealed, not yet watched" : "Sealed"} · {rec.runtime_minutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2>Your Circles</h2>
        {memberships && memberships.length > 0 ? (
          <ul className={styles.circleList}>
            {memberships.map((m) => {
              const circle = m.circles as unknown as { id: string; name: string } | null;
              if (!circle) return null;
              return (
                <li key={circle.id}>
                  <Link href={`/circle/${circle.id}`} className={styles.circleCard}>
                    <span>{circle.name}</span>
                    <span className={styles.circleRole}>{m.role}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.hint}>You are not in a Circle yet.</p>
        )}
      </section>

      <CircleForms />

      {sentByYou.length > 0 && (
        <section className={styles.section}>
          <h2>Sent by you</h2>
          <ul className={styles.recList}>
            {sentByYou.map((rec) => (
              <li key={rec.id} className={styles.recCardStatic}>
                <span className={styles.recMeta}>
                  {rec.runtime_minutes} min · sent{" "}
                  {new Date(rec.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { CircleForms } from "@/components/circle/CircleForms";
import { FriendWords } from "@/components/circle/FriendWords";
import { Button } from "@/components/Button";
import { SealMark } from "@/components/circle/SealMark";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Circle" };

export default async function CirclePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: memberships }, { data: recommendations }, { data: friendWords }] =
    await Promise.all([
      supabase
        .from("circle_members")
        .select("role, circles(id, name, invite_code)")
        .eq("user_id", user.id),
      supabase.rpc("list_my_sealed_recommendations"),
      // Sealed until the viewer has left their own six words; see
      // migration 0019. Absent until that migration is applied, in
      // which case the section shows its empty state.
      supabase.rpc("get_circle_six_words"),
    ]);

  const sentToYou = (recommendations ?? []).filter((r) => !r.is_sender && !r.watched_at);
  const sentByYou = (recommendations ?? []).filter((r) => r.is_sender);

  const waiting = sentToYou[0] ?? null;

  return (
    <div className={styles.page}>
      {/*
        ------------------------------------------------------------
        What is waiting comes first, and it is the page.

        Circle used to open with a heading, a lead, a primary button
        and then "Sent to you" as one bordered row among several
        sections — the composition of an admin screen. The most
        important thing in Circle is that a person chose a film for
        you and you do not know what it is. When that is true it takes
        the top of the page at full scale; when it is not, Circle is
        quiet and the administration is all there is to show.

        The title stays sealed. Nothing here reads the film: the RPC
        behind this page returns the sender, the runtime and whether it
        has been revealed, and never the name.
        ------------------------------------------------------------
      */}
      {waiting ? (
        <section className={styles.waiting}>
          {/*
            The seal, as an object rather than as a word.

            It carries `hd-seal`, which the recommendation page's own
            seal also carries, so choosing this does not replace one
            screen with another: the seal travels from here into the
            page where it breaks. It is the same two arcs and a rule the
            sender watched close.
          */}
          <SealMark broken={false} className={styles.waitingSeal} />
          <p className={styles.waitingLabel}>Under seal</p>
          <h1 className={styles.waitingTitle}>A film is waiting.</h1>
          <p className={styles.waitingFrom}>From {waiting.sender_display_name}</p>
          <p className={styles.waitingMeta}>
            {waiting.revealed_at ? "Revealed, not yet watched" : "Sealed"}
            {waiting.runtime_minutes ? ` · ${waiting.runtime_minutes} min` : ""}
          </p>
          <Button variant="primary" href={`/circle/recommendation/${waiting.id}`}>
            Enter under seal
          </Button>

          {sentToYou.length > 1 && (
            <ul className={styles.alsoWaiting}>
              {sentToYou.slice(1).map((rec) => (
                <li key={rec.id}>
                  <Link href={`/circle/recommendation/${rec.id}`} className={styles.alsoLink}>
                    <span className={styles.recSender}>{rec.sender_display_name}</span>
                    <span className={styles.recMeta}>
                      {rec.revealed_at ? "Revealed, not yet watched" : "Sealed"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className={styles.quietHead}>
          <h1>Circle</h1>
          <p className={styles.lead}>Trust people, not percentages.</p>
          <Button href="/circle/send" variant="primary">
            Send a film under seal
          </Button>
        </section>
      )}

      {/*
        The brief's two areas: recommendations sent directly to the
        member, above, and friend activity here. Circle activity used to
        live in Library, which is the wrong place for it — Library is a
        collection, this is a room.
      */}
      {waiting && (
        <section className={styles.sendRow}>
          <Button href="/circle/send" variant="secondary">
            Send a film under seal
          </Button>
        </section>
      )}

      <section className={styles.section}>
        <h2>From your Circle</h2>
        <FriendWords words={friendWords ?? []} />
      </section>

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
                  {new Date(rec.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

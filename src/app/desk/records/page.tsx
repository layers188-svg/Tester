import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { HouseRecordForm } from "@/components/desk/HouseRecordForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "House records" };

/**
 * The Trust Us editorial desk.
 *
 * Titles are visible here, and that is correct: this is the owner's own
 * view behind an is_owner() boundary, the same place opening secrets
 * are edited. A member never reaches this route.
 */
export default async function HouseRecordsPage() {
  const supabase = await getServerSupabase();

  const { data: records } = await supabase
    .from("film_house_records")
    .select("film_id, six_words_before, territories, version, editorial_approved_at, films(title)")
    .order("editorial_approved_at", { ascending: false, nullsFirst: true })
    .limit(100);

  const rows = (records ?? []) as unknown as {
    film_id: string;
    six_words_before: string;
    territories: string[];
    version: number;
    editorial_approved_at: string | null;
    films: { title: string } | null;
  }[];

  const waiting = rows.filter((row) => !row.editorial_approved_at).length;

  return (
    <div className={styles.page}>
      <h1>House records</h1>
      <p className={styles.lead}>
        The six words that go in front of a Trust Us recommendation, and the territories each film
        answers. Nothing is offered to a member until it is approved.
      </p>

      <section className={styles.section}>
        <h2>New record</h2>
        <HouseRecordForm />
      </section>

      <section className={styles.section}>
        <h2>
          Written so far
          {waiting > 0 ? <span className={styles.waiting}> · {waiting} waiting</span> : null}
        </h2>
        {rows.length === 0 ? (
          <p className={styles.lead}>
            No records yet. Trust Us has nothing to offer until at least one is approved.
          </p>
        ) : (
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.film_id} className={styles.record}>
                <div className={styles.recordHead}>
                  <span className={styles.recordTitle}>{row.films?.title ?? "Unknown film"}</span>
                  <span className={styles.badge} data-approved={Boolean(row.editorial_approved_at)}>
                    {row.editorial_approved_at
                      ? `v${row.version} approved`
                      : `v${row.version} draft`}
                  </span>
                </div>
                <p className={styles.sixWords}>{row.six_words_before}</p>
                <p className={styles.territories}>{row.territories.join(" · ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

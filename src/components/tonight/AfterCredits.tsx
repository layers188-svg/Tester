"use client";

import { useEffect, useState } from "react";
import styles from "./AfterCredits.module.css";

interface AfterCreditsReview {
  review_id: string;
  body: string;
  display_name: string;
  is_mine: boolean;
  in_my_circle: boolean;
  written_at: string;
}

type View = "everyone" | "circle";

/**
 * After Credits.
 *
 * The room, after you have spoken in it. Every member's six words on the
 * same film, yours pinned first, with the people you share a Circle with
 * given quiet priority rather than a separate feed.
 *
 * There is no rating, no score, no average, no like count and no
 * ordering by popularity, by design: the value is seeing how differently
 * people felt about the same film once you have formed your own
 * reaction, and any of those would collapse that back into a number.
 *
 * The gate lives in the database (migration 0017), not here. This
 * component only reflects what it is given: zero reviews means the
 * member has not published theirs, because their own words are always
 * in the result once they have.
 */
export function AfterCredits({ openingId }: { openingId: string }) {
  const [reviews, setReviews] = useState<AfterCreditsReview[] | null>(null);
  const [view, setView] = useState<View>("everyone");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/after-credits/${openingId}`);
        if (!res.ok) throw new Error("Could not open After Credits.");
        const data = (await res.json()) as { reviews: AfterCreditsReview[] };
        if (!cancelled) setReviews(data.reviews);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open After Credits.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  if (error) {
    return (
      <section className={styles.wrap}>
        <p className={styles.error} role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (reviews === null) {
    return (
      <section className={styles.wrap} aria-busy="true">
        <p className={styles.eyebrow}>After Credits</p>
        <p className={styles.loading}>Opening the room.</p>
      </section>
    );
  }

  const mine = reviews.filter((r) => r.is_mine);
  const others = reviews.filter((r) => !r.is_mine);
  const circle = others.filter((r) => r.in_my_circle);
  const shown = view === "circle" ? circle : others;

  return (
    <section className={styles.wrap}>
      <p className={styles.eyebrow}>After Credits</p>
      <h2 className={styles.heading}>Now hear the room.</h2>

      {mine.map((r) => (
        <article key={r.review_id} className={styles.mine}>
          <p className={styles.mineLabel}>Yours</p>
          <p className={styles.mineBody}>{r.body}</p>
        </article>
      ))}

      <div className={styles.views} role="tablist" aria-label="Whose words to show">
        <button
          type="button"
          role="tab"
          aria-selected={view === "everyone"}
          className={styles.view}
          data-active={view === "everyone"}
          onClick={() => setView("everyone")}
        >
          Everyone
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "circle"}
          className={styles.view}
          data-active={view === "circle"}
          onClick={() => setView("circle")}
        >
          Circle
        </button>
      </div>

      {shown.length === 0 ? (
        // A considered empty state, never invented words. The room being
        // quiet is a true thing to say about a night.
        <p className={styles.empty}>
          {view === "circle"
            ? "Nobody in your Circle has watched this one yet. Their words appear here when they do."
            : "You are first. The rest of the house has not spoken yet."}
        </p>
      ) : (
        <ul className={styles.room}>
          {shown.map((r) => (
            <li
              key={r.review_id}
              className={styles.entry}
              // Circle members read a step louder than the wider house:
              // priority through scale and colour, not a separate feed.
              data-circle={r.in_my_circle ? "true" : "false"}
            >
              <p className={styles.body}>{r.body}</p>
              <p className={styles.who}>{r.display_name}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "./Room.module.css";

interface RoomResponse {
  review_id: string;
  body: string;
  display_name: string;
  is_mine: boolean;
  in_my_circle: boolean;
  written_at: string;
}

type View = "circle" | "house";

/**
 * The Room.
 *
 * Everyone's six words on the same film, and the one thing that makes
 * it worth having: the member has already written theirs, so nothing
 * here can change what they thought. It only shows them how differently
 * other people held the same two hours.
 *
 * What is deliberately absent is most of it. No score, no average, no
 * like, no reply, no sort, no "most helpful", no ranking, no avatars,
 * no follower counts. Every one of those turns a room of people who
 * disagree into a queue forming behind whoever spoke loudest, and the
 * product exists to prevent exactly that.
 *
 * The gate is in the database (migration 0017), not here: this
 * component is given rows or it is given none. Zero rows means the
 * member has not published, because their own words are always in the
 * result once they have.
 */
export function Room({
  openingId,
  ownSixWords,
}: {
  openingId: string;
  /**
   * Rendered on the server, so the member's own words are on screen at
   * first paint. Everyone else's still arrive with the fetch, which is
   * the right way round: the wait belongs to the part of the page that
   * is genuinely other people.
   */
  ownSixWords: string | null;
}) {
  const [responses, setResponses] = useState<RoomResponse[] | null>(null);
  const [view, setView] = useState<View>("circle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/after-credits/${openingId}`);
        if (!res.ok) throw new Error("The house could not open the room.");
        const data = (await res.json()) as { reviews: RoomResponse[] };
        if (!cancelled) setResponses(data.reviews);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "The house could not open the room.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  const others = (responses ?? []).filter((r) => !r.is_mine);
  const circle = others.filter((r) => r.in_my_circle);
  const shown = view === "circle" ? circle : others;

  return (
    <>
      <p className={styles.eyebrow}>The Room</p>
      <p className={styles.lead}>See what stayed with everyone else.</p>

      {/*
        The member's own words first, and never behind a wait. They came
        from the server with the page, so this is the one part of the
        Room that is already true before anything is fetched — which is
        also what lets the words travel here as a single object from the
        submission moment.
      */}
      {ownSixWords && (
        <section className={styles.mine}>
          <p className={styles.mineLabel}>Your six words</p>
          <p className={styles.mineBody}>{ownSixWords}</p>
        </section>
      )}

      <span className={styles.rule} aria-hidden="true" />

      <p className={styles.fromLabel}>From the room</p>

      <div className={styles.views} role="tablist" aria-label="Whose words to show">
        <button
          type="button"
          role="tab"
          aria-selected={view === "circle"}
          className={styles.view}
          data-active={view === "circle"}
          onClick={() => setView("circle")}
        >
          Your Circle
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "house"}
          className={styles.view}
          data-active={view === "house"}
          onClick={() => setView("house")}
        >
          The House
        </button>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : responses === null ? (
        <p className={styles.loading} aria-busy="true">
          Opening the room.
        </p>
      ) : shown.length === 0 ? (
        /*
         * A sentence, not an empty-state box. The room being quiet is a
         * true thing to say about a night, and it is said in the same
         * editorial voice as everything else on the page rather than in
         * a dashed rectangle apologising for itself.
         */
        <p className={styles.quiet}>
          {view === "circle"
            ? "No one from your Circle has entered the room yet."
            : "You are first. Nobody else in the house has spoken."}
        </p>
      ) : (
        <ul className={styles.responses}>
          {shown.map((response, index) => (
            <li
              key={response.review_id}
              className={`${styles.response} hd-stage`}
              // Capped so a busy night does not have its last response
              // arriving seconds after its first.
              style={{ "--hd-stage-index": Math.min(index, 8) } as React.CSSProperties}
            >
              <p className={styles.body}>{response.body}</p>
              <p className={styles.who}>{response.display_name}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

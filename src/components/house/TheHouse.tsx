"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { LibraryItem, MySealedRecommendation } from "@/lib/supabase/types";
import styles from "./TheHouse.module.css";

interface RoomResponse {
  review_id: string;
  body: string;
  display_name: string;
  is_mine: boolean;
  in_my_circle: boolean;
}

export interface HouseState {
  openingId: string;
  openingNumber: number;
  title: string;
  releaseYear: number | null;
  hasWatched: boolean;
  hasPublished: boolean;
  ownSixWords: string | null;
  waiting: MySealedRecommendation[];
  recent: LibraryItem[];
  libraryCount: number;
  next: { openingNumber: number; opensAt: string } | null;
}

/**
 * The House: what remains after the Opening.
 *
 * Tonight is an event, not a homepage. Before the reveal it should be
 * the only thing on screen; afterwards a member returning to a screen
 * that still says "tonight's film is sealed", or worse a reveal card
 * they have already read, is being shown a finished event on a loop.
 *
 * Deliberately not a dashboard. The composition is one dominant object
 * — the Opening — and then progressively quieter sections, because
 * six equal rectangles would say all of these matter the same amount,
 * and they do not.
 *
 * Same route as Tonight. The distinction is a state of the evening,
 * not a place, so making it a sixth destination would put the event
 * and its aftermath in two different rooms.
 */
export function TheHouse({ state }: { state: HouseState }) {
  const [preview, setPreview] = useState<RoomResponse[] | null>(null);

  /**
   * The Room preview, and only once the member has spoken.
   *
   * Guarded here to avoid a request that would come back empty, but the
   * guard is not the protection: `get_after_credits` returns nothing to
   * a member who has not published, whatever this component asks for.
   */
  useEffect(() => {
    if (!state.hasPublished) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/after-credits/${state.openingId}`);
        if (!res.ok) return;
        const data = (await res.json()) as { reviews: RoomResponse[] };
        if (!cancelled) setPreview(data.reviews);
      } catch {
        // A quiet Room preview is not worth an error message on a
        // homepage. The full Room reports properly.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.hasPublished, state.openingId]);

  const others = (preview ?? []).filter((r) => !r.is_mine).slice(0, 3);

  return (
    <div className={styles.house}>
      {/*
        The hero. One state, one action — never every action at once.
        Which action depends on where the member has got to, so the
        page answers "what now" rather than offering a control panel.
      */}
      <section className={styles.opening}>
        <p className={styles.eyebrow}>Opening {String(state.openingNumber).padStart(2, "0")}</p>
        <h1 className={styles.title}>{state.title}</h1>
        {state.releaseYear && <p className={styles.year}>{state.releaseYear}</p>}
        <p className={styles.nowOpen}>Now open</p>

        <div className={styles.heroAction}>
          {!state.hasWatched && (
            <Button variant="primary" href={`/opening/${state.openingId}`}>
              Watch when you&rsquo;re ready
            </Button>
          )}
          {state.hasWatched && !state.hasPublished && (
            <Button variant="primary" href={`/opening/${state.openingId}`}>
              Leave your six words
            </Button>
          )}
          {state.hasPublished && (
            <Button variant="primary" href={`/room/${state.openingId}`}>
              Enter the room
            </Button>
          )}
        </div>
      </section>

      {/*
        The Room, given real weight rather than a link at the bottom of
        a reveal screen. Closed or open, it is the second thing on the
        page, because "what did everyone else think" is the question a
        member comes back with.
      */}
      <section className={styles.room}>
        <p className={styles.sectionLabel}>The Room</p>

        {!state.hasPublished ? (
          <>
            {/*
              Closed, and honestly closed. Nothing is blurred, teased,
              counted or previewed: a blurred quotation still tells you
              somebody said something long and emphatic, and the whole
              point is that the member's own reaction forms first.
            */}
            <p className={styles.roomClosed}>Other voices stay outside until yours is in.</p>
            <Button variant="secondary" href={`/opening/${state.openingId}`}>
              Leave your six words
            </Button>
          </>
        ) : (
          <>
            {state.ownSixWords && (
              <>
                <p className={styles.roomMineLabel}>Your six words</p>
                <p className={styles.roomMine}>{state.ownSixWords}</p>
                {/*
                  The way back to them. Once the House replaced the
                  reveal card as the landing state, a member who had
                  already published had no route to their own words at
                  all: editing and deleting live on the opening's own
                  page, which nothing linked to any more. The edit
                  window and the delete are both promises the product
                  makes, so they have to stay reachable in one tap.
                */}
                <Link href={`/opening/${state.openingId}`} className={styles.change}>
                  Change your words
                </Link>
              </>
            )}

            <span className={styles.rule} aria-hidden="true" />

            {others.length === 0 ? (
              <p className={styles.roomQuiet}>You&rsquo;re first in.</p>
            ) : (
              <>
                <p className={styles.sectionLabel}>From the house</p>
                <ul className={styles.quotes}>
                  {others.map((response) => (
                    <li key={response.review_id}>
                      <p className={styles.quote}>{response.body}</p>
                      <p className={styles.who}>{response.display_name}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <Link href={`/room/${state.openingId}`} className={styles.enter}>
              Enter the room
            </Link>
          </>
        )}
      </section>

      {/*
        Under seal, high on the page when something is waiting and
        absent entirely when nothing is. An empty "you have no
        recommendations" panel is a product asking to be noticed.
      */}
      {state.waiting.length > 0 && (
        <section className={styles.sealed}>
          <p className={styles.sectionLabel}>Under seal</p>
          <p className={styles.sealedCount}>
            {state.waiting.length === 1
              ? "1 film is waiting"
              : `${state.waiting.length} films are waiting`}
          </p>
          <p className={styles.sealedFrom}>
            From {state.waiting.map((r) => r.sender_display_name).join(", ")}
          </p>
          <Button variant="secondary" href={`/circle/recommendation/${state.waiting[0].id}`}>
            Open
          </Button>
        </section>
      )}

      {/* An entry point, not the Search product reproduced. */}
      <section className={styles.search}>
        <p className={styles.sectionLabel}>Find a film</p>
        <p className={styles.searchLead}>Know enough. Nothing more.</p>
        <Link href="/search" className={styles.searchField}>
          Search any film
        </Link>
      </section>

      {state.libraryCount > 0 && (
        <section className={styles.library}>
          <p className={styles.sectionLabel}>
            {state.libraryCount === 1
              ? "1 film in your house"
              : `${state.libraryCount} films in your house`}
          </p>
          <ul className={styles.recent}>
            {state.recent.slice(0, 3).map((item) => (
              <li key={`${item.kind}-${item.target_id}`}>
                <span className={styles.recentTitle}>{item.title ?? "Sealed"}</span>
                {item.six_words && <span className={styles.recentWords}>{item.six_words}</span>}
              </li>
            ))}
          </ul>
          <Link href="/library" className={styles.enter}>
            Open library
          </Link>
        </section>
      )}

      {/* The last thing on the page, and the reason to come back. */}
      <section className={styles.next}>
        <p className={styles.sectionLabel}>Next opening</p>
        {state.next ? (
          <p className={styles.nextWhen}>
            <time dateTime={state.next.opensAt}>
              {new Date(state.next.opensAt).toLocaleDateString(undefined, { weekday: "long" })}
              {" · "}
              {new Date(state.next.opensAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </p>
        ) : (
          <p className={styles.nextWhen}>Seven, most nights</p>
        )}
        <p className={styles.nextSealed}>Sealed</p>
      </section>
    </div>
  );
}

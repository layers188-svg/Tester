"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CirclesActivityRow, HouseOpening, LibraryItem } from "@/lib/supabase/types";
import { WATCH_STATE_LABEL } from "@/lib/labels";
import { EntryField } from "./EntryField";
import { AddFilmForm } from "./AddFilmForm";
import styles from "./LibraryTabs.module.css";

type Tab = "yours" | "circle" | "house";

export interface OwnEntry {
  id: string;
  title: string;
  release_year: number | null;
  runtime_minutes: number | null;
  state: string;
  six_words: string | null;
  created_at: string;
}

export function LibraryTabs({
  mine,
  circleActivity,
  house,
  entries,
}: {
  mine: LibraryItem[];
  circleActivity: CirclesActivityRow[];
  house: HouseOpening[];
  entries: OwnEntry[];
}) {
  const [tab, setTab] = useState<Tab>("yours");
  const [query, setQuery] = useState("");

  // Search only ever matches items where `title` is populated, and the
  // safe RPCs behind this page only populate `title` for rows the
  // member has personally revealed — so this filter cannot surface a
  // sealed title (brief §7 Library rule 4-5).
  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.trim().toLowerCase();
    return entries.filter((e) => e.title.toLowerCase().includes(q));
  }, [entries, query]);

  const filteredMine = useMemo(() => {
    if (!query.trim()) return mine;
    const q = query.trim().toLowerCase();
    return mine.filter((item) => item.title?.toLowerCase().includes(q));
  }, [mine, query]);

  const filteredHouse = useMemo(() => {
    if (!query.trim()) return house;
    const q = query.trim().toLowerCase();
    return house.filter((item) => item.title?.toLowerCase().includes(q));
  }, [house, query]);

  const yoursSealed = filteredMine.filter((item) => !item.revealed).length;
  const houseSealed = filteredHouse.filter((opening) => !opening.revealed).length;

  return (
    <div>
      <div className={styles.tabs} role="tablist" aria-label="Library">
        {(["yours", "circle", "house"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={styles.tab}
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "yours" ? "Yours" : t === "circle" ? "Circle" : "The House"}
          </button>
        ))}
      </div>

      {(tab === "yours" || tab === "house") && (
        <input
          className={styles.search}
          placeholder="Search titles you've revealed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {tab === "yours" && <AddFilmForm />}

      {tab === "yours" && (
        <>
          <Tally count={filteredEntries.length + filteredMine.length} sealed={yoursSealed} />
          <ul className={styles.list}>
            {filteredMine.length === 0 && filteredEntries.length === 0 && (
              <p className={styles.hint}>
                Nothing here yet. Tonight&rsquo;s opening lands here once you have watched it, and
                you can add anything else you have seen.
              </p>
            )}

            {/* The member's own additions, alongside what the house
                programmed rather than in a separate list: it is one
                collection, and splitting it would make the house the
                main thing again. */}
            {filteredEntries.map((entry, index) => (
              <Entry
                key={`entry-${entry.id}`}
                position={index}
                id={entry.id}
                revealed
                title={entry.title}
                badge="Yours"
                meta={
                  [
                    entry.release_year,
                    entry.runtime_minutes ? `${entry.runtime_minutes} min` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Added by you"
                }
                sixWords={entry.six_words}
              >
                <Link
                  href={`/circle/send?title=${encodeURIComponent(entry.title)}${
                    entry.release_year ? `&year=${entry.release_year}` : ""
                  }${entry.runtime_minutes ? `&runtime=${entry.runtime_minutes}` : ""}`}
                  className={styles.link}
                >
                  Send under seal
                </Link>
              </Entry>
            ))}

            {filteredMine.map((item, index) => (
              <Entry
                key={`${item.kind}-${item.target_id}`}
                position={filteredEntries.length + index}
                id={item.target_id}
                revealed={item.revealed}
                title={item.title ?? "Sealed"}
                badge={WATCH_STATE_LABEL[item.watch_state]}
                sixWords={item.six_words}
              >
                {/*
                  A film the member has actually spoken about is a
                  record of what they felt, so the entry carries the way
                  back into the room as well as the way to pass it on.
                  Only for openings: a sealed recommendation is between
                  two people and has no room.
                */}
                {/*
                  Every Opening has a Room, not only tonight's and not
                  only the ones this member spoke in. With their six
                  words on record it opens; without, it is a way back to
                  the film to leave some — which is what unlocks it.
                */}
                {item.kind === "opening" &&
                  (item.six_words ? (
                    <Link href={`/room/${item.target_id}`} className={styles.link}>
                      Enter the room
                    </Link>
                  ) : (
                    <Link href={`/opening/${item.target_id}`} className={styles.link}>
                      The room is closed
                    </Link>
                  ))}
                {item.revealed && item.title && (
                  <Link
                    href={`/circle/send?title=${encodeURIComponent(item.title)}${
                      item.release_year ? `&year=${item.release_year}` : ""
                    }`}
                    className={styles.link}
                  >
                    Send under seal
                  </Link>
                )}
                {!item.revealed && item.kind === "opening" && (
                  <Link href="/tonight" className={styles.link}>
                    Open tonight&rsquo;s house
                  </Link>
                )}
                {!item.revealed && item.kind === "recommendation" && (
                  <Link href={`/circle/recommendation/${item.target_id}`} className={styles.link}>
                    Open the seal
                  </Link>
                )}
              </Entry>
            ))}
          </ul>
        </>
      )}

      {tab === "circle" && (
        <ul className={styles.activityList}>
          {circleActivity.length === 0 && <p className={styles.hint}>No Circle activity yet.</p>}
          {circleActivity.map((row, i) => (
            <li key={i} className={styles.activityRow}>
              <strong>{row.actor_display_name}</strong>{" "}
              {row.kind === "watched" ? "watched something" : "sent a film under seal"} in{" "}
              {row.circle_name}.
            </li>
          ))}
        </ul>
      )}

      {tab === "house" && (
        <>
          <Tally count={filteredHouse.length} sealed={houseSealed} noun="openings" />
          <ul className={styles.list}>
            {filteredHouse.length === 0 && <p className={styles.hint}>Nothing programmed yet.</p>}
            {filteredHouse.map((opening, index) => (
              <Entry
                key={opening.id}
                position={index}
                id={opening.id}
                revealed={opening.revealed}
                title={opening.title ?? `Opening ${opening.opening_number}`}
                badge={new Date(opening.opens_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              >
                {opening.revealed && opening.title && (
                  <Link
                    href={`/circle/send?title=${encodeURIComponent(opening.title)}${
                      opening.release_year ? `&year=${opening.release_year}` : ""
                    }&runtime=${opening.runtime_minutes}`}
                    className={styles.link}
                  >
                    Send under seal
                  </Link>
                )}
                {!opening.revealed && (
                  <p className={styles.sealedNote}>You never revealed this one.</p>
                )}
              </Entry>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * The catalogue's own line about itself.
 *
 * A collection says how big it is; a database makes you count. It also
 * gives the sealed entries somewhere to be acknowledged as a group
 * rather than only as gaps in a list.
 */
function Tally({
  count,
  sealed,
  noun = "films",
}: {
  count: number;
  sealed: number;
  noun?: string;
}) {
  if (count === 0) return null;
  return (
    <p className={styles.tally}>
      {count} {count === 1 ? noun.replace(/s$/, "") : noun}
      {sealed > 0 && <span className={styles.tallySealed}>{sealed} still sealed</span>}
    </p>
  );
}

/**
 * One entry in the catalogue.
 *
 * Numbered, ruled, and set as an index rather than boxed as a card:
 * the brief's Library reference is a collection of books, not a shop.
 * The number is the main thing that does it, and it is decorative
 * enough to be hidden from assistive technology, where "07" ahead of
 * every title would be noise.
 */
function Entry({
  position,
  id,
  revealed,
  title,
  badge,
  meta,
  sixWords,
  children,
}: {
  position: number;
  id: string;
  revealed: boolean;
  title: string;
  badge: string;
  meta?: string | null;
  sixWords?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={`${styles.entry} hd-stage`}
      data-revealed={revealed}
      // Capped so a long collection does not have its last entries
      // arriving seconds after its first.
      style={{ "--hd-stage-index": Math.min(position, 8) } as React.CSSProperties}
    >
      <span className={styles.index} aria-hidden="true">
        {String(position + 1).padStart(2, "0")}
      </span>
      <EntryField id={id} revealed={revealed} />
      <div className={styles.entryBody}>
        <span className={styles.badge}>{badge}</span>
        <span className={styles.title}>{title}</span>
        {meta && <p className={styles.meta}>{meta}</p>}

        {/* What the member felt, not just that they watched it. This is
            the difference between a list of films and a record. */}
        {sixWords && (
          <>
            <p className={styles.sixWordsLabel}>Your six words</p>
            <p className={styles.sixWords}>{sixWords}</p>
          </>
        )}

        <div className={styles.actions}>{children}</div>
      </div>
    </li>
  );
}

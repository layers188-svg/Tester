"use client";

import { useMemo, useState } from "react";
import type { CirclesActivityRow, HouseOpening, LibraryItem } from "@/lib/supabase/types";
import { NOTHING_UNDER_THAT_TITLE } from "@/lib/library/search";
import { AddFilmForm } from "./AddFilmForm";
import { LibraryArchive } from "./LibraryArchive";
import { EntryField } from "./EntryField";
import styles from "./LibraryTabs.module.css";

type Tab = "yours" | "circle" | "house";

export function LibraryTabs({
  mine,
  circleActivity,
  house,
}: {
  mine: LibraryItem[];
  circleActivity: CirclesActivityRow[];
  house: HouseOpening[];
}) {
  const [tab, setTab] = useState<Tab>("yours");
  const [query, setQuery] = useState("");

  // Search only ever matches items where `title` is populated, and the
  // safe RPCs behind this page only populate `title` for rows the
  // member has personally revealed — so this filter cannot surface a
  // sealed title (brief §7 Library rule 4-5). "Yours" has its own
  // search inside LibraryArchive, which also matches year and Opening
  // number.
  const filteredHouse = useMemo(() => {
    if (!query.trim()) return house;
    const q = query.trim().toLowerCase();
    return house.filter((item) => item.title?.toLowerCase().includes(q));
  }, [house, query]);

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

      {tab === "yours" && (
        <>
          <div className={styles.addRow}>
            <AddFilmForm />
          </div>
          <LibraryArchive items={mine} />
        </>
      )}

      {tab === "house" && (
        <input
          className={styles.search}
          placeholder="Search titles you've revealed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {tab === "circle" && (
        <ul className={styles.list}>
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
        <ul className={styles.list}>
          {filteredHouse.length === 0 && (
            <p className={styles.hint}>
              {query.trim().length > 0 ? NOTHING_UNDER_THAT_TITLE : "Nothing programmed yet."}
            </p>
          )}
          {filteredHouse.map((opening) => (
            <li key={opening.id} className={styles.card}>
              <EntryField id={opening.id} revealed={opening.revealed} />
              <div className={styles.cardBody}>
                <div className={styles.cardHead}>
                  <span>{opening.title ?? `Opening ${opening.opening_number}`}</span>
                  <span className={styles.badge}>
                    {new Date(opening.opens_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {!opening.revealed && <p className={styles.hint}>You never revealed this one.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

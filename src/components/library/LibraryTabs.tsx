"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CirclesActivityRow, HouseOpening, LibraryItem } from "@/lib/supabase/types";
import { WATCH_STATE_LABEL } from "@/lib/labels";
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
  // sealed title (brief §7 Library rule 4-5).
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

      {tab === "yours" && (
        <ul className={styles.list}>
          {filteredMine.length === 0 && <p className={styles.hint}>Nothing here yet.</p>}
          {filteredMine.map((item) => (
            <li key={`${item.kind}-${item.target_id}`} className={styles.card}>
              <EntryField id={item.target_id} revealed={item.revealed} />
              <div className={styles.cardBody}>
                <div className={styles.cardHead}>
                  <span>{item.title ?? "Sealed"}</span>
                  <span className={styles.badge}>{WATCH_STATE_LABEL[item.watch_state]}</span>
                </div>
                {item.six_words && (
                  <p className={styles.sixWords}>&ldquo;{item.six_words}&rdquo;</p>
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
              </div>
            </li>
          ))}
        </ul>
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
          {filteredHouse.length === 0 && <p className={styles.hint}>Nothing programmed yet.</p>}
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

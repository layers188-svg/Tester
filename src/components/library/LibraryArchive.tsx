"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LibraryItem } from "@/lib/supabase/types";
import { WATCH_STATE_LABEL } from "@/lib/labels";
import { NOTHING_UNDER_THAT_TITLE, searchLibrary } from "@/lib/library/search";
import { EntryField } from "./EntryField";
import styles from "./LibraryArchive.module.css";

/**
 * "Yours" — the member's own archive (handover §7, motion system §14).
 *
 * A record unfolds in place: the title stays where it is and grows,
 * the rows around it make room, the detail resolves after the title has
 * moved, and closing reverses it with the scroll position intact.
 * Explicitly not "a modal card floating above an unchanged list", which
 * is what a route change or a dialog would give.
 *
 * The scroll position is preserved by never taking the record out of
 * the list — it is the same <li>, still in document order, which grows.
 * Nothing is unmounted, so there is no scroll to restore.
 */

export function LibraryArchive({ items }: { items: LibraryItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => searchLibrary(items, query), [items, query]);

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await fetch("/api/library", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setOpenId(null);
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return (
    <div className={styles.archive}>
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a film in your Library"
          aria-label="Find a film in your Library"
        />
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {query.trim().length > 0 ? NOTHING_UNDER_THAT_TITLE : "Nothing in here yet."}
        </p>
      ) : (
        <ul className={styles.list} ref={listRef}>
          {filtered.map((item) => {
            const id = `${item.kind}-${item.target_id}`;
            const open = openId === id;
            return (
              <li key={id} className={styles.record} data-open={open}>
                <button
                  type="button"
                  className={styles.recordButton}
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : id)}
                >
                  <EntryField id={item.target_id} revealed={item.revealed} />
                  <span className={styles.recordText}>
                    <span className={styles.recordTitle}>
                      {item.title ??
                        (item.opening_number ? `Opening ${item.opening_number}` : "Sealed")}
                    </span>
                    <span className={styles.recordMeta}>
                      {[
                        item.release_year,
                        item.opening_number ? `Opening ${item.opening_number}` : null,
                        WATCH_STATE_LABEL[item.watch_state],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>

                {/*
                 * The detail is always in the tree so the record can
                 * grow into it rather than the row being replaced. It
                 * resolves after the title has finished moving.
                 */}
                <div className={styles.detail} hidden={!open}>
                  {item.six_words && <p className={styles.sixWords}>{item.six_words}</p>}

                  {!item.revealed && item.kind === "opening" && (
                    <p className={styles.sealedNote}>You never opened this one. It stays sealed.</p>
                  )}

                  <div className={styles.detailActions}>
                    {!item.revealed && item.kind === "opening" && (
                      <Link href="/tonight" className={styles.detailLink}>
                        Tonight
                      </Link>
                    )}
                    {!item.revealed && item.kind === "recommendation" && (
                      <Link
                        href={`/circle/recommendation/${item.target_id}`}
                        className={styles.detailLink}
                      >
                        Open the seal
                      </Link>
                    )}
                    {item.kind === "added" && (
                      <button
                        type="button"
                        className={styles.detailLink}
                        disabled={busy}
                        onClick={() => void remove(item.target_id)}
                      >
                        Remove from Library
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

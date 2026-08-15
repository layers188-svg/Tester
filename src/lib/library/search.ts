import type { LibraryItem } from "@/lib/supabase/types";

/**
 * Library search (handover 00_BUILD_BRIEF_FINAL.md §7).
 *
 *   title search filters instantly
 *   search title, year and Opening number where useful
 *   `Nothing under that title.` empty state
 *
 * Pure, and separate from the component, because the one property that
 * matters here cannot be eyeballed: a search must never surface a title
 * the member has not revealed. The safe RPCs only populate `title` for
 * rows the caller personally revealed, so matching on `title` alone
 * cannot leak — but "Opening 7" must also not become a way to ask
 * "which opening was Whiplash", so an unrevealed row matches on its
 * opening number and returns without a title, exactly as it renders.
 */

export interface LibrarySearchOptions {
  /** Digits-only queries are read as a year or an Opening number as well as text. */
  matchNumbers?: boolean;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesLibraryQuery(
  item: LibraryItem,
  rawQuery: string,
  options: LibrarySearchOptions = {},
): boolean {
  const query = normalise(rawQuery);
  if (query.length === 0) return true;

  const { matchNumbers = true } = options;

  if (item.title && normalise(item.title).includes(query)) return true;

  if (matchNumbers) {
    if (item.release_year !== null && String(item.release_year).includes(query)) return true;

    if (item.opening_number !== null) {
      // Both "7" and "opening 7" find Opening 7.
      const number = String(item.opening_number);
      if (number === query || `opening ${number}` === query) return true;
      if (query.startsWith("opening") && normalise(query.slice("opening".length)) === number) {
        return true;
      }
    }
  }

  return false;
}

export function searchLibrary(
  items: LibraryItem[],
  query: string,
  options?: LibrarySearchOptions,
): LibraryItem[] {
  if (query.trim().length === 0) return items;
  return items.filter((item) => matchesLibraryQuery(item, query, options));
}

/** The one empty state the handover specifies, word for word. */
export const NOTHING_UNDER_THAT_TITLE = "Nothing under that title.";

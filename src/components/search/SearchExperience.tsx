"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { MOTION, motionDuration, startViewTransition } from "@/lib/motion";
import type { FilmRecord, FilmSuggestion } from "@/lib/films/types";
import styles from "./SearchExperience.module.css";

type Stage = "searching" | "opening" | "film";

/**
 * Search: you choose, without spoiling it.
 *
 * One page in two states rather than two pages. Selecting a film does
 * not navigate anywhere — the results recede, the chosen title stays
 * where it is and the composition builds around it. That is the whole
 * reason this is a client component holding its own stage: a route
 * change would throw the title away and load it back, which is the
 * "click, page, click, page" feeling the motion work exists to remove.
 */
export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FilmSuggestion[]>([]);
  const [chosen, setChosen] = useState<FilmSuggestion | null>(null);
  const [record, setRecord] = useState<FilmRecord | null>(null);
  const [stage, setStage] = useState<Stage>("searching");
  const [error, setError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * The query the results on screen actually answer.
   *
   * Derived rather than a separate `searching` flag, which had to be
   * set synchronously inside the effect to avoid flashing "nothing
   * under that name" during the debounce. Comparing what was asked with
   * what has been answered says the same thing without the extra state.
   */
  const [settledQuery, setSettledQuery] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Autocomplete, debounced.
   *
   * 220ms: long enough that typing "portrait" is one request rather than
   * eight, short enough that the list feels like it is keeping up. Each
   * run aborts the one before it, so a slow early response cannot land
   * after a fast later one and show results for a query the member has
   * already moved on from.
   */
  useEffect(() => {
    if (stage !== "searching") return;

    const term = query.trim();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (term.length < 2) {
        setSuggestions([]);
        setSettledQuery(term);
        return;
      }

      void (async () => {
        try {
          const res = await fetch(`/api/search/films?q=${encodeURIComponent(term)}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("catalogue");
          const data = (await res.json()) as { results: FilmSuggestion[] };
          setSuggestions(data.results);
          setError(null);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setSuggestions([]);
          setError("The house could not reach its catalogue. Try again shortly.");
        } finally {
          setSettledQuery(term);
        }
      })();
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, stage]);

  const choose = useCallback(async (suggestion: FilmSuggestion) => {
    /*
     * The chosen title is the same object on both sides.
     *
     * `hd-search-title` is painted onto the row the member touched a
     * moment before the transition starts, and `.filmTitle` carries it
     * in CSS, so the browser moves and resizes one title into its new
     * position instead of collapsing a list and drawing a heading
     * somewhere else. The rows that were not chosen collapse as a
     * group, which is why `.results` is named too.
     */
    startViewTransition(() => {
      setChosen(suggestion);
      setRecord(null);
      setError(null);
      setSaved(false);
      setNotesOpen(false);
      // The results recede and the title holds while the house looks it
      // up. The hold is what makes the next state feel like the same
      // object continuing rather than a new screen arriving.
      setStage("opening");
    });

    try {
      const res = await fetch(
        `/api/search/film/${encodeURIComponent(suggestion.provider)}/${encodeURIComponent(
          suggestion.externalId,
        )}`,
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "The house could not open that one.");
      setRecord(payload as FilmRecord);
      setStage("film");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The house could not open that one.");
      setStage("film");
    }
  }, []);

  /** Back to the field, without a route change. Reversible by design. */
  const searchAgain = useCallback(() => {
    setStage("searching");
    setRecord(null);
    setChosen(null);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), motionDuration(MOTION.fast));
  }, []);

  /**
   * Save for later, confirmed rather than assumed.
   *
   * This used to flip the label to "Saved" before the request went out.
   * It read as instant and it was a lie: leaving the page cancels the
   * in-flight fetch, so a member could walk away believing a film was
   * in their Library while nothing had been written. Found by the
   * journey failing only under parallel load, which is exactly the
   * timing a slow phone reproduces.
   *
   * The button shows its loading rule until the row exists.
   */
  async function saveForLater() {
    if (!record || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/library-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: record.title,
          releaseYear: record.releaseYear,
          runtimeMinutes: record.runtimeMinutes,
          state: "saved",
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("The house could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------------
  // The film.
  // ------------------------------------------------------------------
  if (stage !== "searching" && chosen) {
    return (
      <section className={styles.film} data-stage={stage} aria-live="polite">
        <p className={styles.eyebrow}>Six words before the picture</p>

        <h1 className={styles.filmTitle}>{chosen.title}</h1>

        <p className={styles.facts}>
          {[chosen.releaseYear, record?.runtimeMinutes ? `${record.runtimeMinutes} min` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <span className={styles.rule} aria-hidden="true" />

        {stage === "opening" && <p className={styles.opening}>Searching the house</p>}

        {stage === "film" && error && <p className={styles.error}>{error}</p>}

        {stage === "film" && record && (
          <>
            {/*
              The six words arrive as one editorial thought. No
              typewriter, no word-by-word: this is a sentence somebody
              wrote, not a machine talking.
            */}
            <p className={styles.premise}>{record.sixWordPlot}</p>

            {record.territory.length > 0 && (
              <dl className={styles.orientation}>
                <div>
                  <dt>Territory</dt>
                  <dd>
                    <ul className={styles.territory}>
                      {record.territory.map((word) => (
                        <li key={word}>{word}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                {record.pace && (
                  <div>
                    <dt>Pace</dt>
                    <dd>{record.pace}</dd>
                  </div>
                )}
                {record.intensity && (
                  <div>
                    <dt>Intensity</dt>
                    <dd>{record.intensity}</dd>
                  </div>
                )}
              </dl>
            )}

            {record.contentNotes && (
              <div className={styles.notes}>
                <button
                  type="button"
                  className={styles.notesButton}
                  aria-expanded={notesOpen}
                  onClick={() => setNotesOpen((open) => !open)}
                >
                  Content notes
                </button>
                {notesOpen && <p className={styles.notesBody}>{record.contentNotes}</p>}
              </div>
            )}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={saveForLater}
                disabled={saved || saving}
                loading={saving}
              >
                {saved ? "Saved" : "Save for later"}
              </Button>
              <Button
                variant="secondary"
                href={`/circle/send?title=${encodeURIComponent(record.title)}${
                  record.releaseYear ? `&year=${record.releaseYear}` : ""
                }${record.runtimeMinutes ? `&runtime=${record.runtimeMinutes}` : ""}`}
              >
                Send under seal
              </Button>
            </div>
          </>
        )}

        <button type="button" className={styles.again} onClick={searchAgain}>
          Search again
        </button>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // The field.
  // ------------------------------------------------------------------
  return (
    <section className={styles.search}>
      <p className={styles.eyebrow}>Search</p>
      <h1 className={styles.heading}>Find a film.</h1>
      <p className={styles.lead}>Know enough to choose. Nothing more.</p>

      <div className={styles.field}>
        <label className="hd-visually-hidden" htmlFor="hd-search">
          Search any film
        </label>
        <input
          id="hd-search"
          ref={inputRef}
          className={styles.input}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any film"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls="hd-search-results"
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/*
        The results are a group, not a stagger. Responsiveness beats
        spectacle here: a member is scanning for a year, and a list that
        arrives one line at a time is a list they have to wait for.
      */}
      <ul className={styles.results} id="hd-search-results" data-visible={suggestions.length > 0}>
        {suggestions.map((suggestion) => (
          <li key={`${suggestion.provider}:${suggestion.externalId}`}>
            <button
              type="button"
              className={styles.result}
              onClick={(event) => {
                /*
                 * Painted here rather than in CSS because at the moment
                 * the browser captures the "before" state React has not
                 * yet been told which row was chosen. A direct write on
                 * the element the member just touched is synchronous
                 * and needs no cleanup: the row unmounts and takes the
                 * inline style with it.
                 */
                event.currentTarget
                  .querySelector<HTMLElement>("[data-result-title]")
                  ?.style.setProperty("view-transition-name", "hd-search-title");
                void choose(suggestion);
              }}
            >
              <span className={styles.resultTitle} data-result-title="">
                {suggestion.title}
              </span>
              <span className={styles.resultYear}>{suggestion.releaseYear ?? ""}</span>
            </button>
          </li>
        ))}
      </ul>

      {query.trim().length >= 2 &&
        settledQuery === query.trim() &&
        suggestions.length === 0 &&
        !error && <p className={styles.nothing}>Nothing under that name.</p>}

      <p className={styles.footnote}>
        House Dark gives you six words before. You give House Dark six words after.{" "}
        <Link href="/tonight" className={styles.footnoteLink}>
          Tonight
        </Link>
      </p>
    </section>
  );
}

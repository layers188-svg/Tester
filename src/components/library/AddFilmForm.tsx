"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateRecommendationNote } from "@/lib/validation/six-words";
import styles from "./AddFilmForm.module.css";

/**
 * Adding a film the house never programmed.
 *
 * The Library is the member's own collection, not a record of House
 * Dark, so anything they have watched belongs in it. These rows go to
 * `library_entries`, never to `films` — that table is the protected
 * side of the spoiler boundary and is not member-writable. See
 * migration 0018.
 *
 * Collapsed by default. An always-open form at the top of a collection
 * turns it into a data-entry screen, which is the opposite of what the
 * Library is for.
 */
export function AddFilmForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [runtime, setRuntime] = useState("");
  const [sixWords, setSixWords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const note = validateRecommendationNote(sixWords);
  const canSubmit = title.trim().length > 0 && note.valid && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/library-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          releaseYear: year ? Number(year) : null,
          runtimeMinutes: runtime ? Number(runtime) : null,
          sixWords: note.normalized || null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not add that film.");
      }
      setTitle("");
      setYear("");
      setRuntime("");
      setSixWords("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that film.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.opener} onClick={() => setOpen(true)}>
        Add a film you have watched
      </button>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Add a film</h2>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>

      <label className={styles.label} htmlFor="entryTitle">
        Film
      </label>
      <input
        id="entryTitle"
        className={styles.input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What did you watch?"
        maxLength={200}
        required
        autoFocus
      />

      <div className={styles.row}>
        <div className={styles.half}>
          <label className={styles.label} htmlFor="entryYear">
            Year
          </label>
          <input
            id="entryYear"
            className={styles.input}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="Optional"
          />
        </div>
        <div className={styles.half}>
          <label className={styles.label} htmlFor="entryRuntime">
            Minutes
          </label>
          <input
            id="entryRuntime"
            className={styles.input}
            value={runtime}
            onChange={(e) => setRuntime(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="Optional"
          />
        </div>
      </div>

      <label className={styles.label} htmlFor="entrySixWords">
        Six words, if you have them
      </label>
      <input
        id="entrySixWords"
        className={styles.input}
        value={sixWords}
        onChange={(e) => setSixWords(e.target.value)}
        placeholder="Optional"
        aria-invalid={note.valid ? undefined : true}
        aria-describedby="entry-note-hint"
      />
      <p
        className={note.valid ? styles.hint : styles.error}
        id="entry-note-hint"
        role={note.valid ? undefined : "alert"}
      >
        {note.valid ? "Six words or fewer." : note.error}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={!canSubmit}>
        {busy ? "Adding…" : "Add to Library"}
      </button>
    </form>
  );
}

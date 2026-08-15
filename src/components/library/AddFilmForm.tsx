"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import styles from "./AddFilmForm.module.css";

/**
 * "Add a watched film" (handover §7).
 *
 * The handover asks for this to come from a broad metadata catalogue.
 * No provider is configured — that needs an account and a server-side
 * key, which is an external action — so the member types the title and
 * year today. This form is the shape the catalogue will fill in: a
 * provider search would replace the two inputs and still POST the same
 * thing, so nothing downstream changes when it arrives.
 *
 * It is folded away until asked for. The Library is an archive to look
 * through, not a form to fill in.
 */
export function AddFilmForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          releaseYear: year ? Number(year) : null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not add that film.");
      }
      setTitle("");
      setYear("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      <label className={styles.label} htmlFor="addFilmTitle">
        Film
      </label>
      <input
        id="addFilmTitle"
        className={styles.input}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        autoFocus
      />

      <label className={styles.label} htmlFor="addFilmYear">
        Year (optional)
      </label>
      <input
        id="addFilmYear"
        className={styles.input}
        value={year}
        onChange={(event) => setYear(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={4}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={busy || title.trim().length === 0}>
          Add to Library
        </Button>
        <button type="button" className={styles.cancel} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

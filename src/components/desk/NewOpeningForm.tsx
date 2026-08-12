"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import styles from "./DeskForm.module.css";

export function NewOpeningForm() {
  const router = useRouter();
  const [filmTitle, setFilmTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("100");
  const [rightsNotes, setRightsNotes] = useState("");
  const [contentNotes, setContentNotes] = useState("");
  const [cues, setCues] = useState(["", "", ""]);
  const [minimumAccessType, setMinimumAccessType] = useState("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/desk/openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filmTitle,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          runtimeMinutes: Number(runtimeMinutes),
          rightsNotes: rightsNotes || null,
          contentNotes: contentNotes || null,
          cues: cues.filter(Boolean),
          minimumAccessType,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not create the opening.");
      const { id } = await res.json();
      router.push(`/desk/openings/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="filmTitle">
        Film title (internal — never shown before reveal)
      </label>
      <input
        id="filmTitle"
        className={styles.input}
        value={filmTitle}
        onChange={(e) => setFilmTitle(e.target.value)}
        required
      />

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="releaseYear">
            Release year
          </label>
          <input
            id="releaseYear"
            className={styles.input}
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={4}
          />
        </div>
        <div>
          <label className={styles.label} htmlFor="runtimeMinutes">
            Runtime (minutes)
          </label>
          <input
            id="runtimeMinutes"
            className={styles.input}
            value={runtimeMinutes}
            onChange={(e) => setRuntimeMinutes(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            required
          />
        </div>
      </div>

      <label className={styles.label} htmlFor="minimumAccessType">
        Access type
      </label>
      <select
        id="minimumAccessType"
        className={styles.select}
        value={minimumAccessType}
        onChange={(e) => setMinimumAccessType(e.target.value)}
      >
        <option value="unknown">Unknown / confirm later</option>
        <option value="subscription">Subscription</option>
        <option value="rental">Rental</option>
        <option value="free">Free</option>
        <option value="mixed">Mixed</option>
      </select>

      <label className={styles.label} htmlFor="rightsNotes">
        Rights notes (internal)
      </label>
      <textarea
        id="rightsNotes"
        className={styles.textarea}
        rows={2}
        value={rightsNotes}
        onChange={(e) => setRightsNotes(e.target.value)}
      />

      <label className={styles.label} htmlFor="contentNotes">
        Content notes (shown to members behind a tap)
      </label>
      <textarea
        id="contentNotes"
        className={styles.textarea}
        rows={2}
        value={contentNotes}
        onChange={(e) => setContentNotes(e.target.value)}
      />

      <span className={styles.label}>Safe cues (up to three, no spoilers)</span>
      <div className={styles.row}>
        {cues.map((cue, i) => (
          <input
            key={i}
            className={styles.input}
            value={cue}
            maxLength={24}
            onChange={(e) => {
              const next = [...cues];
              next[i] = e.target.value;
              setCues(next);
            }}
            placeholder={`Cue ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className={styles.error} id="new-opening-error" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={busy}
        aria-describedby={error ? "new-opening-error" : undefined}
      >
        {busy ? "Creating…" : "Create opening"}
      </Button>
    </form>
  );
}

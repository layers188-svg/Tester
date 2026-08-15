"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { countWords } from "@/lib/validation/six-words";
import styles from "./DeskForm.module.css";

/**
 * Writes a House record — the six words that go in front of a Trust Us
 * recommendation, and the territories it answers.
 *
 * Approving is a separate, deliberate tick rather than the default:
 * nothing reaches a member until an owner has read the line. §4 calls
 * for "editorial override is possible" and copy that stays stable
 * "until a new version is approved", and both of those need a human at
 * this point.
 */
export function HouseRecordForm() {
  const router = useRouter();
  const [filmTitle, setFilmTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("100");
  const [sixWordsBefore, setSixWordsBefore] = useState("");
  const [territories, setTerritories] = useState("");
  const [pace, setPace] = useState("");
  const [intensity, setIntensity] = useState("");
  const [approve, setApprove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const wordCount = countWords(sixWordsBefore);
  const territoryList = territories
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/desk/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filmTitle,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          runtimeMinutes: Number(runtimeMinutes),
          sixWordsBefore,
          territories: territoryList,
          pace: pace || null,
          intensity: intensity || null,
          approve,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save the record.");
      const data = await res.json();
      setSaved(
        data.editorial_approved_at
          ? `Saved as version ${data.version} and approved. It can be recommended now.`
          : `Saved as version ${data.version}, not approved. It will not be recommended yet.`,
      );
      setFilmTitle("");
      setReleaseYear("");
      setSixWordsBefore("");
      setTerritories("");
      setPace("");
      setIntensity("");
      setApprove(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="recordTitle">
        Film title
      </label>
      <input
        id="recordTitle"
        className={styles.input}
        value={filmTitle}
        onChange={(e) => setFilmTitle(e.target.value)}
        required
      />

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="recordYear">
            Release year
          </label>
          <input
            id="recordYear"
            className={styles.input}
            value={releaseYear}
            onChange={(e) => setReleaseYear(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className={styles.label} htmlFor="recordRuntime">
            Runtime (minutes)
          </label>
          <input
            id="recordRuntime"
            className={styles.input}
            value={runtimeMinutes}
            onChange={(e) => setRuntimeMinutes(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            required
          />
        </div>
      </div>

      <label className={styles.label} htmlFor="recordSixWords">
        Six words before the picture — exactly six, and nothing that spoils it
      </label>
      <input
        id="recordSixWords"
        className={styles.input}
        value={sixWordsBefore}
        onChange={(e) => setSixWordsBefore(e.target.value)}
        aria-describedby="recordSixWordsCount"
        required
      />
      <p id="recordSixWordsCount" className={styles.hint}>
        {wordCount} of 6
      </p>

      <label className={styles.label} htmlFor="recordTerritories">
        Territories, comma separated (Tension, Longing, Ambition…)
      </label>
      <input
        id="recordTerritories"
        className={styles.input}
        value={territories}
        onChange={(e) => setTerritories(e.target.value)}
        required
      />

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="recordPace">
            Pace
          </label>
          <input
            id="recordPace"
            className={styles.input}
            value={pace}
            onChange={(e) => setPace(e.target.value)}
          />
        </div>
        <div>
          <label className={styles.label} htmlFor="recordIntensity">
            Intensity
          </label>
          <input
            id="recordIntensity"
            className={styles.input}
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
          />
        </div>
      </div>

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
        <span>Approve for recommendation now</span>
      </label>

      {error && <p className={styles.error}>{error}</p>}
      {saved && <p className={styles.hint}>{saved}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={busy || wordCount !== 6 || territoryList.length === 0}
      >
        {busy ? "Saving…" : "Save record"}
      </Button>
    </form>
  );
}

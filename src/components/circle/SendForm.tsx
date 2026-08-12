"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { validateCues } from "@/lib/validation/cues";
import styles from "./SendForm.module.css";

interface Recipient {
  userId: string;
  displayName: string;
  circleNames: string[];
}

interface CircleOption {
  id: string;
  name: string;
}

export function SendForm({
  recipients,
  circles,
}: {
  recipients: Recipient[];
  circles: CircleOption[];
}) {
  const router = useRouter();
  const [filmTitle, setFilmTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("100");
  const [personalNote, setPersonalNote] = useState("");
  const [cues, setCues] = useState(["", "", ""]);
  const [selected, setSelected] = useState<string[]>([]);
  const [circleId, setCircleId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Brief §16 rule 3. One key per composed send, held in a ref so a
  // re-render does not change it: if the first attempt reached the
  // server but the response never came back, pressing send again
  // returns that same recommendation instead of despatching a second
  // one. The key is only replaced once a send has actually succeeded.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  function toggleRecipient(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cueValidation = validateCues(cues);
    if (!cueValidation.valid) {
      setError(cueValidation.error ?? "Check your cues.");
      return;
    }
    if (selected.length === 0) {
      setError("Choose at least one recipient.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filmTitle,
          releaseYear: releaseYear ? Number(releaseYear) : null,
          runtimeMinutes: Number(runtimeMinutes),
          recipientIds: selected,
          personalNote: personalNote || null,
          cues: cueValidation.cues,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          circleId: circleId || null,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not send that.");
      }
      idempotencyKey.current = crypto.randomUUID();
      setSent(true);
      setTimeout(() => {
        router.push("/circle");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className={styles.confirmation}>Sent under seal.</p>;
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="filmTitle">
        Film
      </label>
      <input
        id="filmTitle"
        className={styles.input}
        value={filmTitle}
        onChange={(e) => setFilmTitle(e.target.value)}
        required
        placeholder="What you're sending — kept sealed from recipients"
      />

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="releaseYear">
            Year (optional)
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
            Running time
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

      <label className={styles.label} htmlFor="personalNote">
        Your note
      </label>
      <textarea
        id="personalNote"
        className={styles.textarea}
        rows={3}
        value={personalNote}
        onChange={(e) => setPersonalNote(e.target.value)}
        placeholder="Why you're sending it — no spoilers"
      />

      <span className={styles.label}>Safe cues (up to three)</span>
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

      <span className={styles.label}>Recipients</span>
      {recipients.length === 0 ? (
        <p className={styles.hint}>
          Join or start a Circle first — recipients are chosen from people you share a Circle with.
        </p>
      ) : (
        <ul className={styles.recipientList}>
          {recipients.map((r) => (
            <li key={r.userId}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selected.includes(r.userId)}
                  onChange={() => toggleRecipient(r.userId)}
                />
                <span>
                  {r.displayName}
                  <span className={styles.circleTag}> · {r.circleNames.join(", ")}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {circles.length > 0 && (
        <>
          <label className={styles.label} htmlFor="circleId">
            Make it a Circle Opening (optional)
          </label>
          <select
            id="circleId"
            className={styles.input}
            value={circleId}
            onChange={(e) => setCircleId(e.target.value)}
          >
            <option value="">Not a shared screening</option>
            {circles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {circleId && (
            <>
              <label className={styles.label} htmlFor="scheduledFor">
                Screening time
              </label>
              <input
                id="scheduledFor"
                type="datetime-local"
                className={styles.input}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </>
          )}
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" variant="primary" fullWidth disabled={busy}>
        {busy ? "Sending…" : "Send under seal"}
      </Button>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { validateCues } from "@/lib/validation/cues";
import { validateRecommendationNote } from "@/lib/validation/six-words";
import { MOTION, motionDuration, startViewTransition } from "@/lib/motion";
import { SealMark } from "./SealMark";
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
  prefill,
}: {
  recipients: Recipient[];
  circles: CircleOption[];
  /** Starting values when arriving from a Library row. */
  prefill?: { title: string; releaseYear: string; runtimeMinutes: string };
}) {
  const router = useRouter();
  const [filmTitle, setFilmTitle] = useState(prefill?.title ?? "");
  const [releaseYear, setReleaseYear] = useState(prefill?.releaseYear ?? "");
  const [runtimeMinutes, setRuntimeMinutes] = useState(prefill?.runtimeMinutes || "100");
  const [personalNote, setPersonalNote] = useState("");
  const [cues, setCues] = useState(["", "", ""]);
  const [selected, setSelected] = useState<string[]>([]);
  const [circleId, setCircleId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const noteValidation = validateRecommendationNote(personalNote);
  /**
   * A sealed send cannot be taken back, and the whole point is that the
   * recipient sees very little. Showing the sender that little, exactly
   * as it will arrive, is the last chance to notice that a cue gives
   * the film away.
   */
  const [previewing, setPreviewing] = useState(false);

  // Hoisted out of the submit handler so the preview shows exactly the
  // cues that will be sent, rather than a second reading of the same
  // inputs that could drift from it.
  const cueValidation = validateCues(cues);

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
          personalNote: noteValidation.normalized || null,
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
      /*
       * The send closes rather than announcing itself.
       *
       * A line of text reading "Sent under seal." is a receipt: it tells
       * you the request succeeded and nothing about what happened to the
       * film. The form now contracts into the seal instead — the same
       * SealMark object the recipient will meet, drawn closed — and only
       * then says the words. The pause afterwards is the hold; it was
       * already here as a 900ms delay before the redirect, doing nothing
       * visible.
       */
      startViewTransition(() => setSent(true));
      setTimeout(
        () => {
          router.push("/circle");
          router.refresh();
        },
        motionDuration(MOTION.unseal + MOTION.holdLong),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <section className={styles.sentStage} aria-live="polite">
        {/*
          The same object the recipient will be handed, closed. Not an
          envelope, not a wax stamp, not a ticket: SealMark is two arcs
          and a rule, and `broken={false}` is it shut.
        */}
        <SealMark broken={false} className={styles.sentSeal} />
        <p className={styles.confirmation}>Sent under seal.</p>
      </section>
    );
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
        placeholder="What you're sending. Kept sealed from recipients"
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

      {/*
        Six words or fewer, not exactly six. A public review is a form
        with a fixed shape; this is one person telling another to trust
        them, where three words is a complete thought. Empty is allowed
        too — forcing words produces filler. The server checks the same
        rule with the same function.
      */}
      <label className={styles.label} htmlFor="personalNote">
        Give them just enough
      </label>
      <textarea
        id="personalNote"
        className={styles.textarea}
        rows={2}
        value={personalNote}
        onChange={(e) => setPersonalNote(e.target.value)}
        placeholder="Trust me on this one"
        aria-invalid={noteValidation.valid ? undefined : true}
        aria-describedby="note-hint"
      />
      <p
        className={noteValidation.valid ? styles.hint : styles.noteError}
        id="note-hint"
        role={noteValidation.valid ? undefined : "alert"}
      >
        {noteValidation.valid
          ? `Six words or fewer. ${noteValidation.wordCount} so far.`
          : noteValidation.error}
      </p>

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
          Join or start a Circle first. Recipients are chosen from people you share a Circle with.
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

      {/* Form-level: the message can come from the cues, the recipient
          list or the server, so it is announced and tied to the submit
          rather than to one field (brief §16 accessibility rule 8). */}
      {error && (
        <p className={styles.error} id="send-error" role="alert">
          {error}
        </p>
      )}

      {/*
        Preview before sending. A sealed send cannot be taken back, and
        the sender never otherwise sees what the recipient will get —
        which is the one place a cue that gives the film away would
        become obvious.
      */}
      {previewing && (
        <div className={styles.preview} aria-live="polite">
          <p className={styles.previewLabel}>As it arrives</p>
          <p className={styles.previewFrom}>You sent them a film under seal.</p>
          {noteValidation.normalized && (
            <p className={styles.previewNote}>{noteValidation.normalized}</p>
          )}
          <ul className={styles.previewCues}>
            {cueValidation.cues.length > 0 ? (
              cueValidation.cues.map((cue) => <li key={cue}>{cue}</li>)
            ) : (
              <li data-empty="true">No cues</li>
            )}
          </ul>
          <p className={styles.previewSeal}>Reveal the film</p>
          <p className={styles.previewNothing}>
            No title, no poster, no runtime until they choose to reveal it.
          </p>
        </div>
      )}

      {!previewing ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={!noteValidation.valid || selected.length === 0 || !filmTitle.trim()}
          onClick={() => setPreviewing(true)}
        >
          Preview the seal
        </Button>
      ) : (
        <>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={busy || !noteValidation.valid}
            aria-describedby={error ? "send-error" : undefined}
          >
            {busy ? "Sending…" : "Send under seal"}
          </Button>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setPreviewing(false)}
            disabled={busy}
          >
            Keep editing
          </button>
        </>
      )}
    </form>
  );
}

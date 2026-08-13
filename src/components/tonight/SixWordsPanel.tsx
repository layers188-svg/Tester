"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { countWords, validateSixWords, withinEditWindow } from "@/lib/validation/six-words";
import { Button } from "@/components/Button";
import styles from "./SixWordsPanel.module.css";

interface OwnReview {
  id: string;
  body: string;
  createdAt: string;
}

interface SixWordsPanelProps {
  target: { openingId: string } | { sealedRecommendationId: string };
  initialOwnReview: OwnReview | null;
  /**
   * Fired when the member publishes. After Credits opens off this
   * rather than a reload, so the room appears the moment they speak.
   */
  onPublished?: () => void;
}

interface OtherWord {
  id: string;
  body: string;
}

/**
 * Brief §7 "Six words": the member writes before seeing anyone else's
 * response. Others stay hidden until the member has their own on
 * record — enforced here in the UI and, independently, by
 * can_view_six_word_review in Postgres RLS (never trust the browser
 * alone for that boundary).
 */
export function SixWordsPanel({ target, initialOwnReview, onPublished }: SixWordsPanelProps) {
  const [own, setOwn] = useState(initialOwnReview);
  const [draft, setDraft] = useState(initialOwnReview?.body ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [others, setOthers] = useState<OtherWord[] | null>(null);

  const validation = validateSixWords(draft);
  const wordCount = countWords(draft);

  useEffect(() => {
    if (!own) return;
    let cancelled = false;
    async function loadOthers() {
      const supabase = getBrowserSupabase();
      let query = supabase
        .from("six_word_reviews")
        .select("id, body")
        .eq("moderation_state", "visible")
        .neq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");

      query =
        "openingId" in target
          ? query.eq("opening_id", target.openingId)
          : query.eq("sealed_recommendation_id", target.sealedRecommendationId);

      const { data } = await query;
      if (!cancelled) setOthers((data ?? []).map((row) => ({ id: row.id, body: row.body })));
    }
    void loadOthers();
    return () => {
      cancelled = true;
    };
  }, [own, target]);

  async function submit() {
    setError(null);
    if (!validation.valid) {
      setError(validation.error ?? "Not quite six words yet.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/six-words", {
        method: own ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: own?.id,
          body: validation.normalized,
          ...("openingId" in target
            ? { openingId: target.openingId }
            : { sealedRecommendationId: target.sealedRecommendationId }),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not save your six words.");
      }
      const saved = await res.json();
      setOwn({ id: saved.id, body: saved.body, createdAt: saved.created_at });
      onPublished?.();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!own) return;
    setBusy(true);
    try {
      await fetch(`/api/six-words/${own.id}`, { method: "DELETE" });
      setOwn(null);
      setDraft("");
      setOthers(null);
    } finally {
      setBusy(false);
    }
  }

  if (!own || editing) {
    return (
      <div className={styles.panel}>
        <h3>Six words</h3>
        <p className={styles.hint}>
          Write what you felt. Exactly six words. You will see it before anyone else&rsquo;s.
        </p>
        <label className="hd-visually-hidden" htmlFor="six-words">
          Your six words
        </label>
        <textarea
          id="six-words"
          className={styles.textarea}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Six words, exactly."
          aria-invalid={error ? true : undefined}
          // The count is part of the field's description, not decoration:
          // "exactly six" is the rule, so the running total has to be
          // reachable without sight (brief §16 accessibility rule 8).
          aria-describedby={error ? "six-words-count six-words-error" : "six-words-count"}
        />
        <div className={styles.meta}>
          <span id="six-words-count">{wordCount} / 6 words</span>
          {error && (
            <span className={styles.error} id="six-words-error" role="alert">
              {error}
            </span>
          )}
        </div>
        <Button variant="primary" onClick={submit} disabled={busy || !validation.valid}>
          {busy ? "Saving…" : "Leave your six words"}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <h3>Your six words</h3>
      <p className={styles.ownWord}>&ldquo;{own.body}&rdquo;</p>
      <div className={styles.ownActions}>
        {withinEditWindow(own.createdAt) && (
          <button type="button" className={styles.linkButton} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button type="button" className={styles.linkButton} onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>

      <div className={styles.afterCredits}>
        <h3>After Credits</h3>
        {others === null ? (
          <p className={styles.hint}>Loading the conversation…</p>
        ) : others.length === 0 ? (
          <p className={styles.hint}>Nobody else has spoken yet. You are first.</p>
        ) : (
          <ul className={styles.words}>
            {others.map((word) => (
              <li key={word.id}>&ldquo;{word.body}&rdquo;</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

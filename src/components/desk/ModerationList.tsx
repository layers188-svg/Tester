"use client";

import { useState } from "react";
import { MODERATION_STATE_LABEL, REVIEW_VISIBILITY_LABEL } from "@/lib/labels";
import styles from "./ModerationList.module.css";

interface Review {
  id: string;
  body: string;
  moderation_state: "visible" | "hidden" | "removed";
  visibility: "private" | "circle" | "house_approved";
  created_at: string;
}

export function ModerationList({ reviews: initial }: { reviews: Review[] }) {
  const [reviews, setReviews] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, patch: Record<string, string>) {
    setBusy(id);
    await fetch(`/api/desk/moderation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...toReviewPatch(patch) } : r)));
    setBusy(null);
  }

  return (
    <ul className={styles.list}>
      {reviews.map((r) => (
        <li key={r.id} className={styles.card}>
          <p className={styles.body}>&ldquo;{r.body}&rdquo;</p>
          <p className={styles.meta}>
            {REVIEW_VISIBILITY_LABEL[r.visibility]} · {MODERATION_STATE_LABEL[r.moderation_state]} ·{" "}
            {new Date(r.created_at).toLocaleDateString()}
          </p>
          <div className={styles.actions}>
            {r.moderation_state !== "hidden" && (
              <button
                disabled={busy === r.id}
                onClick={() => update(r.id, { moderationState: "hidden" })}
              >
                Hide
              </button>
            )}
            {r.moderation_state !== "visible" && (
              <button
                disabled={busy === r.id}
                onClick={() => update(r.id, { moderationState: "visible" })}
              >
                Unhide
              </button>
            )}
            {r.moderation_state !== "removed" && (
              <button
                disabled={busy === r.id}
                onClick={() => update(r.id, { moderationState: "removed" })}
              >
                Remove
              </button>
            )}
            {r.visibility !== "house_approved" && (
              <button
                disabled={busy === r.id}
                onClick={() => update(r.id, { visibility: "house_approved" })}
              >
                Approve for public site
              </button>
            )}
            {r.visibility === "house_approved" && (
              <button
                disabled={busy === r.id}
                onClick={() => update(r.id, { visibility: "circle" })}
              >
                Unapprove
              </button>
            )}
          </div>
        </li>
      ))}
      {reviews.length === 0 && <p>No reviews yet.</p>}
    </ul>
  );
}

function toReviewPatch(patch: Record<string, string>): Partial<Review> {
  const out: Partial<Review> = {};
  if (patch.moderationState)
    out.moderation_state = patch.moderationState as Review["moderation_state"];
  if (patch.visibility) out.visibility = patch.visibility as Review["visibility"];
  return out;
}

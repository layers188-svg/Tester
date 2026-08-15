"use client";

import { useCallback, useRef, useState } from "react";
import type { TrustUsRecommendation, TrustUsTerritory } from "@/lib/supabase/types";
import { useReducedMotion } from "@/lib/motion/reduced-motion";
import styles from "./TrustUs.module.css";

/**
 * Trust Us (handover 00_BUILD_BRIEF_FINAL.md §4, 01_MOTION_SYSTEM.md §12).
 *
 * The member gives the House a territory. The House gives them one
 * film. There is no list on this screen at any point, including between
 * states — "SEEN IT must not send the member back to a list", so the
 * current recommendation scrubs laterally out of the field and the next
 * one enters from the same direction, and the member never passes
 * through a chooser.
 *
 * TRUST US does the opposite of what a product normally does with an
 * accepted recommendation: it closes information down. No synopsis, no
 * cast, no poster, no reviews, no trailer — just
 * `THAT'S ALL YOU GET. GO IN BLIND.`
 */

type Stage = "territory" | "recommendation" | "accepted" | "exhausted";

export function TrustUs({ territories }: { territories: TrustUsTerritory[] }) {
  const reducedMotion = useReducedMotion();

  const [stage, setStage] = useState<Stage>("territory");
  const [territory, setTerritory] = useState<TrustUsTerritory | null>(null);
  const [recommendation, setRecommendation] = useState<TrustUsRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Non-null while the outgoing recommendation is still leaving the field. */
  const [leaving, setLeaving] = useState<TrustUsRecommendation | null>(null);

  const scrubTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = useCallback(
    async (forTerritory: string, respondTo?: { filmId: string; response: "seen" | "trusted" }) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/trust-us", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ territory: forTerritory, respondTo }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error ?? "The House could not answer that.");
        }
        const data = (await res.json()) as {
          recommendation: TrustUsRecommendation | null;
          accepted: boolean;
        };

        if (data.accepted) {
          setStage("accepted");
          return;
        }
        if (!data.recommendation) {
          setRecommendation(null);
          setStage("exhausted");
          return;
        }
        setRecommendation(data.recommendation);
        setStage("recommendation");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  function chooseTerritory(value: TrustUsTerritory) {
    setTerritory(value);
    void ask(value.slug);
  }

  function seenIt() {
    if (!recommendation || !territory) return;
    // The outgoing film keeps rendering while it scrubs out of frame,
    // so the member watches it leave rather than seeing it disappear.
    setLeaving(recommendation);
    if (scrubTimer.current) clearTimeout(scrubTimer.current);
    scrubTimer.current = setTimeout(() => setLeaving(null), reducedMotion ? 0 : 520);
    void ask(territory.slug, { filmId: recommendation.film_id, response: "seen" });
  }

  function trustUs() {
    if (!recommendation || !territory) return;
    void ask(territory.slug, { filmId: recommendation.film_id, response: "trusted" });
  }

  function changeTerritory() {
    setStage("territory");
    setRecommendation(null);
    setLeaving(null);
    setTerritory(null);
    setError(null);
  }

  if (stage === "territory") {
    return (
      <div className={styles.stage} data-stage="territory">
        <p className={styles.eyebrow}>Trust us</p>
        <h1 className={styles.question}>What are you in the mood for?</h1>
        <p className={styles.lead}>Give us the territory. We&rsquo;ll choose the film.</p>

        {territories.length === 0 ? (
          <p className={styles.note}>
            The House has no territories open yet. Nothing here is a placeholder — this fills as the
            House writes its records.
          </p>
        ) : (
          <ul className={styles.territories}>
            {territories.map((value) => (
              <li key={value.slug}>
                <button
                  type="button"
                  className={styles.territory}
                  disabled={busy}
                  onClick={() => chooseTerritory(value)}
                >
                  <span className={styles.territoryLabel}>{value.label}</span>
                  <span className={styles.territoryPrompt}>{value.prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (stage === "accepted") {
    return (
      <div className={styles.stage} data-stage="accepted">
        <div className={styles.sealed}>
          <p className={styles.allYouGet}>That&rsquo;s all you get.</p>
          <p className={styles.goBlind}>Go in blind.</p>
        </div>
        <button type="button" className={styles.quietAction} onClick={changeTerritory}>
          Ask for something else
        </button>
      </div>
    );
  }

  if (stage === "exhausted") {
    return (
      <div className={styles.stage} data-stage="exhausted">
        <p className={styles.eyebrow}>{territory?.label}</p>
        <h1 className={styles.question}>That is everything we have there.</h1>
        <p className={styles.lead}>Try another territory.</p>
        <button type="button" className={styles.quietAction} onClick={changeTerritory}>
          Change the territory
        </button>
      </div>
    );
  }

  return (
    <div className={styles.stage} data-stage="recommendation">
      <div className={styles.chosenTerritory}>
        <span className={styles.eyebrow}>{territory?.label}</span>
        <button type="button" className={styles.quietAction} onClick={changeTerritory}>
          Change
        </button>
      </div>

      <div className={styles.field}>
        {/* The film that is on its way out, still on screen. */}
        {leaving && (
          <article className={styles.card} data-leaving="true" aria-hidden="true">
            <p className={styles.recommends}>House Dark recommends</p>
            <p className={styles.title}>{leaving.title}</p>
            {leaving.release_year && <p className={styles.year}>{leaving.release_year}</p>}
            <p className={styles.sixWordsLabel}>Six words before the picture</p>
            <p className={styles.sixWords}>{leaving.six_words_before}</p>
          </article>
        )}

        {recommendation && (
          <article className={styles.card} key={recommendation.film_id} data-entering="true">
            <p className={styles.recommends}>House Dark recommends</p>
            <p className={styles.title}>{recommendation.title}</p>
            {recommendation.release_year && (
              <p className={styles.year}>{recommendation.release_year}</p>
            )}
            <p className={styles.sixWordsLabel}>Six words before the picture</p>
            <p className={styles.sixWords}>{recommendation.six_words_before}</p>
          </article>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.trust} onClick={trustUs} disabled={busy}>
          Trust us
        </button>
        <button type="button" className={styles.seen} onClick={seenIt} disabled={busy}>
          Seen it
        </button>
      </div>
    </div>
  );
}

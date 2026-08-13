import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { SealedOpeningDemo } from "@/components/marketing/SealedOpeningDemo";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getClientEnv } from "@/lib/env";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "House Dark — a private picture house",
};

// No per-user data, so this stays a cacheable page (brief §16) while
// still picking up newly approved six words and tonight's number.
export const revalidate = 300;

/**
 * The public demo asset. A copy of an original House Dark No Trailer,
 * held under a stable name so clearing the preview seed cannot break
 * the home page. Public-read bucket, and the object name says nothing.
 */
function demoSrc(): string {
  return `${getClientEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/no-trailer/public-demo.mp4`;
}

/**
 * Tonight's opening *number* — never its title, and nothing that
 * narrows it down. `get_house_openings` is authenticated-only, so this
 * uses the count of openings that have run, which is public-safe.
 */
async function getOpeningNumber(): Promise<number | null> {
  try {
    const supabase = getAnonSupabase();
    const { data } = await supabase.rpc("get_public_opening_number");
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}

async function getHouseWords(): Promise<string[]> {
  try {
    const supabase = getAnonSupabase();
    const { data } = await supabase.rpc("get_house_words", { p_limit: 6 });
    if (data && data.length > 0) return data.map((row) => row.body);
  } catch {
    // No approved responses yet — the section shows the mechanic
    // instead. It never shows invented ones.
  }
  return [];
}

export default async function HomePage() {
  const [openingNumber, words] = await Promise.all([getOpeningNumber(), getHouseWords()]);

  return (
    <>
      {/* Scene 1 — the sealed opening ------------------------------- */}
      <section className={`${styles.scene} ${styles.hero}`}>
        <div className={styles.heroCopy}>
          <p className={styles.programmeLine}>One film each night. Title sealed.</p>
          <h1>The best film experiences happen when you know nothing.</h1>
          <p className={styles.heroSub}>
            Trailers give away the plot. Reviews tell you how to feel. House Dark lets the film go
            first.
          </p>
          <div className={styles.heroActions}>
            <Button href="/join" variant="primary">
              Enter tonight
            </Button>
            <Button href="/how-it-works" variant="secondary">
              How the house works
            </Button>
          </div>
        </div>
        <div className={styles.heroDemo}>
          <SealedOpeningDemo openingNumber={openingNumber} src={demoSrc()} />
        </div>
      </section>

      {/* Scene 2 — three beats, on paper ---------------------------- */}
      <section className={styles.paper}>
        <div className={styles.paperInner}>
          <h2 className={styles.paperStatement}>A film arrives without an explanation.</h2>
          <ol className={styles.beats}>
            <li>
              <span className={styles.beatLabel}>Feel it</span>
              <p className={styles.beatBody}>Ten original seconds. Mood only.</p>
            </li>
            <li>
              <span className={styles.beatLabel}>Enter it</span>
              <p className={styles.beatBody}>You choose when the title appears.</p>
            </li>
            <li>
              <span className={styles.beatLabel}>Talk after</span>
              <p className={styles.beatBody}>Six words unlock the room.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Scene 3 — send under seal ---------------------------------- */}
      <section className={`${styles.scene} ${styles.seal}`}>
        <div className={styles.sealCopy}>
          <h2>A recommendation used to be simple: trust me on this one.</h2>
          <p>
            Send a film under seal. Your friend gets your note and three safe cues. The title waits
            until they enter.
          </p>
          <Button href="/join" variant="secondary">
            Send one under seal
          </Button>
        </div>

        {/* A product state, not a mock-up of a person. No name, no
            avatar, no invented note — those would be fabricated social
            proof, which this product does not use. */}
        <div className={styles.sealCard}>
          <p className={styles.sealFrom}>A friend sent you a film.</p>
          <div className={styles.sealNote}>
            <span className={styles.sealNoteLabel}>Their note</span>
            <span className={styles.sealNoteBody}>Waiting for you inside.</span>
          </div>
          <ul className={styles.cues}>
            <li>Cue</li>
            <li>Cue</li>
            <li>Cue</li>
          </ul>
          <p className={styles.sealSeal} aria-hidden="true">
            HD
          </p>
          <p className={styles.sealAction}>Enter under seal</p>
        </div>
      </section>

      {/* Scene 4 — six words ---------------------------------------- */}
      <section className={`${styles.scene} ${styles.sixWords}`}>
        <h2>No stars. No scores. Six words after the credits.</h2>
        <p className={styles.sixLead}>Write yours before you read theirs.</p>

        {words.length > 0 ? (
          <ul className={styles.words}>
            {words.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        ) : (
          // Six empty positions rather than invented responses. The
          // mechanic is the demonstration; real member words replace
          // this the moment any are approved.
          <ol className={styles.slots} aria-label="Six word positions, empty until members write">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <li key={n}>
                <span className={styles.slotRule} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Scene 5 — the house has people in it ----------------------- */}
      {/*
        Deliberately not a section yet. The review asks for this as a
        content slot to be filled only when real material exists, and an
        empty framed box on a live page is exactly the "unfinished"
        impression the review objected to. It arrives with the footage.
      */}

      {/* Scene 6 — the invitation ----------------------------------- */}
      <section className={styles.invitation}>
        <p className={styles.houseSeal} aria-hidden="true">
          HD
        </p>
        <h2>The house is open.</h2>
        <p className={styles.invitationSub}>Come in knowing nothing.</p>
        <Button href="/join" variant="primary">
          Enter tonight
        </Button>
      </section>
    </>
  );
}

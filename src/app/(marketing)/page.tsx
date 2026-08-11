import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { getAnonSupabase } from "@/lib/supabase/anon";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "House Dark — a private picture house",
};

// Revalidate periodically rather than per-request — this page has no
// per-user data, so it can stay a fast, cacheable page (brief §16
// performance target) while still picking up newly approved six words.
export const revalidate = 300;

// Approved beta-demonstration six words, used only until enough real,
// moderator-approved member responses exist (brief §6 section 4: "must
// be real or clearly marked beta demonstration content").
const FALLBACK_WORDS = [
  "Watched alone. Wanted you there.",
  "I did not see that coming.",
  "Quiet film. Loud following silence after.",
  "Called her the second the credits started.",
];

async function getHouseWords(): Promise<{ words: string[]; isDemo: boolean }> {
  try {
    const supabase = getAnonSupabase();
    const { data } = await supabase.rpc("get_house_words", { p_limit: 6 });
    if (data && data.length > 0) {
      return { words: data.map((row) => row.body), isDemo: false };
    }
  } catch {
    // No live project in this environment yet — fall through to the
    // clearly labelled demonstration set below.
  }
  return { words: FALLBACK_WORDS, isDemo: true };
}

export default async function HomePage() {
  const { words, isDemo } = await getHouseWords();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroField} aria-hidden="true">
          {/* Real seed-night photography or the original No Trailer field
              belongs here (brief §2, §6). No stock or generated imagery. */}
        </div>
        <div className={styles.heroContent}>
          <h1>The best film experiences happen when you know nothing.</h1>
          <p className={styles.heroSub}>
            Trailers show the plot. Reviews tell you how to feel. House Dark lets the film go first.
          </p>
          <div className={styles.heroActions}>
            <Button href="/join" variant="primary">
              Enter tonight
            </Button>
            <Button href="/how-it-works" variant="secondary">
              See how it works
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>The ritual</h2>
        <ol className={styles.ritual}>
          <li>
            <span className={styles.ritualNumber}>01</span>
            <div>
              <h3>Receive the feeling.</h3>
              <p>A short, original No Trailer gives you the emotional temperature. No plot.</p>
            </div>
          </li>
          <li>
            <span className={styles.ritualNumber}>02</span>
            <div>
              <h3>Choose to enter.</h3>
              <p>You dim the house yourself. The title reveals only after you decide.</p>
            </div>
          </li>
          <li>
            <span className={styles.ritualNumber}>03</span>
            <div>
              <h3>Speak after the credits.</h3>
              <p>Leave six words. The conversation opens once you have watched.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2>Trust people, not percentages.</h2>
        <p className={styles.sectionLead}>
          Send a film to a friend under seal. They see your note and a few safe cues, never the
          title, never a poster. Circles can hold a shared opening together, Thursday at 8pm to
          start.
        </p>
        <div className={styles.captureSlot} aria-hidden="true">
          {/* Real product capture of a sealed recommendation on a phone
              belongs here once available. */}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Six words</h2>
        {isDemo && (
          <p className={styles.demoLabel}>Beta demonstration responses — not real members yet.</p>
        )}
        <ul className={styles.words}>
          {words.map((word) => (
            <li key={word}>&ldquo;{word}&rdquo;</li>
          ))}
        </ul>
      </section>

      <section className={styles.invitation}>
        <h2>House Dark is open.</h2>
        <Button href="/join" variant="primary">
          Hold a seat
        </Button>
      </section>
    </>
  );
}

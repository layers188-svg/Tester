import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Why" };

/**
 * The mission, for members who are already inside.
 *
 * Deliberately not a fifth tab — brief §5 fixes the navigation at
 * Tonight, Circle, Library, You, and this does not need to be one tap
 * from everywhere. It is reached from You, where a member goes when
 * they are thinking about the house rather than tonight's film.
 *
 * It also does not repeat /how-it-works, which is the public page and
 * explains the mechanics. This one only answers "why does this exist",
 * which is the question a member has *after* they have used it once.
 */
export default function WhyPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>The house</p>
      <h1>Why House Dark exists</h1>

      <p className={styles.lead}>
        One film, a few friends, nobody knows. Everything here follows from that sentence.
      </p>

      <section>
        <h2>Choosing has become the work</h2>
        <p>
          An evening that was meant to be spent watching something is spent deciding what to watch
          instead. Scrolling a wall of artwork, reading half a synopsis, opening a second service,
          giving up. The film was never the problem. The choosing was.
        </p>
        <p>
          So House Dark makes exactly one choice a night, and a person makes it. Not a model, not a
          ranking, not what is trending. One film, chosen because someone thought it was worth your
          evening.
        </p>
      </section>

      <section>
        <h2>Knowing less is the point</h2>
        <p>
          A trailer today will show you the turn, the joke and the ending in ninety seconds. By the
          time you press play you have already seen the film in miniature and know how it resolves.
        </p>
        <p>
          A No Trailer gives you a temperature instead of a summary: a short, original piece of film
          that carries how tonight will feel and nothing about what happens. No title, no poster, no
          plot. You decide whether to reveal the name, and you can watch the whole thing without
          ever doing so.
        </p>
      </section>

      <section>
        <h2>Nobody watches together any more</h2>
        <p>
          Everyone watches everything, separately, at a different time, and there is nothing left to
          say about it afterwards. The shared evening, the one where the whole room saw the same
          thing on the same night, quietly disappeared.
        </p>
        <p>
          Tonight&rsquo;s opening is the same film for everyone in the house. Your Circle can hold
          it together. And the conversation only opens once you have left your own six words, so
          nobody arrives having already read what to think.
        </p>
      </section>

      <section>
        <h2>Six words, not a review</h2>
        <p>
          A star rating flattens a film into a number and a long review turns watching into
          homework. Six words is enough to say something true and too short to perform in. It is
          also the only thing that unlocks everyone else&rsquo;s.
        </p>
      </section>

      <section>
        <h2>What this is not</h2>
        <p>
          Not a streaming service. House Dark does not own or host a single frame, and never will.
          Not a catalogue to browse, a ratings database, a recommendation engine, or a feed that
          never ends. There is no algorithm here to feed and nothing to scroll.
        </p>
        <p>
          If a night&rsquo;s film is not for you, the right answer is to close the app and go to
          bed. That is a feature.
        </p>
      </section>

      <section>
        <h2>Under seal, between friends</h2>
        <p>
          The other half of the house is quieter: you send one film to one person, sealed. They see
          who it came from, why you sent it, and up to three safe words. They choose when to open
          it. It is closer to lending someone a book than to sharing a link.
        </p>
      </section>

      <section className={styles.close}>
        <p>
          House Dark is a Founding Beta. It is small on purpose, and it will stay small for a while.
        </p>
        <p className={styles.links}>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/film-rights">Film rights</Link>
          <Link href="/you">Back to Me</Link>
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { Button } from "@/components/Button";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "How it works",
  description: "How House Dark's nightly opening and sealed recommendations work.",
};

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <h1>How it works</h1>
      <p className={styles.lead}>No posters. No plot. No star rating. Just a feeling, a choice, and a conversation that starts after the credits.</p>

      <section>
        <h2>1. Receive the feeling</h2>
        <p>
          Each night House Dark presents one human chosen film. Before you know anything about
          it, you see a short, original No Trailer &mdash; an emotional temperature, not a
          summary. Alongside it: the running time, how many verified legal places you can watch
          it, and any content notes, tucked behind their own tap.
        </p>
      </section>

      <section>
        <h2>2. Choose to enter</h2>
        <p>
          Nothing plays until you dim the house yourself. That is a deliberate, physical-feeling
          gesture, not an autoplay. After the No Trailer finishes, you decide whether to reveal
          the title. Only then does the film&rsquo;s name appear, along with verified legal
          services where you can watch it. House Dark never hosts or streams the film itself.
        </p>
      </section>

      <section>
        <h2>3. Speak after the credits</h2>
        <p>
          Once you mark the film watched, you write six words &mdash; before you can see anyone
          else&rsquo;s. That is what unlocks the conversation: your six words open everyone
          else&rsquo;s.
        </p>
      </section>

      <section>
        <h2>Sending a film under seal</h2>
        <p>
          A friend can send you a film directly. You will see who sent it, a short personal note,
          and up to three safe cues &mdash; never the title, never a poster. You choose when to
          reveal it, exactly like a nightly opening.
        </p>
      </section>

      <section>
        <h2>Circles</h2>
        <p>
          Private groups of friends can hold a shared opening together. Thursday at 8pm is the
          starting ritual, though any Circle can change it. Circle activity shows what was
          watched or sent &mdash; never a sealed title.
        </p>
      </section>

      <section>
        <Button href="/join" variant="primary">
          Hold a seat
        </Button>
      </section>
    </div>
  );
}

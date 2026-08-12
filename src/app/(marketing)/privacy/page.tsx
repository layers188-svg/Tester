import type { Metadata } from "next";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <h1>Privacy</h1>
      <p className={styles.updated}>
        Draft — pending Australian legal review before a broad public launch (brief §14).
      </p>

      <section>
        <h2>What we collect</h2>
        <p>
          Your email, display name, city and timezone if you provide them, your Circle memberships,
          what you have watched or saved, your six word responses, and your email and reminder
          preferences. We store only what the service needs to run (brief §14).
        </p>
        <p>
          We also record a small set of usage events — that a sign in finished, that an opening was
          viewed, dimmed, revealed, saved or marked watched, and so on. These are counted to
          understand how the beta is used. They are stored in our own database: there is no third
          party analytics service, no advertising network and no analytics cookie. An event never
          includes a film title, a provider link, a personal note or the words you wrote.
        </p>
      </section>

      <section>
        <h2>What we do not do</h2>
        <ul>
          <li>We do not upload or access your device contacts.</li>
          <li>We do not sell your personal data.</li>
          <li>We do not use third party analytics, advertising or tracking cookies.</li>
          <li>We do not show your watch history or reviews publicly by default.</li>
        </ul>
      </section>

      <section>
        <h2>Marketing email</h2>
        <p>
          Sign in is separate from marketing consent. We only send editorial notes if you opt in
          with an unchecked box, and every editorial email includes an unsubscribe link. You can
          withdraw consent any time from <a href="/you">the You page</a> once signed in.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can export your personal data and delete your account and its associated content from
          the You page at any time. Administrative access to member data is recorded in a safe audit
          log that never stores film titles or other spoiler information.
        </p>
      </section>

      <section>
        <h2>Who we share data with</h2>
        <p>
          We use Supabase for authentication, database and storage, and Resend to deliver email.
          Both act as data processors under their own security commitments. We do not share your
          data with film studios, advertisers or data brokers.
        </p>
      </section>
    </div>
  );
}

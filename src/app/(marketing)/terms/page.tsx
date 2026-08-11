import type { Metadata } from "next";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <h1>Terms</h1>
      <p className={styles.updated}>
        Draft — pending Australian legal review before a broad public launch (brief §14).
      </p>

      <section>
        <h2>What House Dark is</h2>
        <p>
          House Dark is a Founding Beta: a free, invitation friendly service that introduces one
          human chosen film each night and lets friends send films to one another under seal.
          There is no payment, subscription or trial clock in this release.
        </p>
      </section>

      <section>
        <h2>What House Dark is not</h2>
        <p>
          House Dark does not own, license, host, stream, sell or distribute the feature films it
          introduces. Rights in each film remain with the relevant rights holders. House Dark
          provides an original, spoiler safe introduction and, after reveal, may link to verified
          legal services where the film can be watched. See{" "}
          <a href="/film-rights">Film rights and service disclaimer</a>.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You sign in with a one time email code. Keep access to your email secure — anyone with
          a valid code can sign in as you. You are responsible for what you send to your Circle.
        </p>
      </section>

      <section>
        <h2>Your words</h2>
        <p>
          Your six word responses and any notes you write remain yours. By posting them within
          House Dark you grant House Dark a limited licence to display them according to the
          visibility you choose (private, your Circle, or, only with separate approval, on the
          public site as a beta demonstration). You can delete a review at any time.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not use House Dark to distribute unauthorised copies of any film.</li>
          <li>Do not send abusive, spoiler filled, or spam content to other members.</li>
          <li>House Dark may remove content or suspend accounts that break these terms.</li>
        </ul>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          This is a beta product and these terms may change as the product does. Material changes
          will be communicated before they take effect.
        </p>
      </section>
    </div>
  );
}

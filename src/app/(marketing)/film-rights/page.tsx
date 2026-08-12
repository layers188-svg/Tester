import type { Metadata } from "next";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Film rights and service disclaimer",
};

export default function FilmRightsPage() {
  return (
    <div className={styles.page}>
      <h1>Film rights and service disclaimer</h1>
      <p className={styles.updated}>Reviewed for Australian law. Last updated 12 August 2026.</p>

      <section>
        <p className={styles.lead}>
          House Dark does not own, license, host, stream, sell or distribute the feature films it
          introduces. Rights in each film remain with the relevant rights holders. House Dark
          provides an original spoiler safe introduction and, after reveal, may link to verified
          legal services where the film can be watched.
        </p>
      </section>

      <section>
        <h2>No Trailers are original</h2>
        <p>
          Every No Trailer uses original or properly licensed material only. We do not use film
          posters, studio stills, copyrighted trailers, protected music, studio logos or actor
          likeness in a No Trailer.
        </p>
      </section>

      <section>
        <h2>Provider links</h2>
        <p>
          After you reveal a film, we may show the names of verified legal services where it is
          available. These names identify availability only — they do not imply a partnership or
          endorsement between House Dark and that service. If a link only reaches a provider detail
          page rather than direct playback, we say so.
        </p>
      </section>

      <section>
        <h2>Reporting a concern</h2>
        <p>
          If you are a rights holder with a concern about a No Trailer or a provider link, contact
          House Dark and we will review it promptly.
        </p>
      </section>
    </div>
  );
}

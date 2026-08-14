import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/SearchExperience";
import styles from "./page.module.css";

/**
 * Search: you choose without spoiling it.
 *
 * A fifth destination alongside Tonight, Circle, Library and Me. It
 * does not replace any of them — Tonight is still the house choosing,
 * Circle is still someone you trust choosing. This is the case the
 * product had no answer for: you already know the name of a film and
 * do not want to Google it, because Google will tell you the ending
 * on the way past.
 *
 * Dynamic, and never prefetched into a static artefact: it renders
 * nothing sensitive itself, but everything it shows comes from a
 * signed-in request.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div className={styles.page}>
      <SearchExperience />
    </div>
  );
}

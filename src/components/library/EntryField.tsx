import { entryField } from "@/lib/library/field";
import styles from "./EntryField.module.css";

/**
 * The flat palette block beside a Library entry. Never an image, never
 * a poster, never a person (brief rule 8, guidelines "WHAT WE AVOID").
 * A sealed entry renders an empty frame instead, so an unrevealed row
 * reads as withheld rather than decorated.
 */
export function EntryField({ id, revealed }: { id: string; revealed: boolean }) {
  const field = entryField(id, revealed);

  if (!field) {
    return <div className={styles.sealed} aria-hidden="true" />;
  }

  return (
    <div className={styles.field} style={{ background: field.colour }} aria-hidden="true">
      <span className={styles.band} style={{ top: `${field.bandAt}%` }} />
    </div>
  );
}

import type { ReactNode } from "react";
import styles from "./StatusScreen.module.css";

/**
 * The house's voice when something is missing, broken or still
 * arriving. Shared by every error boundary, 404 and empty state so
 * those moments read like House Dark rather than like a framework.
 *
 * Spoiler note: this component takes only fixed copy the caller wrote.
 * It deliberately offers no way to pass an exception through — see
 * `src/app/error.tsx` for why an error message must never reach the
 * screen (brief §11: error messages are on the list of places a title
 * must not appear).
 */
export function StatusScreen({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.screen}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}

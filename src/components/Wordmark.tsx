import styles from "./Wordmark.module.css";

/**
 * The approved wordmark, set as text.
 *
 * The artwork is `public/brand/wordmark.svg` (and `-inverse` for dark
 * grounds) — that pair is the source of record. It is reproduced in
 * type here rather than embedded as an image because the SVG sets the
 * wordmark in `<text>`, and an SVG carries no font: as an `<img>` or a
 * favicon it renders in whatever serif the client has, which is not
 * Newsreader and does not look like the identity. Newsreader is
 * self-hosted for the page, so setting it as text is the one way the
 * real letterforms actually appear — and it stays selectable, scalable
 * and legible to a screen reader as "House Dark".
 *
 * The HD monogram is paths rather than text, so it has no such problem
 * and is used directly for the app icon (`public/brand/mark.svg`).
 */
export function Wordmark({ tag = "span" }: { tag?: "span" | "h1" }) {
  const Tag = tag;
  return (
    <Tag className={styles.wordmark}>
      House <span className={styles.dark}>Dark</span>
    </Tag>
  );
}

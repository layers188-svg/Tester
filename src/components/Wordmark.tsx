import styles from "./Wordmark.module.css";

/**
 * Text-set wordmark. Brief §8: "Use the approved House Dark wordmark
 * and intertwined HD ligature. Do not redraw the identity unless the
 * supplied source asset is technically unusable." No logo source file
 * exists in this environment (brief §23 item 5) — this typographic
 * placeholder stands in until Logan supplies it. Swap the mark in
 * public/brand/ and this component together; nothing else references
 * the visual identity directly.
 */
export function Wordmark({ tag = "span" }: { tag?: "span" | "h1" }) {
  const Tag = tag;
  return (
    <Tag className={styles.wordmark}>
      House <span className={styles.dark}>Dark</span>
    </Tag>
  );
}

import styles from "./SealMark.module.css";

/**
 * The seal on a film sent under seal.
 *
 * An original House Dark object: a ring in two arcs with a rule across
 * its centre line. It is geometry, not artwork borrowed from anywhere,
 * and it says nothing about which film is underneath it — which is the
 * whole requirement. There is no poster here to withhold because there
 * was never a poster.
 *
 * The same element renders both states. That matters more than it
 * looks: SEAL and UNSEAL are supposed to read as one object changing,
 * and swapping a closed graphic for an open one would make them two
 * pictures shown in sequence. The arcs part, the rule draws through
 * the gap, and it is visibly the same seal that was there before.
 */
export function SealMark({ broken, className }: { broken: boolean; className?: string }) {
  return (
    <svg
      className={[styles.seal, className].filter(Boolean).join(" ")}
      data-broken={broken}
      viewBox="0 0 48 48"
      width="48"
      height="48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className={styles.arcTop} d="M5 24a19 19 0 0 1 38 0" stroke="currentColor" />
      <path className={styles.arcBottom} d="M43 24a19 19 0 0 1-38 0" stroke="currentColor" />
      <path className={styles.rule} d="M5 24h38" stroke="currentColor" />
    </svg>
  );
}

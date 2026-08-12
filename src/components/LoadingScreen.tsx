import styles from "./LoadingScreen.module.css";

/**
 * The loading state every signed-in screen streams behind (brief §16
 * resilience rule 1).
 *
 * It says nothing about what is arriving. On Tonight in particular the
 * pending content is a sealed opening, so a skeleton shaped like its
 * eventual contents would start describing it before the member has
 * dimmed anything.
 */
export function LoadingScreen({ label = "Opening" }: { label?: string }) {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <p className={styles.label}>{label}</p>
      <div className={styles.rule} />
      <span className="hd-visually-hidden">Loading.</span>
    </div>
  );
}

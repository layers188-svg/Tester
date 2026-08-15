import styles from "./Wordmark.module.css";

/**
 * The approved House Dark identity, from
 * `public/brand/House_Dark_Wordmark_Inverse.svg` (handover
 * `brand_assets/`, design system "Approved identity": never rebuild the
 * wordmark or monogram from font characters).
 *
 * The approved file draws the wordmark as two <text> runs set in
 * Newsreader rather than as outlined paths. An SVG loaded through
 * <img> cannot reach the page's webfonts, so referencing the file that
 * way would silently substitute a generic serif — the identity would
 * be wrong in exactly the place it matters most. Inlining the same
 * markup keeps the approved geometry (viewBox, both baselines, size,
 * letter-spacing, DARK in italic) and lets the app's own self-hosted
 * Newsreader render it.
 *
 * If outlined-path versions of the wordmark are ever supplied, swap
 * the markup here for a single <img> and delete the font dependency —
 * nothing else in the app draws the identity.
 */
export function Wordmark({
  tag = "span",
  label = "House Dark",
}: {
  tag?: "span" | "h1";
  label?: string;
}) {
  const Tag = tag;
  return (
    <Tag className={styles.wordmark}>
      <svg
        className={styles.svg}
        viewBox="0 0 1800 420"
        role="img"
        aria-label={label}
        focusable="false"
      >
        <g fill="currentColor">
          <text x="70" y="285" className={styles.house}>
            HOUSE
          </text>
          <text x="910" y="285" className={styles.dark}>
            DARK
          </text>
        </g>
      </svg>
    </Tag>
  );
}

/**
 * The approved HD monogram (`House_Dark_HD_Monogram_Approved_Inverse.svg`).
 * True vector paths, so this one is reproduced exactly — including the
 * oxblood registration rule beneath it.
 */
export function Monogram({ label = "House Dark" }: { label?: string }) {
  return (
    <svg
      className={styles.monogram}
      viewBox="0 0 1000 1200"
      role="img"
      aria-label={label}
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="round">
        <path d="M555 165 L555 925" strokeWidth="24" />
        <path d="M505 165 L605 165" strokeWidth="13" />
        <path d="M505 925 L605 925" strokeWidth="13" />
        <path d="M330 315 L330 760" strokeWidth="24" />
        <path d="M290 315 L370 315" strokeWidth="13" />
        <path d="M290 760 L370 760" strokeWidth="13" />
        <path d="M330 535 L555 535" strokeWidth="24" />
        <path d="M555 300 C705 315, 790 405, 790 540 C790 675, 705 765, 555 780" strokeWidth="24" />
      </g>
      <line
        x1="480"
        y1="1040"
        x2="630"
        y2="1040"
        stroke="var(--hd-oxblood)"
        strokeWidth="12"
        strokeLinecap="square"
      />
    </svg>
  );
}

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
        viewBox="0 0 1835 420"
        role="img"
        aria-label={label}
        focusable="false"
      >
        {/*
         * One text run with a tspan, rather than the approved file's two
         * absolutely positioned runs.
         *
         * That file places HOUSE at x=70 and DARK at x=910, which are
         * correct for Newsreader at `opsz 72` — a variable-font axis.
         * next/font serves static instances, where those axes do not
         * exist, and HOUSE sets ~905 units wide instead: the two words
         * collide and the mark reads "HOUSEDARK". Hardcoding new x
         * positions would only move the collision to whichever weight
         * or fallback loads next.
         *
         * Letting the browser set a real word space keeps the words
         * apart in any instance and in the serif fallback, and preserves
         * what the file actually specifies — Newsreader 260, HOUSE
         * upright, DARK italic, from the same x=70/y=285 origin. The
         * viewBox is widened to 1835 to fit the resulting metrics with
         * the approved file's 70-unit left margin mirrored on the right.
         */}
        <text x="70" y="285" className={styles.house} fill="currentColor">
          HOUSE<tspan className={styles.dark}> DARK</tspan>
        </text>
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

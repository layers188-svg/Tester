import localFont from "next/font/local";

/**
 * Self-hosted, from files committed to this repository.
 *
 * Brief §8 says "Self host the font files". `next/font/google` already
 * satisfied that at runtime — it downloads the faces at build time and
 * serves them from this origin, with no request to Google from a
 * member's browser. What it did not do was make the *build* independent
 * of Google: every build re-fetched the CSS and the woff2 files, and a
 * build is not self-hosted if it fails when someone else's CDN does.
 *
 * It did fail. Commit e11255a ran twice on GitHub Actions — the same SHA,
 * once for the push event and once for the pull_request event — and one
 * of the two died with "Can't resolve
 * '@vercel/turbopack-next/internal/font/google/font'" while resolving
 * Newsreader. Identical code, opposite results, which is the definition
 * of a flake and would have taken a deploy down just as easily as a
 * check. Vendoring the files removes the network from the build
 * entirely: same faces, same subset, same weights, now deterministic.
 *
 * The files are the latin subset Google serves, fetched once from the
 * same URLs `next/font/google` would have used. Licence: both families
 * are SIL Open Font License 1.1 — see `public/fonts/OFL.txt`, which
 * covers redistribution of these binaries.
 *
 * Refresh them with `scripts/vendor-fonts.mjs`.
 */

/**
 * Newsreader ships as a variable font, so one file covers 400–600 and a
 * second covers the italics. Declaring it three times would have been
 * three copies of one 58 KB file — the download proved it: 400, 500 and
 * 600 came back byte-identical.
 */
export const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader.woff2", weight: "400 600", style: "normal" },
    { path: "../fonts/newsreader-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
});

/** Barlow Condensed ships static instances, so each weight is its own file. */
export const barlowCondensed = localFont({
  src: [
    { path: "../fonts/barlow-condensed-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/barlow-condensed-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-condensed-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/barlow-condensed-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  fallback: ["Arial Narrow", "Arial", "sans-serif"],
});

/**
 * Body copy.
 *
 * Everything used to be set in Barlow Condensed, including paragraphs —
 * `body { font-family: var(--hd-font-utility) }`. The 13 August review
 * called it cramped and it was right: a condensed face is for labels,
 * numbers and buttons, not for reading. Condensed keeps those jobs.
 */
export const barlow = localFont({
  src: [
    { path: "../fonts/barlow-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/barlow-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/barlow-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-barlow",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

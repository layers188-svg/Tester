#!/usr/bin/env node
/**
 * Re-download the self-hosted faces in `src/fonts/`.
 *
 * The build does not use this — the woff2 files are committed, and that
 * is the point (see the note at the top of `src/app/fonts.ts`). Run it
 * by hand when a weight is added, a family changes, or Google ships a
 * new version of one of these faces.
 *
 *   node scripts/vendor-fonts.mjs
 *
 * It asks Google Fonts for the same CSS `next/font/google` would have
 * asked for, keeps only the `latin` subset blocks — matching the
 * `subsets: ["latin"]` the previous declarations used — and writes one
 * file per distinct binary. Byte-identical weights are written once:
 * Newsreader is a variable font, so its 400, 500 and 600 are the same
 * file, and shipping three copies would be 116 KB of duplicate.
 *
 * It overwrites nothing until every download has succeeded, so a failure
 * halfway through leaves the committed files alone rather than half
 * replacing them.
 */

import { mkdtemp, writeFile, readFile, rm, mkdir, readdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "fonts");

// Google serves a different CSS to browsers it does not recognise, and
// the woff2 blocks only appear for a modern one.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const FAMILIES = [
  {
    query: "Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600",
    stem: "newsreader",
    faces: [
      ...[400, 500, 600].map((weight) => ({ style: "normal", weight })),
      ...[400, 500, 600].map((weight) => ({ style: "italic", weight })),
    ],
  },
  {
    query: "Barlow+Condensed:wght@400;500;600;700",
    stem: "barlow-condensed",
    faces: [400, 500, 600, 700].map((weight) => ({ style: "normal", weight })),
  },
  {
    query: "Barlow:wght@400;500;600",
    stem: "barlow",
    faces: [400, 500, 600].map((weight) => ({ style: "normal", weight })),
  },
];

async function getText(url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
}

/** Every @font-face in the CSS, tagged with the subset comment above it. */
function parseFaces(css) {
  const parts = css.split(/\/\*\s*([a-z0-9-]+)\s*\*\//);
  const faces = [];
  for (let i = 1; i < parts.length - 1; i += 2) {
    const subset = parts[i];
    const body = parts[i + 1];
    const style = /font-style:\s*(\w+)/.exec(body);
    const weight = /font-weight:\s*(\d+)/.exec(body);
    const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(body);
    if (style && weight && url) {
      faces.push({ subset, style: style[1], weight: Number(weight[1]), url: url[1] });
    }
  }
  return faces;
}

const staged = await mkdtemp(join(tmpdir(), "hd-fonts-"));
try {
  /** @type {Map<string, string>} sha256 -> staged filename */
  const byHash = new Map();
  const written = [];

  for (const { query, stem, faces: wanted } of FAMILIES) {
    const css = await getText(`https://fonts.googleapis.com/css2?family=${query}&display=swap`);
    const available = parseFaces(css).filter((face) => face.subset === "latin");

    for (const { style, weight } of wanted) {
      const match = available.find((face) => face.style === style && face.weight === weight);
      if (!match) throw new Error(`No latin ${style} ${weight} in ${query}`);

      const response = await fetch(match.url, { headers: { "User-Agent": UA } });
      if (!response.ok) throw new Error(`${response.status} for ${match.url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      // A truncated or error-page "font" is worse than a failed run,
      // because it commits and renders as tofu much later.
      if (bytes.length < 1024) throw new Error(`Suspiciously small download for ${match.url}`);

      const hash = createHash("sha256").update(bytes).digest("hex");
      if (byHash.has(hash)) {
        console.log(
          `${stem} ${style} ${weight} — same bytes as ${byHash.get(hash)}, not duplicated`,
        );
        continue;
      }

      // Newsreader is variable and collapses to one binary per style, so
      // a weight in its filename would be a lie. The static families keep
      // theirs, because there each weight really is a separate file.
      const italic = style === "italic" ? "-italic" : "";
      const name =
        stem === "newsreader" ? `${stem}${italic}.woff2` : `${stem}-${weight}${italic}.woff2`;

      await writeFile(join(staged, name), bytes);
      byHash.set(hash, name);
      written.push({ name, bytes: bytes.length });
    }
  }

  // Everything downloaded. Only now touch the real directory.
  await mkdir(OUT, { recursive: true });
  for (const existing of await readdir(OUT)) {
    if (existing.endsWith(".woff2")) await unlink(join(OUT, existing));
  }
  for (const { name } of written) {
    await writeFile(join(OUT, name), await readFile(join(staged, name)));
  }

  for (const { name, bytes } of written) {
    console.log(`${name.padEnd(30)} ${bytes.toLocaleString().padStart(8)} bytes`);
  }
  console.log(`\n${written.length} files written to src/fonts/`);
} finally {
  await rm(staged, { recursive: true, force: true });
}

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nothing a member can reach may read a table that holds a title.
 *
 * The brief asks for an audit of every route for pre-reveal title
 * exposure. An audit is a person reading files once; this is the same
 * audit expressed so it runs on every commit, which is the only version
 * that survives the next feature.
 *
 * It is a source-level test on purpose. The end-to-end spoiler suite
 * fetches real pages and greps the response, which is stronger evidence
 * but skips itself without a live Supabase project — so on a machine
 * with no database, the check that matters most is the one that stops
 * running. This one needs nothing but the repository.
 *
 * The rule is about *reads of protected tables*, not about the word
 * "title". Guarding rendered output would be the mistake the house
 * already documented: the detector matches substrings, so a film called
 * `It` matches `initial-scale` and `Us` matches `House`.
 */

const PROTECTED_TABLES = ["films", "opening_secrets", "playback_destinations"];

/**
 * Where reading a title is the job rather than a leak.
 *
 * - `desk` is owner-only and is the surface that programmes the film.
 * - `api/reveal` is the one path from sealed to revealed. It records the
 *   reveal server-side first and only then returns the title.
 * - `lib/email` renders the nightly mail on the server, guarded by
 *   assertSafeEmailData.
 * - `supabase/types.ts` is generated type declarations, not a query.
 */
const ALLOWED = [
  "src/app/desk/",
  "src/app/api/desk/",
  "src/app/api/reveal/",
  "src/lib/desk/",
  "src/lib/email/",
  "src/lib/supabase/types.ts",
];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, found);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

describe("no member-facing code reads a table that holds a title", () => {
  const files = sourceFiles("src").filter(
    (path) => !ALLOWED.some((prefix) => path.startsWith(prefix)),
  );

  it("finds a meaningful number of files to check", () => {
    // Guards the guard. A refactor that moved or renamed `src` would
    // otherwise leave this suite passing over an empty list.
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(PROTECTED_TABLES)("no unexpected file queries %s", (table) => {
    const offenders = files.filter((path) => {
      const source = readFileSync(path, "utf8");
      return (
        source.includes(`from("${table}")`) ||
        source.includes(`from('${table}')`) ||
        source.includes(`.from(\`${table}\`)`)
      );
    });

    expect(
      offenders,
      `${table} is owner/service-role only. If one of these genuinely needs it, ` +
        `it belongs behind the reveal route or the Desk, not added to the allow list.`,
    ).toEqual([]);
  });
});

describe("the safe projection cannot carry a title", () => {
  const source = readFileSync("src/lib/opening/queries.ts", "utf8");

  it("never joins a protected table", () => {
    for (const table of PROTECTED_TABLES) {
      expect(source).not.toContain(`from("${table}")`);
    }
  });

  /**
   * The projection is built field by field in `attachCues` rather than
   * spread from the row, which is what makes it a projection instead of
   * a filter. If someone replaces it with `...opening`, every future
   * column on `openings` reaches the browser automatically.
   */
  it("builds its fields explicitly rather than spreading the row", () => {
    expect(source).not.toMatch(/\.\.\.opening\b/);
  });
});

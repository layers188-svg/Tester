import { existsSync, readFileSync } from "node:fs";

/**
 * Loads `.env.local` into `process.env`.
 *
 * Next does this for the app, but Playwright's own Node process gets no
 * such treatment — so the global setup read an empty
 * NEXT_PUBLIC_SUPABASE_URL, concluded no project was configured, and
 * returned without minting anything. The journeys then skipped
 * themselves for want of a session, reporting a tidy "13 skipped" while
 * a perfectly good project sat there unused.
 *
 * Real values already in the environment win, so a run can still point
 * at a different project by exporting them.
 */
export function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

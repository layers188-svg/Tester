#!/usr/bin/env node
/**
 * House Dark — smoke test against a hosted Supabase project.
 *
 *   npm run smoke:remote
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY from the environment (or .env.local).
 *
 * This covers the one combination nothing else does. `npm run test:rls`
 * proves the policies behave, but against a throwaway Postgres with a
 * compatibility shim standing in for Supabase. `scripts/verify-remote.sql`
 * proves the schema is present, but by reading the catalogue as a
 * superuser. Neither exercises what the browser actually does: an anon
 * key, over HTTPS, through PostgREST, with RLS deciding.
 *
 * It reads only. It creates nothing and writes nothing, so it is safe
 * against the real project — which is the point, since the real project
 * is the one worth checking.
 */

import { readFileSync, existsSync } from "node:fs";

// --- environment ------------------------------------------------------

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !anonKey || url.includes("localdev.supabase.co")) {
  console.error(
    "No hosted project configured.\n" +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "(SUPABASE_SERVICE_ROLE_KEY too, for the owner-side checks).",
  );
  process.exit(2);
}

// --- tiny harness -----------------------------------------------------

const results = [];
const record = (name, passed, detail) => results.push({ name, passed, detail });

async function rest(path, key) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty or non-JSON body is fine — status is what matters */
  }
  return { status: res.status, body };
}

/**
 * RLS filters rows rather than raising, so "closed" means an empty
 * array just as often as it means an error. Both count; a row does not.
 *
 * 401 deliberately does NOT count. A rejected key never reaches a
 * policy, so treating it as "closed" would report every spoiler check
 * green on a project whose tables were wide open — the one false pass
 * this script must never produce.
 */
function isClosed({ status, body }) {
  if (status === 200) return Array.isArray(body) && body.length === 0;
  return status === 403 || status === 404;
}

// --- checks -----------------------------------------------------------

const PROTECTED = ["films", "opening_secrets", "playback_destinations", "analytics_events"];

console.log(`\nHouse Dark — smoke test against ${url}\n`);

// 1. The anon key reaches PostgREST, and is actually accepted. Every
//    check below is meaningless if it is not.
const probe = await rest("openings?select=id&limit=1", anonKey);
const anonAccepted = probe.status !== 401;

record("anon key reaches PostgREST", probe.status > 0, `HTTP ${probe.status}`);
record(
  "anon key is accepted",
  anonAccepted,
  anonAccepted ? `HTTP ${probe.status}` : (probe.body?.message ?? "HTTP 401"),
);

// 2. The tables that carry a film's identity must be unreachable with
//    the key that ships in the browser bundle. This is brief §11's
//    whole premise, checked against the real project.
for (const table of PROTECTED) {
  if (!anonAccepted) {
    record(`anon cannot read ${table}`, false, "inconclusive — the anon key was rejected");
    continue;
  }
  const res = await rest(`${table}?select=*&limit=1`, anonKey);
  record(
    `anon cannot read ${table}`,
    isClosed(res),
    res.status === 200 ? `returned ${res.body?.length ?? "?"} row(s)` : `HTTP ${res.status}`,
  );
}

// 3. No title may reach an anonymous caller through any readable table.
//    A leak here would be invisible to a schema check.
if (anonAccepted) {
  const res = await rest("openings?select=*&limit=50", anonKey);
  const text = JSON.stringify(res.body ?? "");
  record(
    "anon sees no title-shaped field on openings",
    res.status === 200 && !/"title"|"film_id"|"secret_film_id"/.test(text),
    res.status === 200 ? `HTTP 200, ${text.length} bytes` : `HTTP ${res.status}`,
  );
} else {
  record("anon sees no title-shaped field on openings", false, "inconclusive — key rejected");
}

// 4. Owner-side checks: prove the schema really is there, and that the
//    service key works, without which nothing server-side runs.
if (serviceKey) {
  for (const table of PROTECTED) {
    const res = await rest(`${table}?select=*&limit=1`, serviceKey);
    record(`service role can read ${table}`, res.status === 200, `HTTP ${res.status}`);
  }

  const buckets = await fetch(`${url}/storage/v1/bucket`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const bucketBody = buckets.ok ? await buckets.json() : [];
  const names = Array.isArray(bucketBody) ? bucketBody.map((b) => b.name ?? b.id) : [];
  record(
    "storage buckets exist",
    names.includes("no-trailer") && names.includes("avatars"),
    names.length ? names.join(", ") : `HTTP ${buckets.status}`,
  );
} else {
  console.log("  (skipping owner-side checks — no SUPABASE_SERVICE_ROLE_KEY)\n");
}

// 5. Email sign-in has to be on, or /join cannot send anything.
{
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  const settings = res.ok ? await res.json() : null;
  record(
    "email sign-in is enabled",
    Boolean(settings?.external?.email),
    settings ? `external.email=${settings?.external?.email}` : `HTTP ${res.status}`,
  );
}

// --- report -----------------------------------------------------------

const width = Math.max(...results.map((r) => r.name.length));
for (const { name, passed, detail } of results) {
  console.log(`  ${passed ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${detail}`);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n  ${results.length - failed.length} passed, ${failed.length} failed\n`);
process.exit(failed.length === 0 ? 0 : 1);

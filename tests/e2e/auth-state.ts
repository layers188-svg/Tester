import path from "node:path";

/**
 * Where the global setup writes the signed-in browser states, and the
 * personas it writes them for.
 *
 * These files hold real session cookies. They are gitignored and
 * regenerated on every run — never commit one, and never point a run at
 * a project you care about (see global-setup.ts).
 */
export const AUTH_DIR = path.join(process.cwd(), "tests", "e2e", ".auth");

export const PERSONAS = {
  /** In ADMIN_EMAILS, so this one reaches the Programming Desk. */
  owner: "owner",
  /** An ordinary member: the one most journeys run as. */
  member: "member",
  /** A second member, for anything needing two people in a Circle. */
  friend: "friend",
} as const;

export type Persona = (typeof PERSONAS)[keyof typeof PERSONAS];

export function storageStateFor(persona: Persona): string {
  return path.join(AUTH_DIR, `${persona}.json`);
}

/**
 * Addresses the setup creates. The prefix is deliberate: it makes every
 * account this suite invents obvious in an auth table at a glance, and
 * gives the teardown something unambiguous to match on.
 */
export function emailFor(persona: Persona): string {
  return `e2e-${persona}@housedark.test`;
}

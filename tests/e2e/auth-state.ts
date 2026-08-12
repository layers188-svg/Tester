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
  /**
   * Deleted by the account-deletion journey, which is the point. It has
   * its own persona because that journey destroys the account it runs
   * as, and files run in parallel — sharing `member` would pull the
   * ground out from under whatever else was mid-flight.
   */
  expendable: "expendable",
} as const;

export type Persona = (typeof PERSONAS)[keyof typeof PERSONAS];

/**
 * Ids of the accounts this run created, written by the setup.
 *
 * The teardown cannot always look them up: the account-deletion journey
 * deletes its own persona, and the audit row that records the deletion
 * outlives it with a null actor. Without the id written down there is
 * nothing left to match that row on.
 */
export const PERSONA_IDS_FILE = path.join(AUTH_DIR, "persona-ids.json");

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

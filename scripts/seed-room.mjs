/**
 * Room fixture: ten voices in tonight's Room, so it can be designed.
 *
 * The Room has been reviewed three times against an empty database and
 * has said "You're first in." every time. A room of people who disagree
 * is the entire product, and it cannot be judged — typography, density,
 * scroll, Circle versus House, the Home preview — from an empty state.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS NOT
 *
 * These are not people, and they are not written as people. CLAUDE.md
 * rule 5 forbids generating people, reviews or social proof, and that
 * rule exists because a plausible human name attached to a plausible
 * opinion is indistinguishable from a real member to anyone looking at
 * the screen — including, eventually, to us.
 *
 * So every account here is named for what it is: "Fixture 01", "Fixture
 * 02". Nobody reading a screenshot can mistake those for members, and
 * nobody can quote one back as evidence that people liked something.
 * The responses are written to exercise the layout — short ones, long
 * ones, one-word ones — not to simulate a reception.
 *
 * It refuses to run against a project it has not been told is
 * disposable, for the same reason the e2e suite does: brief §18 forbids
 * demonstration people from ever reaching production, and a seed that
 * quietly invented ten members in the real project would be exactly
 * that.
 * ---------------------------------------------------------------------
 *
 *   HOUSE_DARK_FIXTURES_OK=1 node scripts/seed-room.mjs
 *   HOUSE_DARK_FIXTURES_OK=1 node scripts/seed-room.mjs --opening=9
 *   HOUSE_DARK_FIXTURES_OK=1 node scripts/seed-room.mjs --clean
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

/**
 * The handle --clean matches on.
 *
 * Every account this creates is addressed at it, so removal is exact
 * rather than clever: nothing is guessed from shape or timestamp, and
 * a real member can never be caught by it.
 */
const EMAIL_PREFIX = "room-fixture-";
const CIRCLE_NAME = "Fixture Circle";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "layers188@gmail.com";

/**
 * Ten responses, one to six words.
 *
 * Chosen for shape as much as content: the Room's typography has to
 * hold a single word and a full six-word line in the same column, and
 * the only way to know whether it does is to put both in front of it.
 * Half are marked into the Circle so the two filters differ.
 */
const RESPONSES = [
  { body: "I understood him. That worried me.", circle: true },
  { body: "Greatness should not feel this frightening.", circle: true },
  { body: "My shoulders hurt just watching that.", circle: true },
  { body: "Exhausting. Brilliant. I need a minute.", circle: true },
  { body: "Ambition becomes something uglier under pressure.", circle: false },
  { body: "Relentless.", circle: false },
  { body: "Never heard silence used like that.", circle: false },
  { body: "I did not breathe much.", circle: false },
  { body: "Wanted to argue with someone afterwards.", circle: false },
  { body: "Not sure who won.", circle: false },
];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

if (process.env.HOUSE_DARK_FIXTURES_OK !== "1") {
  console.error(
    "\nThis creates fixture accounts and writes reviews as them, which must never\n" +
      "happen in the real project (brief §18). Set HOUSE_DARK_FIXTURES_OK=1 to\n" +
      "confirm the configured Supabase project is a staging one.\n",
  );
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Fails loudly. A seed that reports success while writing nothing is worse than one that crashes. */
function must(label, { error }) {
  if (error) {
    console.error(`  ✗ ${label}: ${error.message ?? JSON.stringify(error)}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}`);
}

async function allUsers() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  return data.users;
}

function countWords(body) {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The opening the fixtures respond to.
 *
 * The one that is genuinely open by default — opened and not yet closed,
 * the same test `isLive()` applies — or whichever number is named with
 * `--opening=N`. The default used to ignore `closes_at`, which meant it
 * would happily fill the Room of a night that had already finished while
 * the house itself was dark.
 *
 * Naming one matters because the house hands over at 7pm: a Room seeded
 * today is empty again tomorrow, and a reviewer who looks after the
 * changeover meets the empty state this script exists to prevent.
 */
async function targetOpening() {
  const named = process.argv.find((arg) => arg.startsWith("--opening="));
  if (named) {
    const number = Number(named.split("=")[1]);
    const { data, error } = await db
      .from("openings")
      .select("id, opening_number, opens_at")
      .eq("opening_number", number)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  const now = new Date().toISOString();
  const { data, error } = await db
    .from("openings")
    .select("id, opening_number, opens_at, closes_at")
    .lte("opens_at", now)
    .order("opens_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return (data ?? []).find((o) => !o.closes_at || o.closes_at > now) ?? null;
}

async function clean() {
  console.log("Removing the Room fixture…");

  const users = (await allUsers()).filter((u) => u.email?.startsWith(EMAIL_PREFIX));
  const ids = users.map((u) => u.id);

  if (ids.length > 0) {
    // Reviews, reveals and watches all point at the profile, so they go
    // before the account does.
    must("reviews", await db.from("six_word_reviews").delete().in("user_id", ids));
    must("watches", await db.from("watches").delete().in("user_id", ids));
    must("reveals", await db.from("reveals").delete().in("user_id", ids));
    must("circle memberships", await db.from("circle_members").delete().in("user_id", ids));
  }

  const { data: circles } = await db.from("circles").select("id").eq("name", CIRCLE_NAME);
  for (const circle of circles ?? []) {
    must(`circle ${circle.id}`, await db.from("circles").delete().eq("id", circle.id));
  }

  for (const user of users) {
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) console.error(`  ✗ account ${user.email}: ${error.message}`);
    else console.log(`  ✓ account ${user.email}`);
  }

  console.log("\nRoom fixture removed.\n");
}

async function seed() {
  const opening = await targetOpening();
  if (!opening) {
    console.error(
      "\nNo opening is live, so there is no Room to fill. Programme one first,\n" +
        "or name an existing one with --opening=N.\n",
    );
    process.exit(1);
  }
  console.log(`Filling the Room for opening ${opening.opening_number}…\n`);

  const owner = (await allUsers()).find(
    (u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase(),
  );
  if (!owner) {
    console.error(`\nNo account for ${OWNER_EMAIL}. Sign in once, then run this again.\n`);
    process.exit(1);
  }

  // One Circle, so the Room's two filters show different rooms. Without
  // it "Your Circle" and "The House" are the same list and the tabs are
  // decoration.
  const { data: circle } = await db
    .from("circles")
    .upsert(
      {
        name: CIRCLE_NAME,
        created_by: owner.id,
        invite_code: "fixture-room-code",
        default_screening_day: 4,
        default_screening_time: "20:00",
      },
      { onConflict: "invite_code" },
    )
    .select("id")
    .single();
  must("circle", { error: circle ? null : { message: "not created" } });
  must(
    "owner in circle",
    await db
      .from("circle_members")
      .upsert({ circle_id: circle.id, user_id: owner.id, role: "organiser" }),
  );

  const existing = await allUsers();

  for (const [index, response] of RESPONSES.entries()) {
    const number = String(index + 1).padStart(2, "0");
    const email = `${EMAIL_PREFIX}${number}@housedark.test`;

    let user = existing.find((u) => u.email === email);
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error) {
        console.error(`  ✗ account ${email}: ${error.message}`);
        process.exit(1);
      }
      user = data.user;
    }

    // Named for what it is. "Fixture 03" cannot be mistaken for a
    // member in a screenshot, and cannot be quoted back as evidence
    // that people liked something.
    must(
      `profile ${number}`,
      await db.from("profiles").upsert({
        id: user.id,
        display_name: `Fixture ${number}`,
        timezone: "Australia/Melbourne",
        role: "member",
        onboarding_complete: true,
      }),
    );
    await db.from("email_preferences").upsert({ user_id: user.id });

    // A response only exists behind a reveal and a watch. Writing the
    // review without them would put words in the Room from someone the
    // product says has not seen the film.
    must(
      `reveal ${number}`,
      await db.from("reveals").upsert({ user_id: user.id, opening_id: opening.id }),
    );
    must(
      `watch ${number}`,
      await db.from("watches").upsert({
        user_id: user.id,
        opening_id: opening.id,
        state: "watched",
        watched_at: new Date().toISOString(),
      }),
    );
    must(
      `response ${number}`,
      await db.from("six_word_reviews").upsert({
        user_id: user.id,
        opening_id: opening.id,
        body: response.body,
        word_count: countWords(response.body),
        visibility: "circle",
      }),
    );

    if (response.circle) {
      must(
        `circle member ${number}`,
        await db
          .from("circle_members")
          .upsert({ circle_id: circle.id, user_id: user.id, role: "member" }),
      );
    }
  }

  console.log(
    `\nRoom filled: ${RESPONSES.length} responses, ` +
      `${RESPONSES.filter((r) => r.circle).length} of them in ${CIRCLE_NAME}.\n` +
      `Remove with: HOUSE_DARK_FIXTURES_OK=1 node scripts/seed-room.mjs --clean\n`,
  );
}

if (process.argv.includes("--clean")) await clean();
else await seed();

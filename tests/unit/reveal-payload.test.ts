import { describe, expect, it } from "vitest";
import { toRevealPayload } from "@/lib/reveal/payload";
import type { RevealResult } from "@/lib/supabase/types";

/**
 * `toRevealPayload` is the only function in the product that puts a
 * title on the wire, so the shape it produces is worth pinning down
 * directly rather than only exercising it through the routes.
 */

const result: RevealResult = {
  title: "Whiplash",
  release_year: 2014,
  providers: [
    {
      provider_name: "Netflix",
      access_type: "subscription",
      deep_link: "https://example.test/a",
      territory: "GB",
    },
    {
      provider_name: "Apple TV",
      access_type: "rental",
      deep_link: "https://example.test/b",
      territory: "GB",
    },
  ],
};

describe("toRevealPayload", () => {
  it("renames release_year to releaseYear", () => {
    expect(toRevealPayload(result).releaseYear).toBe(2014);
  });

  it("keeps a null release year null rather than coercing it to 0", () => {
    // A film with no year on record must render as bare title, not "(0)".
    expect(toRevealPayload({ ...result, release_year: null }).releaseYear).toBeNull();
  });

  it("passes providers through in the order the RPC sorted them", () => {
    expect(toRevealPayload(result).providers.map((p) => p.provider_name)).toEqual([
      "Netflix",
      "Apple TV",
    ]);
  });

  it("preserves provider access types so they can be looked up as labels", () => {
    expect(toRevealPayload(result).providers.map((p) => p.access_type)).toEqual([
      "subscription",
      "rental",
    ]);
  });

  it("carries an empty provider list through as an empty array", () => {
    // 0004_reveal.sql coalesces the jsonb_agg to '[]', so the components
    // can call .length without a null guard. If that coalesce is ever
    // dropped this stays green — but the RPC type would change with it.
    expect(toRevealPayload({ ...result, providers: [] }).providers).toEqual([]);
  });

  it("emits exactly the three documented keys and no extras", () => {
    // Guards against a future field on RevealResult (an internal film id,
    // a storage path) being spread into the payload by accident.
    expect(Object.keys(toRevealPayload(result)).sort()).toEqual([
      "providers",
      "releaseYear",
      "title",
    ]);
  });
});

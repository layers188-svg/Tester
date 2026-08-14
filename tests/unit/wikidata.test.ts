import { afterEach, describe, expect, it, vi } from "vitest";
import { createWikidataProvider } from "@/lib/films/wikidata";

/**
 * What these tests do and do not prove.
 *
 * They prove the parsing: given the shapes the MediaWiki and Wikidata
 * APIs document, the provider extracts the right title, year, runtime
 * and genres, drops non-films, and refuses to guess at a duration whose
 * unit it does not recognise.
 *
 * They do NOT prove that Wikidata answers in these shapes. The module
 * was written in a container with no outbound network, so the live
 * endpoint could not be called even once. Every payload below is
 * hand-written from the documented format. If the real API differs, the
 * failure surfaces in production, which is why `getFilmProvider()`
 * composes this behind the local catalogue rather than replacing it.
 *
 * Recording real payloads and asserting against those is the honest
 * next step, and it needs one machine with network access.
 */

/*
 * CirrusSearch answers with Q-ids only. Filtering happens server side
 * on `haswbstatement:P31=Q11424`, so a soundtrack album never reaches
 * this payload at all — which is the whole point of the change these
 * tests cover.
 */
const SEARCH_PAYLOAD = {
  query: { search: [{ title: "Q1234" }, { title: "Q9999" }, { title: "not-an-entity" }] },
};

/** Labels and dates for the ids the search returned. */
const SEARCH_ENTITIES_PAYLOAD = {
  entities: {
    Q1234: {
      labels: { en: { value: "Whiplash" } },
      claims: {
        P577: [{ mainsnak: { datavalue: { value: { time: "+2014-10-10T00:00:00Z" } } } }],
      },
    },
    Q9999: {
      labels: { en: { value: "Whiplash" } },
      claims: {
        P577: [{ mainsnak: { datavalue: { value: { time: "+2002-05-01T00:00:00Z" } } } }],
      },
    },
  },
};

const ENTITY_PAYLOAD = {
  entities: {
    Q1234: {
      labels: { en: { value: "Whiplash" } },
      sitelinks: { enwiki: { title: "Whiplash (2014 film)" } },
      claims: {
        P577: [
          { rank: "normal", mainsnak: { datavalue: { value: { time: "+2014-01-16T00:00:00Z" } } } },
          {
            rank: "preferred",
            mainsnak: { datavalue: { value: { time: "+2014-10-10T00:00:00Z" } } },
          },
        ],
        P2047: [
          {
            rank: "normal",
            mainsnak: {
              datavalue: {
                value: { amount: "+106", unit: "http://www.wikidata.org/entity/Q7727" },
              },
            },
          },
        ],
        P136: [
          { mainsnak: { datavalue: { value: { "entity-type": "item", id: "Q130232" } } } },
          { mainsnak: { datavalue: { value: { "entity-type": "item", id: "Q188473" } } } },
        ],
      },
    },
  },
};

const GENRE_PAYLOAD = {
  entities: {
    Q130232: { labels: { en: { value: "drama film" } } },
    Q188473: { labels: { en: { value: "action film" } } },
  },
};

const SUMMARY_PAYLOAD = {
  extract: "Whiplash is a 2014 American psychological drama film written and directed by ...",
};

/** Answers each URL by what it asks for, so ordering is not assumed. */
function routeFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    void init;
    const url = String(input);
    const body =
      url in overrides
        ? overrides[url]
        : url.includes("list=search")
          ? SEARCH_PAYLOAD
          : url.includes("props=labels|claims&languages=en&format=json")
            ? SEARCH_ENTITIES_PAYLOAD
            : url.includes("props=labels&")
              ? GENRE_PAYLOAD
              : url.includes("wbgetentities")
                ? ENTITY_PAYLOAD
                : SUMMARY_PAYLOAD;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Wikidata as a metadata source", () => {
  it("asks the catalogue for films, not for anything that mentions films", async () => {
    const fetchMock = routeFetch();
    vi.stubGlobal("fetch", fetchMock);

    const results = await createWikidataProvider().search("whiplash");

    // The filter is a statement about the data, not a phrase in a
    // description. "Soundtrack album for the 2016 film La La Land" is
    // what broke the old heuristic; nothing in this query could match
    // it, because a soundtrack is not an instance of a film.
    const searchUrl = String(fetchMock.mock.calls[0][0]);
    expect(decodeURIComponent(searchUrl)).toContain("haswbstatement:P31=Q11424");

    expect(results.map((r) => r.externalId)).toEqual(["Q1234", "Q9999"]);
    // The year is read from the publication date now, not scraped out
    // of a sentence, so two films of one name are told apart on a fact.
    expect(results[0]).toMatchObject({ title: "Whiplash", releaseYear: 2014 });
    expect(results[1].releaseYear).toBe(2002);
  });

  it("skips a search hit that is not an entity id", async () => {
    vi.stubGlobal("fetch", routeFetch());

    const results = await createWikidataProvider().search("whiplash");

    // CirrusSearch can return page titles that are not items. Asking
    // wbgetentities about one is a wasted round trip and a null row.
    expect(results.every((r) => /^Q\d+$/.test(r.externalId))).toBe(true);
  });

  it("identifies itself, because an anonymous machine is how a platform gets rate limited", async () => {
    const fetchMock = routeFetch();
    vi.stubGlobal("fetch", fetchMock);

    await createWikidataProvider().search("whiplash");

    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers).toMatchObject({
      "user-agent": expect.stringContaining("HouseDark"),
    });
  });

  it("reads the preferred date, the runtime and the genres", async () => {
    vi.stubGlobal("fetch", routeFetch());

    const facts = await createWikidataProvider().facts("Q1234");

    expect(facts).toMatchObject({
      provider: "wikidata",
      externalId: "Q1234",
      title: "Whiplash",
      // The preferred claim, not simply the first one in the array.
      releaseYear: 2014,
      runtimeMinutes: 106,
      genres: ["drama film", "action film"],
    });
  });

  it("keeps the synopsis server-side but does fetch it, because the editorial engine needs it", async () => {
    vi.stubGlobal("fetch", routeFetch());

    const facts = await createWikidataProvider().facts("Q1234");

    expect(facts?.synopsis).toContain("psychological drama");
  });

  it("survives a film with no Wikipedia article", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("wbgetentities") && !url.includes("props=labels&")) {
          return new Response(
            JSON.stringify({
              entities: { Q1234: { labels: { en: { value: "Unwritten" } }, claims: {} } },
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ entities: {} }), { status: 200 });
      }),
    );

    const facts = await createWikidataProvider().facts("Q1234");

    expect(facts).toMatchObject({ title: "Unwritten", synopsis: null, genres: [] });
  });

  it("refuses to guess at a duration whose unit it does not know", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q1234&props=labels|claims|sitelinks&languages=en&sitefilter=enwiki&format=json&origin=*`]:
          {
            entities: {
              Q1234: {
                labels: { en: { value: "Whiplash" } },
                claims: {
                  P2047: [
                    {
                      mainsnak: {
                        datavalue: {
                          value: { amount: "+6360", unit: "http://www.wikidata.org/entity/Q11574" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
      }),
    );

    const facts = await createWikidataProvider().facts("Q1234");

    // 6360 seconds is 106 minutes, but reading it as 6360 minutes would
    // tell a member this film runs four and a half days. Q11574 is not
    // a unit this module claims to understand, so it says nothing.
    expect(facts?.runtimeMinutes).toBeNull();
  });

  it("converts hours, which some entries use", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        [`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q1234&props=labels|claims|sitelinks&languages=en&sitefilter=enwiki&format=json&origin=*`]:
          {
            entities: {
              Q1234: {
                labels: { en: { value: "Long one" } },
                claims: {
                  P2047: [
                    {
                      mainsnak: {
                        datavalue: {
                          value: { amount: "+3", unit: "http://www.wikidata.org/entity/Q25235" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
      }),
    );

    expect((await createWikidataProvider().facts("Q1234"))?.runtimeMinutes).toBe(180);
  });

  it("never asks the network about an id that is not a Wikidata item", async () => {
    const fetchMock = routeFetch();
    vi.stubGlobal("fetch", fetchMock);

    // Catalogue slugs reach here when a member has an old link. There
    // is no such entity, and a request would be a wasted round trip on
    // somebody else's free infrastructure.
    expect(await createWikidataProvider().facts("whiplash-2014")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not put the endpoint's own words in front of a member", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Too many requests", { status: 429 })),
    );

    await expect(createWikidataProvider().search("whiplash")).rejects.toThrow(
      /Wikidata responded 429/,
    );
  });
});

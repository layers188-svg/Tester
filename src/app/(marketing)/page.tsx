import type { Metadata } from "next";
import { Entrance } from "@/components/marketing/Entrance";

export const metadata: Metadata = {
  title: "House Dark · a private film club",
  description:
    "A film club built around knowing less before you watch. Find the joy in not knowing.",
};

/**
 * The public entrance, and nothing else.
 *
 * This page requests no film data and no media. Tonight's opening, its
 * number, its cues and the No Trailer are all club material now: they
 * appear after sign in and not before. That is a deliberate reversal of
 * the earlier public demonstration, which put a No Trailer on the front
 * door — the public site sells the feeling, the member product delivers
 * the film.
 *
 * `searchParams` makes this dynamic, which is correct: the entrance is
 * a door, not a document, and there is nothing here worth caching.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.k;
  const testKey = typeof raw === "string" && raw.length > 0 ? raw : null;

  return <Entrance testKey={testKey} />;
}

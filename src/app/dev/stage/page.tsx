import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StageHarness } from "./StageHarness";

/**
 * The staging state simulator's front door.
 *
 * Development only. `notFound()` runs before any child renders, so in a
 * production build this route is a 404 and the harness never reaches
 * the browser — the requirement is "Development and staging only… A
 * query parameter or dev control is fine if it cannot change server
 * eligibility in production" (03_TECHNICAL_INTEGRATION.md).
 *
 * HOUSE_DARK_ENABLE_STAGE exists for a staging deployment that is a
 * production build but not production. It is deliberately not a public
 * NEXT_PUBLIC_ variable: the decision is made on the server, at render
 * time, and cannot be flipped from a browser.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stage",
  robots: { index: false, follow: false },
};

function stageEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.HOUSE_DARK_ENABLE_STAGE === "true";
}

export default async function StagePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (!stageEnabled()) notFound();

  const { state } = await searchParams;
  const initial =
    state === "revealed" ||
    state === "watched" ||
    state === "room" ||
    state === "trust" ||
    state === "seal"
      ? state
      : "sealed";

  return <StageHarness initialState={initial} />;
}

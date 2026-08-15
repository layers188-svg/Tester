import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { CLIENT_REPORTABLE_EVENTS } from "@/lib/analytics/events";
import { recordAnalyticsEvent } from "@/lib/analytics/record";

/**
 * Ingest for the three brief §15 events only a browser can observe (see
 * CLIENT_REPORTABLE_EVENTS). The other nine are recorded server-side at
 * the point the action actually succeeds.
 *
 * The body cannot express a title: the event is one of three literals
 * and the opening number is a small integer. Anything else is rejected
 * before it reaches the database.
 */
const bodySchema = z.object({
  event: z.enum(CLIENT_REPORTABLE_EVENTS),
  openingNumber: z.number().int().positive().max(1_000_000).optional(),
});

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await recordAnalyticsEvent({
    event: parsed.data.event,
    actorId: user.id,
    openingNumber: parsed.data.openingNumber ?? null,
  });

  // No body: nothing about an opening should be inferable from this
  // response, and the client has no use for one.
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

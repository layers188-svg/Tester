import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { TrustUs } from "@/components/trust/TrustUs";

export const dynamic = "force-dynamic";

/**
 * The label the member sees is Trust Us; the handover allows `SEARCH`
 * "for comprehension", but the behaviour is a recommendation ritual and
 * calling it Search would promise a catalogue this page will never give
 * them.
 */
export const metadata: Metadata = { title: "Trust Us" };

export default async function TrustUsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.rpc("list_trust_us_territories");
  const territories = (data ?? []).map((row) => row.territory);

  return <TrustUs territories={territories} />;
}

import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * This must NEVER be imported from a client component or leaked into any
 * client bundle — the `server-only` import above makes that a build
 * error, not just a convention. Use it only for:
 *   - the reveal routes (after verifying the caller's session directly),
 *   - the Programming Desk / owner API routes (after checking the
 *     caller is in ADMIN_EMAILS),
 *   - the scheduled cron worker (guarded by CRON_SECRET).
 */
export function getServiceSupabase() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

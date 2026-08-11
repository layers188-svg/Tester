import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Cookie-free, anon-key Supabase client for public reads on statically
 * generated / ISR pages (e.g. the marketing home page's approved six
 * words). Using this instead of the cookie-bound server client keeps
 * those pages cacheable rather than forced fully dynamic.
 */
export function getAnonSupabase() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

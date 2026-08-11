import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers
 * and Server Actions. Runs as the signed-in member (RLS enforced) — this
 * is the client every read of member-facing data should go through.
 */
export async function getServerSupabase() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that cannot set cookies (e.g.
            // during static rendering). Middleware refreshes the session on
            // the next request, so this is safe to ignore.
          }
        },
      },
    },
  );
}

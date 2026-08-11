"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser Supabase client. Uses only the anon key — safe to call from any client component. */
export function getBrowserSupabase() {
  if (client) return client;
  const env = getClientEnv();
  client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}

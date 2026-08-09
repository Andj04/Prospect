import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"];
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!url || !publishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY manquants. Vérifiez .env.local.",
  );
}

// Browser/SSR client — uses the publishable (anon) key, safe to expose.
// All access is governed by row-level security policies in the database.
export const supabase = createClient(url, publishableKey);

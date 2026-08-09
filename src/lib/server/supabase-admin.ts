import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key. NEVER import this
// module from a component or any file reachable by the client bundle — only
// from src/server-functions/*.ts handlers, which TanStack Start executes
// exclusively on the server.
if (typeof window !== "undefined") {
  throw new Error("supabase-admin.ts must never be imported in browser code.");
}

try {
  // Best-effort local-dev convenience: makes sure .env.local is loaded into
  // process.env even if the dev server didn't already do it. No-ops (and is
  // swallowed) wherever the file doesn't exist, e.g. in production where env
  // vars are injected by the host instead.
  process.loadEnvFile(".env.local");
} catch {
  // ignore — rely on the platform's own env injection
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} manquant côté serveur.`);
  return value;
}

const url = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

export function createAdminClient() {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

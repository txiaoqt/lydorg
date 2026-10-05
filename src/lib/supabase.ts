import { createClient } from "@supabase/supabase-js";
import { expireAdminSession } from "@/lib/admin-auth";

// Custom administrator tokens are independent of Supabase Auth's JWT. Handle
// their authoritative rejection once for both imperative and cached RPCs.
const fetchWithAdminSessionRecovery: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok && String(input).includes("/rest/v1/rpc/") && typeof init?.body === "string") {
    try {
      const args = JSON.parse(init.body);
      if (typeof args._session_token === "string") {
        const failure = await response.clone().json();
        if (failure.message === "Admin session is invalid or expired.") {
          expireAdminSession(args._session_token);
        }
      }
    } catch { /* Preserve the original response, including network/server errors. */ }
  }
  return response;
};

const normalizeEnvValue = (value: string | undefined) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "project";
  } catch {
    return "project";
  }
})();

export const supabaseAuthStorageKey = `sb-${supabaseProjectRef}-auth-token`;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithAdminSessionRecovery },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: supabaseAuthStorageKey,
      },
    })
  : null;

export const hasSupabase = () => Boolean(supabase);

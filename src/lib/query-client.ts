import { QueryClient } from "@tanstack/react-query";

type QueryFailure = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
  context?: { status?: unknown } | null;
};

/** Preserve Supabase/PostgREST error metadata when turning a response error
 * into an Error for a query function. */
export const toQueryError = (error: unknown): Error => {
  const failure = error && typeof error === "object" ? error as QueryFailure : {};
  const message = typeof failure.message === "string" ? failure.message : String(error ?? "Request failed.");
  const wrapped = new Error(message);
  if (failure.code !== undefined) Object.assign(wrapped, { code: failure.code });
  const status = failure.status ?? failure.statusCode ?? failure.context?.status;
  if (status !== undefined) Object.assign(wrapped, { status });
  return wrapped;
};

/** Retry one time only for failures that look transient. Supabase schema,
 * query, validation, and authorization errors are deterministic and should be
 * surfaced immediately instead of issuing the same failing request again. */
export const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 1 || !error || typeof error !== "object") return false;

  const failure = error as QueryFailure;
  const statusValue = failure.status ?? failure.statusCode ?? failure.context?.status;
  const status = typeof statusValue === "number" ? statusValue : Number(statusValue);
  if (Number.isFinite(status) && status > 0) return status >= 500;

  const code = typeof failure.code === "string" ? failure.code.toUpperCase() : "";
  // SQLSTATE classes for bad query/schema, invalid data, constraints, and auth.
  if (/^(?:22|23|28|42)[0-9A-Z]{3}$/.test(code)) return false;
  // PostgREST query/schema/JWT errors are client-side. PGRST000-003 are
  // connection/pool failures and can recover on a single retry.
  if (/^PGRST(?:1|2|30[1-9])/.test(code)) return false;
  if (/^PGRST00[0-3]$/.test(code) || /^08[0-9A-Z]{3}$/.test(code) || code === "53300" || code === "57014") {
    return true;
  }

  const message = typeof failure.message === "string" ? failure.message.toLowerCase() : "";
  if (
    /(?:column|relation|function|operator|schema|table).*(?:does not exist|not found|schema cache|could not find)|(?:not found in the schema cache)|(?:permission denied)|(?:not authorized|unauthorized|forbidden)|(?:invalid login|invalid jwt|jwt expired)|(?:violates .* constraint)|(?:duplicate key)/i.test(message)
  ) {
    return false;
  }

  if (failure.name === "AbortError") return false;
  return /failed to fetch|fetch failed|network(?: error| request failed| failure)?|connection (?:reset|refused|closed|timed out)|econnreset|etimedout|socket hang up|load failed/i.test(message);
};

export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    },
  },
});

/** Shared cache for the app shell. */
export const queryClient = createQueryClient();

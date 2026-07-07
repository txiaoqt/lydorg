export const isInvalidRefreshTokenError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  return /invalid refresh token|refresh token not found|refresh_token_not_found/i.test(message);
};

export const clearSupabaseAuthStorage = (storageKey: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
  // Older Supabase client versions may have written chunked companion keys.
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(`${storageKey}.`)) window.localStorage.removeItem(key);
  }
};


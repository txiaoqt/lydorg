const PRODUCTION_SUPABASE_HOST = "mqqaykksadotbrghbexz.supabase.co";

export function assertNotProductionSupabaseUrl(rawUrl: string): void {
  let hostname = "";
  try {
    hostname = new URL(rawUrl, "http://localhost").hostname.toLowerCase();
  } catch {
    return;
  }
  if (hostname === PRODUCTION_SUPABASE_HOST) {
    throw new Error("Vitest network guard blocked the production Supabase host.");
  }
}

export function createProductionSupabaseNetworkGuard(
  fetchImplementation: typeof fetch,
): typeof fetch {
  return async (input, init) => {
    const rawUrl = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

    assertNotProductionSupabaseUrl(rawUrl);

    return fetchImplementation(input, init);
  };
}

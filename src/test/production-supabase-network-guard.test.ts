import { describe, expect, it, vi } from "vitest";
import { createProductionSupabaseNetworkGuard } from "./production-supabase-network-guard";

describe("production Supabase test-network guard", () => {
  it("blocks requests to the production project before fetch can send them", async () => {
    const transport = vi.fn<typeof fetch>();
    const guardedFetch = createProductionSupabaseNetworkGuard(transport);

    await expect(
      guardedFetch("https://mqqaykksadotbrghbexz.supabase.co/rest/v1/admin_accounts"),
    ).rejects.toThrow("blocked the production Supabase host");
    expect(transport).not.toHaveBeenCalled();
  });

  it("blocks direct XMLHttpRequest access to the production project", () => {
    const request = new XMLHttpRequest();

    expect(() => request.open(
      "GET",
      "https://mqqaykksadotbrghbexz.supabase.co/rest/v1/admin_accounts",
    )).toThrow("blocked the production Supabase host");
  });

  it("allows test and non-production hosts through to the supplied transport", async () => {
    const response = new Response("ok", { status: 200 });
    const transport = vi.fn<typeof fetch>().mockResolvedValue(response);
    const guardedFetch = createProductionSupabaseNetworkGuard(transport);

    await expect(guardedFetch("https://vitest.invalid/rest/v1/example")).resolves.toBe(response);
    expect(transport).toHaveBeenCalledOnce();
  });

  it("uses an isolated Supabase URL even when the repository has deployment env files", async () => {
    const { supabaseUrl } = await import("../lib/supabase");

    expect(supabaseUrl).toBe("https://vitest.invalid");
    expect(supabaseUrl).not.toContain("mqqaykksadotbrghbexz");
  });
});

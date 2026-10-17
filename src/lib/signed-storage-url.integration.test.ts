import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: { user: { id: "A" }, access_token: "fixture-A", expires_at: 9999999999 } as any,
  listener: null as null | ((event: string) => void),
  sign: vi.fn(), publicUrl: vi.fn(),
}));
vi.mock("./supabase", () => ({
  supabaseUrl: "https://fixture.invalid", supabaseAuthStorageKey: "fixture-auth",
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mocks.session }, error: null }),
      onAuthStateChange: (listener: (event: string) => void) => { mocks.listener = listener; },
    },
    storage: { from: () => ({ createSignedUrl: mocks.sign, getPublicUrl: mocks.publicUrl }) },
  },
}));
import { resolveSupabaseFileUrl } from "./lydo-connect-supabase";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); mocks.listener?.("SIGNED_OUT");
  mocks.session = { user: { id: "A" }, access_token: "fixture-A", expires_at: 9999999999 };
  mocks.sign.mockResolvedValue({ data: { signedUrl: "A-authorized-url" }, error: null });
});
it("signs lazily and shares concurrent requests through the production resolver", async () => {
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(await Promise.all([resolveSupabaseFileUrl("storage://private/file"), resolveSupabaseFileUrl("storage://private/file")])).toEqual(["A-authorized-url", "A-authorized-url"]);
  expect(mocks.sign).toHaveBeenCalledTimes(1); expect(mocks.sign).toHaveBeenCalledWith("file", 3600);
});
it("isolates organization account switches without reloading", async () => {
  await resolveSupabaseFileUrl("storage://private/file");
  mocks.listener?.("SIGNED_OUT"); mocks.session = { user: { id: "B" }, access_token: "fixture-B", expires_at: 9999999999 };
  mocks.listener?.("SIGNED_IN"); mocks.sign.mockResolvedValue({ data: null, error: { statusCode: "403" } });
  expect(await resolveSupabaseFileUrl("storage://private/file")).toBe(""); expect(mocks.sign).toHaveBeenCalledTimes(2);
  expect(mocks.publicUrl).not.toHaveBeenCalled();
});
it("rejects an in-flight signing response immediately after local logout starts", async () => {
  let release!: (value: unknown) => void;
  mocks.sign.mockImplementationOnce(() => new Promise(r => { release = r; }));
  const pending = resolveSupabaseFileUrl("storage://private/file"); await vi.waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  window.dispatchEvent(new Event("lydo-auth-reset"));
  release({ data: { signedUrl: "stale-A-url" }, error: null }); expect(await pending).toBe("");
});
it.each(["TOKEN_REFRESHED", "USER_UPDATED", "SIGNED_OUT"])("invalidates on %s", async event => {
  await resolveSupabaseFileUrl("storage://private/file"); mocks.listener?.(event);
  await resolveSupabaseFileUrl("storage://private/file"); expect(mocks.sign).toHaveBeenCalledTimes(2);
});
it("retries a missing object and never persists signed URLs", async () => {
  mocks.sign.mockResolvedValueOnce({ data: null, error: { statusCode: "404" } });
  expect(await resolveSupabaseFileUrl("storage://private/file")).toBe("");
  expect(await resolveSupabaseFileUrl("storage://private/file")).toBe("A-authorized-url");
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
});
it("preserves public and local preview links without signing", async () => {
  for (const value of ["https://public.invalid/file", "blob:local", "data:application/pdf;base64,fixture"]) expect(await resolveSupabaseFileUrl(value)).toBe(value);
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("reauthorizes legacy signed references instead of returning their bearer token", async () => {
  const value = "https://fixture.invalid/storage/v1/object/sign/private/old%20file.pdf?token=old-fixture-token";
  expect(await resolveSupabaseFileUrl(value)).toBe("A-authorized-url");
  expect(mocks.sign).toHaveBeenCalledWith("old file.pdf", 3600);
});

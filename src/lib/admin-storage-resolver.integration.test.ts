import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: { sessionToken: "admin-A", expiresAt: "2099-01-01T00:00:00Z" } as any,
  invoke: vi.fn(), sign: vi.fn(), getSession: vi.fn(),
}));
vi.mock("./admin-auth", async importOriginal => ({ ...await importOriginal<typeof import("./admin-auth")>(), readAdminSession: () => mocks.admin }));
vi.mock("./supabase", () => ({ supabaseUrl: "https://fixture.invalid", supabaseAuthStorageKey: "fixture-auth",
  supabase: { auth: { getSession: mocks.getSession, onAuthStateChange: vi.fn() },
    functions: { invoke: mocks.invoke }, storage: { from: () => ({ createSignedUrl: mocks.sign }) } } }));
import { deleteNewsReleasePreviewImageFromSupabase, resolveSupabaseFileUrl } from "./lydo-connect-supabase";
beforeEach(() => {
  vi.clearAllMocks(); window.history.replaceState({}, "", "/admin/registrations");
  mocks.admin = { sessionToken: "admin-A", expiresAt: "2099-01-01T00:00:00Z" };
  window.dispatchEvent(new Event("lydo-admin-session-change"));
  mocks.invoke.mockResolvedValue({ data: { signedUrl: "fixture-admin-url" }, error: null });
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.sign.mockResolvedValue({ data: { signedUrl: "fixture-owner-url" }, error: null });
});

const gatewayBuckets = ["organization-documents", "budget-request-files", "liquidation-report-files",
  "ypop-files", "move-files", "template-files", "news-release-images"];
const ownerSession = { user: { id: "organization-A" }, access_token: "fixture-owner-token", expires_at: 4070908800 };
const expectNoDirectAdminAccess = () => {
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.getSession).not.toHaveBeenCalled();
};

it.each(gatewayBuckets)("fails closed without an Admin session for %s, even with an organization JWT", async bucket => {
  mocks.admin = null;
  mocks.getSession.mockResolvedValue({ data: { session: ownerSession }, error: null });
  const ref = `storage://${bucket}/parent/file.pdf`;
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(mocks.invoke).not.toHaveBeenCalled();
  expectNoDirectAdminAccess();
  mocks.admin = { sessionToken: "admin-B", expiresAt: "2099-01-01T00:00:00Z" };
  mocks.invoke.mockResolvedValue({ data: { signedUrl: "fresh-admin-B" }, error: null });
  expect(await resolveSupabaseFileUrl(ref)).toBe("fresh-admin-B");
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expectNoDirectAdminAccess();
});

it.each([
  ["expired", { sessionToken: "expired-admin", expiresAt: "2000-01-01T00:00:00Z" }],
  ["invalid expiry", { sessionToken: "invalid-admin", expiresAt: "not-a-date" }],
  ["missing token", { expiresAt: "2099-01-01T00:00:00Z" }],
  ["blank token", { sessionToken: "  ", expiresAt: "2099-01-01T00:00:00Z" }],
  ["non-string token", { sessionToken: 123, expiresAt: "2099-01-01T00:00:00Z" }],
])("rejects an %s Admin session without selecting another principal", async (_label, admin) => {
  mocks.admin = admin;
  const ref = "storage://organization-documents/parent/file.pdf";
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(mocks.invoke).not.toHaveBeenCalled();
  expectNoDirectAdminAccess();
  mocks.admin = { sessionToken: "admin-A", expiresAt: "2099-01-01T00:00:00Z" };
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expectNoDirectAdminAccess();
});

it.each(gatewayBuckets)("uses only the gateway for a valid Admin request to %s", async bucket => {
  const ref = `storage://${bucket}/parent/file.pdf`;
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expect(mocks.invoke.mock.calls[0][1].body).toMatchObject({ action: "sign", bucket, path: "parent/file.pdf", sessionToken: "admin-A" });
  expectNoDirectAdminAccess();
});

it("reauthorizes saved signed HTTP references and denies them without an Admin session", async () => {
  mocks.admin = null;
  expect(await resolveSupabaseFileUrl("https://fixture.invalid/storage/v1/object/sign/organization-documents/parent/file.pdf?token=fixture-old-token")).toBe("");
  expect(mocks.invoke).not.toHaveBeenCalled();
  expectNoDirectAdminAccess();
});

it("preserves intentionally public news HTTP images without signing", async () => {
  mocks.admin = null;
  const url = "https://fixture.invalid/storage/v1/object/public/news-release-images/news-releases/image.jpg";
  expect(await resolveSupabaseFileUrl(url)).toBe(url);
  expect(mocks.invoke).not.toHaveBeenCalled();
  expectNoDirectAdminAccess();
});

it("rejects gateway-denied/revoked sessions without caching a URL or a permanent denial", async () => {
  const ref = "storage://liquidation-report-files/parent/file.pdf";
  mocks.invoke.mockResolvedValue({ data: null, error: new Error("revoked") });
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
  expectNoDirectAdminAccess();
  mocks.invoke.mockResolvedValue({ data: { signedUrl: "fresh-authorized" }, error: null });
  expect(await resolveSupabaseFileUrl(ref)).toBe("fresh-authorized");
  expect(mocks.invoke).toHaveBeenCalledTimes(3);
  expectNoDirectAdminAccess();
});

it("discards an Admin result after logout even without a session-change event", async () => {
  let release!: (value: unknown) => void;
  mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://organization-documents/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  mocks.admin = null;
  release({ data: { signedUrl: "stale-admin-url" }, error: null });
  expect(await pending).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expectNoDirectAdminAccess();
  mocks.admin = { sessionToken: "admin-A", expiresAt: "2099-01-01T00:00:00Z" };
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
});

it("does not reuse Admin A's pending result for Admin B", async () => {
  let release!: (value: unknown) => void;
  mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://budget-request-files/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  mocks.admin = { sessionToken: "admin-B", expiresAt: "2099-01-01T00:00:00Z" };
  release({ data: { signedUrl: "stale-admin-A" }, error: null });
  expect(await pending).toBe("");
  mocks.invoke.mockResolvedValue({ data: { signedUrl: "fresh-admin-B" }, error: null });
  expect(await resolveSupabaseFileUrl(ref)).toBe("fresh-admin-B");
  expect(await resolveSupabaseFileUrl(ref)).toBe("fresh-admin-B");
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
  expectNoDirectAdminAccess();
});

it("discards a result if the Admin session expires during signing", async () => {
  let release!: (value: unknown) => void;
  mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://ypop-files/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  mocks.admin.expiresAt = "2000-01-01T00:00:00Z";
  release({ data: { signedUrl: "expired-session-result" }, error: null });
  expect(await pending).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  expectNoDirectAdminAccess();
  mocks.admin.expiresAt = "2099-01-01T00:00:00Z";
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
});

it("rejects an Admin-to-organization transition before signing starts", async () => {
  const pending = resolveSupabaseFileUrl("storage://organization-documents/parent/file.pdf");
  window.history.replaceState({}, "", "/user/documents");
  expect(await pending).toBe("");
  expect(mocks.invoke).not.toHaveBeenCalled();
  expectNoDirectAdminAccess();
});

it("discards an in-flight Admin result on an organization route and signs afresh for its owner", async () => {
  let release!: (value: unknown) => void;
  mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://organization-documents/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  window.history.replaceState({}, "", "/user/documents");
  release({ data: { signedUrl: "stale-admin-url" }, error: null });
  expect(await pending).toBe("");
  expect(mocks.sign).not.toHaveBeenCalled();
  mocks.getSession.mockResolvedValue({ data: { session: ownerSession }, error: null });
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-owner-url");
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  window.history.replaceState({}, "", "/admin/registrations");
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
});

it("rejects an organization-to-Admin transition while owner context is being read", async () => {
  let release!: (value: unknown) => void;
  window.history.replaceState({}, "", "/user/documents");
  mocks.getSession.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://organization-documents/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.getSession).toHaveBeenCalledTimes(1));
  window.history.replaceState({}, "", "/admin/registrations");
  release({ data: { session: ownerSession }, error: null });
  expect(await pending).toBe("");
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
});

it("does not expose an already-started owner signing result after entering Admin", async () => {
  let release!: (value: unknown) => void;
  window.history.replaceState({}, "", "/user/documents");
  mocks.getSession.mockResolvedValue({ data: { session: ownerSession }, error: null });
  mocks.sign.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const ref = "storage://organization-documents/parent/file.pdf";
  const pending = resolveSupabaseFileUrl(ref);
  await vi.waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(1));
  window.history.replaceState({}, "", "/admin/registrations");
  mocks.admin = null;
  release({ data: { signedUrl: "stale-owner-url" }, error: null });
  expect(await pending).toBe("");
  expect(await resolveSupabaseFileUrl(ref)).toBe("");
  // The one direct request began on the authorized owner route; Admin starts none.
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  expect(mocks.invoke).not.toHaveBeenCalled();
});

it("rejects a cached Admin hit if the route changes across its await boundary", async () => {
  const ref = "storage://organization-documents/parent/file.pdf";
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-admin-url");
  const pending = resolveSupabaseFileUrl(ref);
  window.history.replaceState({}, "", "/public-templates");
  expect(await pending).toBe("");
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(await resolveSupabaseFileUrl(ref)).toBe("fixture-owner-url");
  expect(mocks.sign).toHaveBeenCalledTimes(1);
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
});

it.each(["/public-templates", "/user/documents"])("preserves actual Supabase-principal signing on %s", async pathname => {
  window.history.replaceState({}, "", pathname);
  const session = pathname.startsWith("/user") ? ownerSession : null;
  mocks.getSession.mockResolvedValue({ data: { session }, error: null });
  expect(await resolveSupabaseFileUrl("storage://template-files/active/file.pdf")).toBe("fixture-owner-url");
  expect(mocks.getSession).toHaveBeenCalled();
  expect(mocks.sign).toHaveBeenCalledWith("active/file.pdf", 3600);
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it("deduplicates concurrent Admin signing through the secure gateway only", async () => {
  const ref = "storage://organization-documents/parent/file.pdf";
  expect(await Promise.all([resolveSupabaseFileUrl(ref),resolveSupabaseFileUrl(ref)])).toEqual(["fixture-admin-url","fixture-admin-url"]);
  expect(mocks.invoke).toHaveBeenCalledTimes(1); expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.invoke.mock.calls[0][0]).toBe("admin-storage-access");
  expect(mocks.getSession).not.toHaveBeenCalled();
});
it("denies without falling back to anonymous Storage signing", async () => {
  mocks.invoke.mockResolvedValue({ data: null, error: new Error("denied") });
  expect(await resolveSupabaseFileUrl("storage://budget-request-files/parent/file.pdf")).toBe("");
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("discards a pending gateway URL on logout/account switching", async () => {
  let release!: (value: unknown) => void;
  mocks.invoke.mockImplementationOnce(() => new Promise(resolve => { release=resolve; }));
  const pending=resolveSupabaseFileUrl("storage://organization-documents/parent/file.pdf");
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
  mocks.admin=null; window.dispatchEvent(new Event("lydo-admin-session-change"));
  release({ data: { signedUrl: "stale-result" }, error: null }); expect(await pending).toBe("");
});
it("only maps news image URLs from this environment's Storage origin to cleanup requests", async () => {
  mocks.invoke.mockResolvedValue({ data: { removed: true }, error: null });
  const path = "news-releases/a%20b.jpg";
  for (const foreign of [
    `https://mqqaykksadotbrghbexz.supabase.co/storage/v1/object/public/news-release-images/${path}`,
    `https://attacker.example/storage/v1/object/public/news-release-images/${path}`,
    `https://fixture.invalid.attacker.example/storage/v1/object/public/news-release-images/${path}`,
    `https://fixture.invalid@attacker.example/storage/v1/object/public/news-release-images/${path}`,
  ]) await deleteNewsReleasePreviewImageFromSupabase(foreign);
  expect(mocks.invoke).not.toHaveBeenCalled();
  await deleteNewsReleasePreviewImageFromSupabase(`https://fixture.invalid/storage/v1/object/public/news-release-images/${path}?t=1`);
  await deleteNewsReleasePreviewImageFromSupabase("storage://news-release-images/news-releases/c.jpg");
  expect(mocks.invoke.mock.calls.map(([, options]) => options.body.path)).toEqual(["news-releases/a b.jpg", "news-releases/c.jpg"]);
});
it("does not use a stored Admin session for an Organization/public route", async () => {
  window.history.replaceState({}, "", "/user/documents");
  mocks.sign.mockResolvedValue({ data: { signedUrl: "org-or-public-authorized" }, error: null });
  expect(await resolveSupabaseFileUrl("storage://template-files/active/file.pdf")).toBe("org-or-public-authorized");
  expect(mocks.invoke).not.toHaveBeenCalled();
});

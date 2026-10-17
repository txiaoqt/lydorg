import { beforeEach, expect, it, vi } from "vitest";
import { createStorageAccessHandler } from "../../supabase/functions/admin-storage-access/control";
const mocks = vi.hoisted(() => ({ session: { sessionToken: "A" } as any, invoke: vi.fn(), upload: vi.fn() }));
vi.mock("./admin-auth", () => ({ readAdminSession: () => mocks.session }));
vi.mock("./supabase", () => ({ supabase: { functions: { invoke: mocks.invoke }, storage: { from: () => ({ uploadToSignedUrl: mocks.upload }) } } }));
import { requestAdminStorageAccess, uploadAdminStorageAsset } from "./admin-storage-access";
beforeEach(() => { vi.clearAllMocks(); mocks.session = { sessionToken: "A" }; });
const body = { action: "sign", bucket: "organization-documents", path: "verified/file.pdf", sessionToken: "fixture" };
const request = (payload: unknown) => new Request("https://fixture.invalid", { method: "POST", body: JSON.stringify(payload) });
const dependencies = () => ({ authorize: vi.fn().mockResolvedValue({ bucket_id: body.bucket, object_name: body.path }),
  sign: vi.fn().mockResolvedValue("fixture-signed-result"), upload: vi.fn().mockResolvedValue({ token: "fixture-upload-token" }), remove: vi.fn().mockResolvedValue(true) });
it.each(["anonymous", "wrong-permission", "expired", "revoked", "inactive", "unknown-resource"])("never signs when server authorization denies %s", async () => {
  const d = dependencies(); d.authorize.mockResolvedValue(null);
  expect((await createStorageAccessHandler(d)(request(body))).status).toBe(403); expect(d.sign).not.toHaveBeenCalled();
});
it("signs only an authoritative exact object and preserves the tested lifetime", async () => {
  const d = dependencies(); const response = await createStorageAccessHandler(d)(request(body));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(d.sign).toHaveBeenCalledWith({ bucket_id: body.bucket, object_name: body.path }, 3600);
});
it("rejects a mismatched grant without signing", async () => {
  const d = dependencies(); d.authorize.mockResolvedValue({ bucket_id: body.bucket, object_name: "other.pdf" });
  expect((await createStorageAccessHandler(d)(request(body))).status).toBe(403); expect(d.sign).not.toHaveBeenCalled();
});
it("bounds request bytes before parsing or authorization", async () => {
  const d = dependencies();
  const response = await createStorageAccessHandler(d)(request({ ...body, extra: "x".repeat(9000) }));
  expect(response.status).toBe(400); expect(d.authorize).not.toHaveBeenCalled();
});
it.each(["upload", "delete"])("does not allow %s of private documents via the Admin gateway", async action => {
  const d = dependencies(); expect((await createStorageAccessHandler(d)(request({ ...body, action }))).status).toBe(403);
  expect(d.authorize).not.toHaveBeenCalled();
});
it.each(["../secret", "parent/../secret", "parent/./secret"])("rejects path traversal %s", async path => {
  const d = dependencies(); expect((await createStorageAccessHandler(d)(request({ ...body, path }))).status).toBe(400);
  expect(d.authorize).not.toHaveBeenCalled();
});
it("suppresses sensitive server errors and allows a later retry", async () => {
  const d = dependencies(); d.authorize.mockRejectedValueOnce(new Error("sensitive-token-and-path"));
  const log = vi.spyOn(console, "error"); const response = await createStorageAccessHandler(d)(request(body));
  expect(await response.text()).not.toContain("sensitive"); expect(log).not.toHaveBeenCalled();
  expect((await createStorageAccessHandler(d)(request(body))).status).toBe(200); log.mockRestore();
});
it("uses only server-generated asset upload paths", async () => {
  const d = dependencies(); d.authorize.mockResolvedValue({ bucket_id: "template-files", object_name: "server-created.pdf" });
  const response = await createStorageAccessHandler(d)(request({ ...body, action: "upload", bucket: "template-files", path: "arbitrary.pdf" }));
  expect(response.status).toBe(200); expect((await response.json()).path).toBe("server-created.pdf");
});
it("rejects a late response after Admin account switching", async () => {
  mocks.invoke.mockImplementation(async () => { mocks.session = { sessionToken: "B" }; return { data: { signedUrl: "old-result" }, error: null }; });
  await expect(requestAdminStorageAccess("sign", body.bucket, body.path)).rejects.toThrow("account changed");
});
it("does not fall back when the gateway denies access", async () => {
  mocks.invoke.mockResolvedValue({ data: null, error: new Error("denied") });
  await expect(requestAdminStorageAccess("sign", body.bucket, body.path)).rejects.toThrow("could not be authorized");
});
it("uploads assets once with an authorized token and without overwrite", async () => {
  mocks.invoke.mockResolvedValue({ data: { bucket: "template-files", path: "server.pdf", token: "fixture" }, error: null });
  mocks.upload.mockResolvedValue({ error: null }); const file = new File(["%PDF"], "file.pdf", { type: "application/pdf" });
  expect(await uploadAdminStorageAsset("template-files", file, "id")).toBe("server.pdf");
  expect(mocks.upload).toHaveBeenCalledTimes(1); expect(mocks.upload).toHaveBeenCalledWith("server.pdf", "fixture", file, { upsert: false, contentType: "application/pdf" });
});

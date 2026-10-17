import { expect, it } from "vitest";
import { clearPrivateQueryCaches, createQueryClient } from "./query-client";
it("removes account-private Admin and organization results while preserving public metadata", () => {
  const client = createQueryClient();
  client.setQueryData(["admin", "notifications"], ["A-private"]);
  client.setQueryData(["user", "org-A", "profile"], "A-profile");
  client.setQueryData(["public", "templates"], ["shared-template"]);
  clearPrivateQueryCaches(client);
  expect(client.getQueryData(["admin", "notifications"])).toBeUndefined();
  expect(client.getQueryData(["user", "org-A", "profile"])).toBeUndefined();
  expect(client.getQueryData(["public", "templates"])).toEqual(["shared-template"]);
  client.clear();
});
it("a previous account's late request cannot repopulate private caches", async () => {
  const client = createQueryClient(); let resolve!: (value: string) => void;
  const old = client.fetchQuery({ queryKey: ["admin", "notifications"], queryFn: () => new Promise<string>(r => { resolve = r; }) }).catch(() => "cancelled");
  clearPrivateQueryCaches(client); resolve("A-private"); await old;
  expect(client.getQueryData(["admin", "notifications"])).toBeUndefined();
  client.setQueryData(["admin", "notifications"], "B-private");
  await Promise.resolve(); expect(client.getQueryData(["admin", "notifications"])).toBe("B-private");
  client.clear();
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { SignedStorageUrlCache } from "./signed-storage-url-cache";

const deferred = () => {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(r => { resolve = r; });
  return { promise, resolve };
};
function fixture() {
  let now = 1_000;
  let context: { identity: string; expiresAt: number } | null = { identity: "A/session1", expiresAt: 10_000_000 };
  const cache = new SignedStorageUrlCache(() => now);
  const sign = vi.fn(async () => "authorized-url");
  const read = async () => context;
  return { cache, sign, read, resolve: () => cache.resolve("private/file", read, sign),
    setContext: (value: typeof context) => { context = value; }, advance: (ms: number) => { now += ms; } };
}
afterEach(() => vi.useRealTimers());
describe("signed Storage URL authorization cache", () => {
  it("hits the same user's cache without signing again", async () => {
    const f = fixture(); expect(await f.resolve()).toBe("authorized-url");
    expect(await f.resolve()).toBe("authorized-url"); expect(f.sign).toHaveBeenCalledTimes(1);
  });
  it("deduplicates concurrent authorized signing", async () => {
    const f = fixture(); const work = deferred(); f.sign.mockImplementation(() => work.promise);
    const requests = [f.resolve(), f.resolve(), f.resolve()]; await vi.waitFor(() => expect(f.sign).toHaveBeenCalledTimes(1));
    work.resolve("authorized-url"); expect(await Promise.all(requests)).toEqual(Array(3).fill("authorized-url"));
  });
  it("does not reuse A's URL for B even without an auth event", async () => {
    const f = fixture(); await f.resolve(); f.setContext({ identity: "B/session1", expiresAt: Infinity });
    f.sign.mockResolvedValue("B-url"); expect(await f.resolve()).toBe("B-url"); expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("invalidates on logout", async () => {
    const f = fixture(); await f.resolve(); f.cache.clear(); f.setContext(null);
    expect(await f.resolve()).toBe(""); expect(f.sign).toHaveBeenCalledTimes(1);
  });
  it("rejects a pending A result after logout and B sign-in", async () => {
    const f = fixture(); const work = deferred(); f.sign.mockImplementationOnce(() => work.promise);
    const a = f.resolve(); await vi.waitFor(() => expect(f.sign).toHaveBeenCalledTimes(1));
    f.cache.clear(); f.setContext({ identity: "B/session1", expiresAt: Infinity });
    f.sign.mockResolvedValue("B-url"); expect(await f.resolve()).toBe("B-url");
    work.resolve("A-url"); expect(await a).toBe(""); expect(await f.resolve()).toBe("B-url");
    expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("rejects stale context reads across an auth transition", async () => {
    const f = fixture(); let release!: (v: { identity: string; expiresAt: number }) => void;
    const read = () => new Promise<{ identity: string; expiresAt: number }>(r => { release = r; });
    const result = f.cache.resolve("file", read, f.sign); f.cache.clear();
    release({ identity: "A", expiresAt: Infinity }); expect(await result).toBe(""); expect(f.sign).not.toHaveBeenCalled();
  });
  it("refreshes expired client freshness rather than returning an old bearer URL", async () => {
    const f = fixture(); await f.resolve(); f.advance(60_001); f.sign.mockResolvedValue("fresh-url");
    expect(await f.resolve()).toBe("fresh-url"); expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("does not use a cache hit after session expiration", async () => {
    const f = fixture(); f.setContext({ identity: "A/session1", expiresAt: 2_000 }); await f.resolve(); f.advance(1_001);
    expect(await f.resolve()).toBe(""); expect(f.sign).toHaveBeenCalledTimes(1);
  });
  it("scopes token refresh to the new credential", async () => {
    const f = fixture(); await f.resolve(); f.setContext({ identity: "A/session2", expiresAt: Infinity });
    await f.resolve(); expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("retries transient errors immediately without a negative cache", async () => {
    const f = fixture(); f.sign.mockRejectedValueOnce(new Error("timeout"));
    expect(await f.resolve()).toBe(""); expect(await f.resolve()).toBe("authorized-url"); expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("does not permanently cache not-found or authorization failures", async () => {
    const f = fixture(); f.sign.mockResolvedValueOnce("").mockResolvedValueOnce("");
    expect(await f.resolve()).toBe(""); expect(await f.resolve()).toBe(""); expect(await f.resolve()).toBe("authorized-url");
  });
  it("does not return an old URL when reauthorization denies access", async () => {
    const f = fixture(); await f.resolve(); f.advance(60_001); f.sign.mockResolvedValue("");
    expect(await f.resolve()).toBe(""); expect(await f.resolve()).toBe(""); expect(f.sign).toHaveBeenCalledTimes(3);
  });
  it("clears cached authorization after suspension/permission-change notification", async () => {
    const f = fixture(); await f.resolve(); f.cache.clear(); f.sign.mockResolvedValue("");
    expect(await f.resolve()).toBe(""); expect(f.sign).toHaveBeenCalledTimes(2);
  });
  it("does not log signed URLs from exceptions", async () => {
    const f = fixture(); const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try { f.sign.mockRejectedValue(new Error("sensitive-bearer-url")); await f.resolve(); expect(warn).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); }
    finally { warn.mockRestore(); error.mockRestore(); }
  });
  it("bounds a hung signing request and permits a future retry", async () => {
    vi.useFakeTimers(); const f = fixture(); const work = deferred(); f.sign.mockImplementationOnce(() => work.promise);
    const result = f.resolve(); await vi.advanceTimersByTimeAsync(30_001); expect(await result).toBe("");
    expect(await f.resolve()).toBe("authorized-url"); work.resolve("late-url"); await Promise.resolve();
    expect(await f.resolve()).toBe("authorized-url");
  });
});

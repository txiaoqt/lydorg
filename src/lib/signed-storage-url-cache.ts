/** In-memory bearer URL cache. Clearing it cannot revoke URLs already issued by Storage. */
export class SignedStorageUrlCache {
  private generation = 0;
  private authGeneration = 0;
  private context: string | null = null;
  private values = new Map<string, { url: string; expiresAt: number }>();
  private pending = new Map<string, Promise<string>>();

  constructor(private readonly now: () => number = Date.now) {}

  clear() {
    this.authGeneration++;
    this.generation++;
    this.context = null;
    this.values.clear();
    this.pending.clear();
  }

  async resolve(
    key: string,
    readContext: () => Promise<{ identity: string; expiresAt: number } | null>,
    sign: () => Promise<string>,
  ): Promise<string> {
    const readingGeneration = this.authGeneration;
    let context: Awaited<ReturnType<typeof readContext>>;
    try { context = await readContext(); } catch { return ""; }
    if (readingGeneration !== this.authGeneration || !context || context.expiresAt <= this.now()) return "";
    if (this.context !== context.identity) {
      this.generation++;
      this.values.clear();
      this.pending.clear();
      this.context = context.identity;
    }
    const generation = this.generation;
    const cached = this.values.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.url;
    this.values.delete(key);
    const pending = this.pending.get(key);
    if (pending) return pending;

    const resolution = (async () => {
      try {
        // Storage signing has no cancellation API. Bound the pending cache lifetime;
        // a late response is discarded and never populates the cache.
        let timeout: ReturnType<typeof setTimeout>;
        const url = await Promise.race([
          Promise.resolve().then(sign),
          new Promise<string>(resolve => { timeout = setTimeout(() => resolve(""), 30_000); }),
        ]).finally(() => clearTimeout(timeout));
        const current = await readContext();
        if (generation !== this.generation || current?.identity !== context.identity ||
            current.expiresAt <= this.now()) return "";
        if (url) {
          if (this.values.size >= 256) this.values.delete(this.values.keys().next().value!);
          // Recheck authorization on the next preview after one minute. The URL's
          // server expiry is longer; this TTL only controls frontend reuse.
          this.values.set(key, { url, expiresAt: Math.min(this.now() + 60_000, context.expiresAt) });
        }
        return url;
      } catch {
        // No negative caching or raw error logging: retries must remain possible,
        // and errors may contain bearer URLs or other sensitive request details.
        return "";
      } finally {
        if (generation === this.generation && this.pending.get(key) === resolution) this.pending.delete(key);
      }
    })();
    this.pending.set(key, resolution);
    return resolution;
  }
}

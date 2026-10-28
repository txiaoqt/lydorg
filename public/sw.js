const CACHE_NAME = "y-trace-v13";
const CACHE_PREFIX = "y-trace-";
const APP_SHELL_PATH = "/index.html";
const REQUIRED_STATIC_ASSETS = ["/pwa-theme-init.js"];
const OPTIONAL_STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/manifest-admin.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/y-trace-logo-blue.png",
  "/y-trace-logo.png",
];

function isVersionedBuildAsset(url) {
  if (url.origin !== self.location.origin || url.search || url.hash) return false;
  return /^\/assets\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|avif)$/i.test(url.pathname);
}

function getShellAssetUrls(html) {
  const assetUrls = new Set();
  let hasEntryScript = false;
  let hasStylesheet = false;
  const tags = html.matchAll(/<(script|link)\b[^>]*>/gi);

  for (const [tag] of tags) {
    const tagName = tag.match(/^<(script|link)\b/i)?.[1]?.toLowerCase();
    const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    const href = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    const rawUrl = src ?? href;
    if (!rawUrl) continue;

    const url = new URL(rawUrl, self.location.origin);
    if (!isVersionedBuildAsset(url)) continue;

    if (tagName === "script" && src && /\btype\s*=\s*(["'])module\1/i.test(tag) && url.pathname.endsWith(".js")) {
      hasEntryScript = true;
    }
    if (tagName === "link" && href && /\brel\s*=\s*(["'])stylesheet\1/i.test(tag) && url.pathname.endsWith(".css")) {
      hasStylesheet = true;
    }

    assetUrls.add(url.pathname);
  }

  if (!hasEntryScript || !hasStylesheet) {
    throw new Error("The application shell is missing a versioned JavaScript entry or stylesheet.");
  }

  return [...assetUrls];
}

function isKnownStaticShellAsset(url) {
  if (url.origin !== self.location.origin || url.search || url.hash) return false;
  return REQUIRED_STATIC_ASSETS.includes(url.pathname) || OPTIONAL_STATIC_ASSETS.includes(url.pathname);
}

async function cacheSuccessfulResponse(cache, request, response) {
  if (!response || !response.ok || response.type !== "basic") return response;
  await cache.put(request, response.clone());
  return response;
}

async function fetchVersionedAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    return await cacheSuccessfulResponse(cache, request, response);
  } catch {
    return Response.error();
  }
}

async function fetchStaticShellAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    return await cacheSuccessfulResponse(cache, request, response);
  } catch {
    return Response.error();
  }
}

async function navigateToApp(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cachedShell = await cache.match(APP_SHELL_PATH);
    if (cachedShell) return cachedShell;

    return new Response(
      "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Y-TRACE connection required</title><body><main role=\"alert\"><h1>Y-TRACE needs an internet connection</h1><p>Reconnect to the internet, then reopen the app.</p></main></body></html>",
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellUrl = new URL(APP_SHELL_PATH, self.location.origin);
    const shellResponse = await fetch(new Request(shellUrl, { cache: "reload" }));
    if (!shellResponse.ok || shellResponse.type !== "basic") {
      throw new Error("Unable to cache the application shell.");
    }

    const shellHtml = await shellResponse.clone().text();
    const shellAssets = getShellAssetUrls(shellHtml);
    await cache.put(APP_SHELL_PATH, shellResponse.clone());
    await cache.put("/", shellResponse.clone());

    await Promise.all(shellAssets.map(async (pathname) => {
      const response = await fetch(new Request(new URL(pathname, self.location.origin), { cache: "reload" }));
      if (!response.ok || response.type !== "basic") {
        throw new Error("Unable to cache a required application asset.");
      }
      await cache.put(pathname, response);
    }));

    await Promise.all(REQUIRED_STATIC_ASSETS.map(async (pathname) => {
      const request = new Request(new URL(pathname, self.location.origin), { cache: "reload" });
      const response = await fetch(request);
      if (!response.ok || response.type !== "basic") {
        throw new Error("Unable to cache a required application startup script.");
      }
      await cache.put(pathname, response);
    }));

    await Promise.allSettled(OPTIONAL_STATIC_ASSETS.map((pathname) => cache.add(pathname)));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(navigateToApp(event.request));
    return;
  }

  if (isVersionedBuildAsset(url)) {
    event.respondWith(fetchVersionedAsset(event.request));
    return;
  }

  if (isKnownStaticShellAsset(url)) {
    event.respondWith(fetchStaticShellAsset(event.request));
  }
});

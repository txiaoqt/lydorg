const CACHE_NAME = "lydo-connect-v5";
const APP_SHELL = [
  "/",
  "/admin",
  "/signin",
  "/index.html",
  "/manifest.webmanifest",
  "/manifest-admin.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/assets/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (event.request.mode === "navigate") {
      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          cache.put("/index.html", response.clone()).catch(() => {});
          return response;
        }
      } catch {
      }

      const cachedIndex = await cache.match("/index.html");
      if (cachedIndex) return cachedIndex;

      const rootFallback = await cache.match("/");
      if (rootFallback) return rootFallback;

      return new Response("Offline", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const cached = await cache.match(event.request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(event.request);
      if (response && response.ok && response.type === "basic") {
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const origin = 'https://ytrace.test';
const shellHtml = `<!doctype html><html><head>
  <script type="module" crossorigin src="/assets/index-AbCdEf123.js"></script>
  <link rel="modulepreload" href="/assets/vendor-XyZ12345.js">
  <link rel="stylesheet" crossorigin href="/assets/index-QwErTy12.css">
</head><body><div id="root"></div></body></html>`;

function response(body = 'asset', { status = 200, type = 'basic', contentType = 'text/javascript' } = {}) {
  return {
    body,
    status,
    ok: status >= 200 && status < 300,
    type,
    headers: new Map([['content-type', contentType]]),
    clone() { return response(body, { status, type, contentType }); },
    async text() { return body; },
  };
}

async function createWorker({ failAssetPath = null, offline = false } = {}) {
  const listeners = new Map();
  const cacheStores = new Map();
  const calls = [];
  let isOffline = offline;
  let skipWaitingCalls = 0;
  let claimCalls = 0;

  const requestKey = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  const cacheApi = {
    async open(name) {
      if (!cacheStores.has(name)) cacheStores.set(name, new Map());
      const entries = cacheStores.get(name);
      return {
        async match(request) { return entries.get(requestKey(request)); },
        async put(request, value) { entries.set(requestKey(request), value); },
        async add(request) {
          const key = requestKey(request);
          const value = await fetchImpl(new Request(key));
          if (!value.ok) throw new Error('cache add failed');
          entries.set(key, value.clone());
        },
        async keys() { return [...entries.keys()].map((url) => new Request(url)); },
      };
    },
    async keys() { return [...cacheStores.keys()]; },
    async delete(name) { return cacheStores.delete(name); },
  };

  async function fetchImpl(request) {
    const url = new URL(typeof request === 'string' ? request : request.url, origin);
    calls.push(url.href);
    if (isOffline) throw new Error('offline');
    if (failAssetPath === url.pathname) return response('missing', { status: 404 });
    if (url.pathname === '/index.html' || url.pathname === '/') return response(shellHtml, { contentType: 'text/html' });
    if (url.pathname === '/pwa-theme-init.js') return response('theme();');
    if (url.pathname === '/manifest.webmanifest') return response('{}', { contentType: 'application/manifest+json' });
    return response('static asset');
  }

  const self = {
    location: { origin },
    clients: { async claim() { claimCalls++; } },
    addEventListener(name, handler) { listeners.set(name, handler); },
    async skipWaiting() { skipWaitingCalls++; },
  };

  const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, {
    self,
    caches: cacheApi,
    fetch: fetchImpl,
    URL,
    Request,
    Response,
    Promise,
    Error,
  });

  async function dispatch(name, eventProps = {}) {
    const waits = [];
    let responsePromise;
    const event = {
      ...eventProps,
      waitUntil(promise) { waits.push(Promise.resolve(promise)); },
      respondWith(promise) { responsePromise = Promise.resolve(promise); },
    };
    listeners.get(name)(event);
    await Promise.all(waits);
    return { responsePromise, waits };
  }

  return {
    dispatch,
    calls,
    cacheStores,
    setOffline(value) { isOffline = value; },
    get skipWaitingCalls() { return skipWaitingCalls; },
    get claimCalls() { return claimCalls; },
  };
}

test('install precaches HTML shell, entry JS, stylesheet, modulepreload chunk and startup script', async () => {
  const worker = await createWorker();
  await worker.dispatch('install');
  const keys = [...worker.cacheStores.get('y-trace-v13').keys()].map((key) => new URL(key).pathname);
  assert.ok(keys.includes('/index.html'));
  assert.ok(keys.includes('/'));
  assert.ok(keys.includes('/assets/index-AbCdEf123.js'));
  assert.ok(keys.includes('/assets/vendor-XyZ12345.js'));
  assert.ok(keys.includes('/assets/index-QwErTy12.css'));
  assert.ok(keys.includes('/pwa-theme-init.js'));
  assert.equal(worker.skipWaitingCalls, 1);
});

test('failed required JS asset prevents installation instead of activating an incomplete shell', async () => {
  const worker = await createWorker({ failAssetPath: '/assets/index-AbCdEf123.js' });
  await assert.rejects(worker.dispatch('install'), /required application asset/i);
});

test('offline navigation returns the cached HTML shell', async () => {
  const worker = await createWorker();
  await worker.dispatch('install');
  worker.setOffline(true);
  const navigation = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'navigate', url: origin + '/app-start' },
  });
  const result = await navigation.responsePromise;
  assert.match(await result.text(), /id="root"/);
});

test('offline navigation shows a clear connection-required page if no shell could be cached', async () => {
  const worker = await createWorker({ offline: true });
  const navigation = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'navigate', url: origin + '/app-start' },
  });
  const result = await navigation.responsePromise;
  assert.match(await result.text(), /Y-TRACE needs an internet connection/i);
});

test('runtime caches only fingerprinted same-origin application assets', async () => {
  const worker = await createWorker();
  await worker.dispatch('install');
  const event = await worker.dispatch('fetch', {
    request: new Request(origin + '/assets/UserPortal-AaBbCcDd.js'),
  });
  assert.equal((await event.responsePromise).ok, true);
  assert.ok(worker.cacheStores.get('y-trace-v13').has(origin + '/assets/UserPortal-AaBbCcDd.js'));
  worker.setOffline(true);
  const offlineAsset = await worker.dispatch('fetch', {
    request: new Request(origin + '/assets/UserPortal-AaBbCcDd.js'),
  });
  assert.equal((await offlineAsset.responsePromise).ok, true);
  worker.setOffline(false);

  const signedLikeAsset = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: origin + '/assets/UserPortal-AaBbCcDd.js?token=private' },
  });
  const apiRequest = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: origin + '/rest/v1/organizations?select=*' },
  });
  const authRequest = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: origin + '/auth/v1/user' },
  });
  const storageRequest = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: origin + '/storage/v1/object/sign/private/file.pdf?token=secret' },
  });
  const pdfRequest = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: origin + '/assets/private-file-AbCdEf123.pdf' },
  });
  const externalRequest = await worker.dispatch('fetch', {
    request: { method: 'GET', mode: 'cors', url: 'https://zroudsvpswqsjlyttkjf.supabase.co/auth/v1/user' },
  });

  for (const ignored of [signedLikeAsset, apiRequest, authRequest, storageRequest, pdfRequest, externalRequest]) {
    assert.equal(ignored.responsePromise, undefined);
  }
  const cached = [...worker.cacheStores.values()].flatMap((entries) => [...entries.keys()]);
  assert.ok(!cached.some((key) => /\/rest\/v1|\/auth\/v1|\/storage\/v1|\.pdf(?:\?|$)|[?](?:token|signature|jwt)=/i.test(key)));
  assert.ok(!cached.some((key) => key.includes('supabase.co')));
});

test('activation removes obsolete Y-TRACE caches but preserves unrelated origin caches', async () => {
  const worker = await createWorker();
  worker.cacheStores.set('y-trace-v12', new Map());
  worker.cacheStores.set('other-app-cache', new Map());
  await worker.dispatch('activate');
  assert.ok(!worker.cacheStores.has('y-trace-v12'));
  assert.ok(worker.cacheStores.has('other-app-cache'));
  assert.equal(worker.claimCalls, 1);
});

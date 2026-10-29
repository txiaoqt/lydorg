// Isolated installed-PWA UAT against staging. Never logs credentials, tokens, or signed URLs.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import { resolve, relative, sep, isAbsolute } from 'node:path';
import { openHarness, sanitizeText, STAGING } from './browser-uat-harness.mjs';

const root = resolve(process.cwd());
const base = 'http://127.0.0.1:4175';
const stageHost = STAGING + '.supabase.co';
const productionProject = 'mqqaykksadotbrghbexz';
const expectedFileName = 'SYNTHETIC-renewal-corrected.pdf';
const expectedSha256 = '67bba8968f41f97923e82f9fcfcf2d90871de9605d1b897ff336d452652a4f0d';
const authStorageKey = 'sb-' + STAGING + '-auth-token';
const probeUrl = 'https://pwa-egress-probe.invalid/network-check';
const runLabel = 'installed-pwa-uat-20261011-' + new Date().toISOString().replace(/\D/g, '').slice(8, 16);
const audit = { projectRef: STAGING, runLabel, environment: 'isolated-local-production-build', installedPwa: {}, networkIsolation: {}, checks: [], http: [], blocked: [], errors: [], operationErrors: [], console: { error: 0, warning: 0, sanitizedSamples: [] }, websockets: [] };
let proxy, preview, context, browser, h, appId, browserCdp, testProfile;
let serviceWorkerBackupPath, serviceWorkerBackupContents;

function mark(name, status, details = {}) {
  audit.checks.push({ name, status, ...details });
}

function output(value) {
  process.stdout.write(JSON.stringify(value) + '\n');
}

function safeError(error) {
  return { name: error?.name ?? 'Error', reason: sanitizeText(error?.message ?? String(error)).slice(0, 180) };
}

async function startAllowlistProxy() {
  const counts = { allowedStagingTls: 0, blockedTotal: 0, blockedProduction: 0, blockedUnrelated: 0 };
  const server = createServer((_req, res) => {
    counts.blockedTotal++;
    counts.blockedUnrelated++;
    res.writeHead(403, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end('Blocked by staging-only UAT egress proxy.');
  });
  server.on('connect', (req, client, head) => {
    const [host, port] = String(req.url).toLowerCase().split(':');
    if (host !== stageHost || port !== '443') {
      counts.blockedTotal++;
      if (host.includes(productionProject)) counts.blockedProduction++;
      else counts.blockedUnrelated++;
      client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    const upstream = net.connect({ host: stageHost, port: 443 });
    upstream.once('connect', () => {
      counts.allowedStagingTls++;
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head?.length) upstream.write(head);
      client.pipe(upstream);
      upstream.pipe(client);
    });
    upstream.once('error', () => client.destroy());
    client.once('error', () => upstream.destroy());
    client.once('close', () => upstream.destroy());
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, port: server.address().port, counts };
}

async function startPreview() {
  const child = spawn(process.execPath, [
    resolve(root, 'node_modules/vite/bin/vite.js'), 'preview',
    '--config', 'tmp/ytrace-staging-vite/vite.config.ts',
    '--outDir', 'tmp/ytrace-installed-pwa-build',
    '--host', '127.0.0.1', '--port', '4175', '--strictPort',
  ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let startupError = '';
  child.stderr.on('data', chunk => { startupError += String(chunk).slice(0, 200); });
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Local preview exited during startup: ' + sanitizeText(startupError));
    try {
      const response = await fetch(base + '/manifest.webmanifest');
      if (response.ok) return child;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  child.kill();
  throw new Error('Local built-app preview did not become ready.');
}

async function visibleButton(name) {
  const matches = h.page.getByRole('button', { name, exact: true });
  for (let index = 0; index < await matches.count(); index++) {
    const item = matches.nth(index);
    if (await item.isVisible()) return item;
  }
  throw new Error('Visible button unavailable: ' + name);
}

async function login(actor, expectedEmail, checkName) {
  h.phase = 'organization-login';
  await h.page.goto(base + '/signin', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.locator('#email').fill(actor.email);
  await h.page.locator('#password').fill(actor.password);
  await h.page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await h.page.waitForTimeout(5500);
  const state = await h.page.evaluate(({ key, email }) => {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    return {
      route: location.pathname,
      authPresent: Boolean(session?.access_token),
      expectedIdentity: session?.user?.email === email,
      onSignInPage: location.pathname === '/signin',
    };
  }, { key: authStorageKey, email: expectedEmail });
  mark(checkName, state.authPresent && state.expectedIdentity && !state.onSignInPage ? 'PASS' : 'FAIL', {
    route: state.route,
    authSessionPresent: state.authPresent,
    identityMatchesFixture: state.expectedIdentity,
  });
  if (!state.authPresent || !state.expectedIdentity || state.onSignInPage) throw new Error('Normal organization login did not reach the expected staging identity.');
}

async function installedLaunch() {
  const pagesBefore = new Set(context.pages());
  const nextPage = context.waitForEvent('page', { timeout: 20000 }).catch(() => null);
  const launched = await browserCdp.send('PWA.launch', { manifestId: appId });
  const page = await nextPage;
  if (!page || pagesBefore.has(page)) throw new Error('Chrome did not create an installed-app window.');
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => ({
    standalone: matchMedia('(display-mode: standalone)').matches,
    hasController: Boolean(navigator.serviceWorker?.controller),
    path: location.pathname,
  }));
  h.page = page;
  return { page, targetIdReturned: Boolean(launched.targetId), ...state };
}

async function cacheInventory() {
  return h.page.evaluate(async () => {
    const names = await caches.keys();
    let entries = 0, externalEntries = 0, signedQueryEntries = 0, queryEntries = 0;
    const paths = [];
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        entries++;
        const url = new URL(request.url);
        paths.push(url.pathname);
        if (url.origin !== location.origin) externalEntries++;
        if (url.search) queryEntries++;
        if ([...url.searchParams.keys()].some(key => /token|signature|jwt/i.test(key))) signedQueryEntries++;
      }
    }
    const appCache = await caches.open('y-trace-v13');
    const shell = await appCache.match('/index.html');
    const shellHtml = shell ? new DOMParser().parseFromString(await shell.text(), 'text/html') : null;
    const requiredAssets = shellHtml ? [
      ...[...shellHtml.querySelectorAll('script[type="module"][src], link[rel="modulepreload"][href], link[rel="stylesheet"][href]')]
        .map(element => element.getAttribute('src') || element.getAttribute('href'))
        .filter(Boolean)
        .map(path => new URL(path, location.origin).pathname),
      '/pwa-theme-init.js',
    ] : [];
    const cachedPaths = new Set(paths);
    const missingRequiredAssets = requiredAssets.filter(path => !cachedPaths.has(path));
    const privateOrApiEntries = paths.filter(path => /\/(?:auth|rest|storage)\/v1(?:\/|$)|\.pdf$/i.test(path));
    return {
      cacheNames: names,
      entries,
      externalEntries,
      signedQueryEntries,
      queryEntries,
      appCachePresent: names.includes('y-trace-v13'),
      shellPresent: Boolean(shell),
      requiredAssetCount: requiredAssets.length,
      missingRequiredAssets,
      privateOrApiEntries,
    };
  });
}

async function testServiceWorkerNetworkBoundary() {
  const before = proxy.counts.blockedUnrelated;
  const result = await h.page.evaluate(async url => {
    const registration = await navigator.serviceWorker.register('/__pwa_network_probe/sw.js', { scope: '/__pwa_network_probe/' });
    if (registration.installing) {
      const installing = registration.installing;
      await new Promise((resolveReady, rejectReady) => {
        const timeout = setTimeout(() => rejectReady(new Error('Probe worker activation timed out.')), 10000);
        const finish = () => {
          if (installing.state === 'activated') { clearTimeout(timeout); resolveReady(); }
          if (installing.state === 'redundant') { clearTimeout(timeout); rejectReady(new Error('Probe worker became redundant.')); }
        };
        installing.addEventListener('statechange', finish);
        finish();
      });
    }
    const worker = registration.active;
    if (!worker) throw new Error('Probe service worker did not activate.');
    const reply = await new Promise((resolveReply, rejectReply) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => rejectReply(new Error('Probe service worker timed out.')), 8000);
      channel.port1.onmessage = event => { clearTimeout(timeout); resolveReply(event.data); };
      worker.postMessage({ type: 'network-probe', url }, [channel.port2]);
    });
    await registration.unregister();
    return reply;
  }, probeUrl);
  const proxyBlocked = proxy.counts.blockedUnrelated > before;
  const passed = result?.blocked === true && proxyBlocked;
  h.audit.networkIsolation.serviceWorkerProbeBlocked = result?.blocked === true;
  h.audit.networkIsolation.egressProxyDeniedProbe = proxyBlocked;
  mark('Service-worker-originated unrelated request is blocked below Playwright routing', passed ? 'PASS' : 'FAIL', {
    workerFetchRejected: result?.blocked === true,
    allowlistProxyDeniedRequest: proxyBlocked,
  });
  if (!passed) throw new Error('Service-worker network isolation probe did not prove proxy enforcement.');
}

async function saveAudit() {
  audit.finishedAt = new Date().toISOString();
  audit.networkIsolation.proxy = { ...proxy.counts };
  audit.networkIsolation.productionAttemptsBlocked = proxy.counts.blockedProduction;
  audit.networkIsolation.productionRequestsObservedByHarness = audit.blocked.filter(item => item.production).length;
  const dir = resolve(root, 'docs/staging-validation/2026-10-11/final-browser-uat');
  const file = resolve(dir, runLabel + '.json');
  await (await import('node:fs/promises')).mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(audit, null, 2), { flag: 'wx' });
  output({
    savedEvidence: relative(root, file).replaceAll('\\', '/'),
    checks: audit.checks,
    networkIsolation: audit.networkIsolation,
    httpCount: audit.http.length,
    errors: audit.errors.length,
    console: { errors: audit.console.error, warnings: audit.console.warning },
    operationErrors: audit.operationErrors,
  });
}

try {
  proxy = await startAllowlistProxy();
  const buildRootForProbe = await realpath(resolve(root, 'tmp/ytrace-installed-pwa-build'));
  const probeDirectory = resolve(root, 'tmp/ytrace-installed-pwa-build/__pwa_network_probe');
  await mkdir(probeDirectory, { recursive: true });
  const resolvedProbeDirectory = await realpath(probeDirectory);
  const probeDirectoryRelative = relative(buildRootForProbe, resolvedProbeDirectory);
  if (!probeDirectoryRelative || probeDirectoryRelative === '..' || probeDirectoryRelative.startsWith('..' + sep) || isAbsolute(probeDirectoryRelative)) {
    throw new Error('Service-worker network probe escaped the isolated temporary build directory.');
  }
  const probeWorkerSource = [
    'self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));',
    'self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));',
    'self.addEventListener("message", event => {',
    '  if (event.data?.type !== "network-probe") return;',
    '  const port = event.ports[0];',
    '  event.waitUntil((async () => {',
    '    let blocked = false;',
    '    try { const response = await fetch(event.data.url); blocked = !response.ok; await response.body?.cancel(); } catch { blocked = true; }',
    '    port?.postMessage({ blocked });',
    '  })());',
    '});',
  ].join('\n');
  const probeWorkerPath = resolve(probeDirectory, 'sw.js');
  try {
    await writeFile(probeWorkerPath, probeWorkerSource, { flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST' || await readFile(probeWorkerPath, 'utf8') !== probeWorkerSource) throw error;
  }
  preview = await startPreview();
  const profileParent = await realpath(resolve(root, 'tmp'));
  testProfile = await mkdtemp(resolve(profileParent, 'ytrace-installed-pwa-profile-'));
  const profileRealPath = await realpath(testProfile);
  if (!profileRealPath.startsWith(profileParent + sep)) throw new Error('Isolated Chrome profile escaped its task-local directory.');

  const resolverRules = 'MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE ' + stageHost;
  context = await chromium.launchPersistentContext(testProfile, {
    channel: 'chrome',
    headless: false,
    serviceWorkers: 'allow',
    acceptDownloads: true,
    viewport: { width: 1365, height: 900 },
    args: [
      '--proxy-server=http://127.0.0.1:' + proxy.port,
      '--proxy-bypass-list=localhost;127.0.0.1;[::1]',
      '--host-resolver-rules=' + resolverRules,
      '--disable-quic',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-sync',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  browser = context.browser();
  h = await openHarness(root, browser, base, { context, audit, allowServiceWorkerProbe: probeUrl });
  h.phase = 'service-worker-registration';
  await h.go('/app-start');
  await h.page.waitForFunction(() => navigator.serviceWorker?.getRegistration('/').then(registration => Boolean(registration?.active)), null, { timeout: 20000 });
  await h.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 20000 });
  const sw = await h.page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return {
      controlled: Boolean(navigator.serviceWorker.controller),
      active: registration.active?.state === 'activated',
      scopeIsAppRoot: new URL(registration.scope).pathname === '/',
      scriptHasVersionQuery: Boolean(registration.active?.scriptURL.includes('?v=')),
    };
  });
  mark('Production build registers and controls the installed PWA origin with the application service worker', Object.values(sw).every(Boolean) ? 'PASS' : 'FAIL', sw);
  audit.installedPwa.serviceWorkerInitially = sw;
  if (!Object.values(sw).every(Boolean)) throw new Error('Application service worker did not become active and control the app.');

  const initialShellCache = await cacheInventory();
  const shellCachePass = initialShellCache.appCachePresent && initialShellCache.shellPresent &&
    initialShellCache.requiredAssetCount >= 3 && initialShellCache.missingRequiredAssets.length === 0 &&
    initialShellCache.externalEntries === 0 && initialShellCache.queryEntries === 0 &&
    initialShellCache.privateOrApiEntries.length === 0;
  mark('Installed service worker has the HTML shell and every required versioned startup asset cached without private data', shellCachePass ? 'PASS' : 'FAIL', initialShellCache);
  if (!shellCachePass) throw new Error('The application shell or a required safe cache boundary is incomplete.');

  await testServiceWorkerNetworkBoundary();

  h.phase = 'pwa-install';
  const pageCdp = await context.newCDPSession(h.page);
  const appIdResult = await pageCdp.send('Page.getAppId');
  appId = appIdResult.appId || new URL('/app', base).toString();
  const localManifest = await h.page.locator('link[rel=manifest]').getAttribute('href').catch(() => null);
  browserCdp = pageCdp;
  await pageCdp.send('PWA.install', { manifestId: appId });
  await pageCdp.send('PWA.changeAppUserSettings', { manifestId: appId, displayMode: 'standalone' });
  let launched = await installedLaunch();
  if (!launched.standalone) {
    await launched.page.close();
    const appPageEvent = context.waitForEvent('page', { timeout: 20000 }).catch(() => null);
    await pageCdp.send('PWA.openCurrentPageInApp', { manifestId: appId });
    const appPage = await appPageEvent;
    if (appPage) {
      await appPage.waitForLoadState('domcontentloaded', { timeout: 20000 });
      await appPage.waitForTimeout(1200);
      const state = await appPage.evaluate(() => ({
        standalone: matchMedia('(display-mode: standalone)').matches,
        hasController: Boolean(navigator.serviceWorker?.controller),
        path: location.pathname,
      }));
      h.page = appPage;
      launched = { page: appPage, targetIdReturned: true, ...state };
    }
  }
  const installed = launched.standalone && launched.hasController && launched.targetIdReturned;
  audit.installedPwa = {
    browserVersion: browser.version(),
    localProductionBuild: true,
    serviceWorkerInitially: sw,
    manifestLinked: Boolean(localManifest),
    appIdDerivedFromManifest: Boolean(appIdResult.appId),
    installedViaChromePwaProtocol: true,
    standaloneLaunch: launched.standalone,
    appWindowServiceWorkerControlled: launched.hasController,
    startPath: launched.path,
    testProfileIsolated: true,
  };
  mark('Chrome installed and launched the local app in standalone mode with the real service worker', installed ? 'PASS' : 'FAIL', {
    standalone: launched.standalone,
    serviceWorkerControlled: launched.hasController,
    manifestLinked: Boolean(localManifest),
  });
  if (!installed) throw new Error('Chrome did not launch the PWA in standalone mode.');

  const owner = h.fixtures.renewalScenario;
  const other = h.fixtures.actors.B;
  if (!owner?.email?.endsWith('@example.invalid') || !owner?.password || !other?.email?.endsWith('@example.invalid') || !other?.password) {
    throw new Error('Existing synthetic staging actors failed local fixture validation.');
  }
  await login(owner, owner.email, 'Existing synthetic renewal owner login through installed PWA');
  h.phase = 'renewal-preview-download';
  await h.go('/app/renewals');
  const targetFile = owner.files?.find(file => file.fileName === expectedFileName && file.sha256 === expectedSha256 && file.kind === 'renewal-corrected');
  if (!targetFile?.metadataId || !owner.renewalSubmission?.id) throw new Error('Recorded corrected renewal metadata is incomplete.');
  const fileLink = await h.page.evaluate(async ({ apiOrigin, anonKey, storageKey, metadataId, expectedParent, fileName }) => {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch {}
    if (!session?.access_token || !anonKey) return { status: 0, rowCount: 0, parentMatches: false, filenameMatches: false, documentTypeName: null };
    const params = new URLSearchParams({
      select: 'id,submission_id,file_name,document_type_id,required_document_types(name)',
      id: 'eq.' + metadataId,
    });
    const response = await fetch(apiOrigin + '/rest/v1/document_submission_files?' + params.toString(), {
      headers: { apikey: anonKey, Authorization: 'Bearer ' + session.access_token, Accept: 'application/json' },
    });
    const rows = response.ok ? await response.json() : [];
    const row = rows.length === 1 ? rows[0] : null;
    return {
      status: response.status,
      rowCount: rows.length,
      parentMatches: row?.submission_id === expectedParent,
      filenameMatches: row?.file_name === fileName,
      documentTypeName: row?.required_document_types?.name ?? null,
    };
  }, {
    apiOrigin: h.env.YTRACE_STAGING_SUPABASE_URL,
    anonKey: h.env.YTRACE_STAGING_ANON_KEY,
    storageKey: authStorageKey,
    metadataId: targetFile.metadataId,
    expectedParent: owner.renewalSubmission.id,
    fileName: expectedFileName,
  });
  const targetMetadataPass = fileLink.status === 200 && fileLink.rowCount === 1 && fileLink.parentMatches && fileLink.filenameMatches && Boolean(fileLink.documentTypeName);
  mark('Owner-scoped read confirms the exact corrected PDF belongs to the approved renewal packet', targetMetadataPass ? 'PASS' : 'FAIL', {
    httpStatus: fileLink.status,
    rowCount: fileLink.rowCount,
    expectedParentMatches: fileLink.parentMatches,
    filenameMatchesExpected: fileLink.filenameMatches,
    documentTypeResolved: Boolean(fileLink.documentTypeName),
  });
  if (!targetMetadataPass) throw new Error('Exact corrected renewal document could not be linked to the approved parent through owner-scoped read access.');
  const heading = h.page.locator('.pwa-renewal-page').getByRole('heading', { name: fileLink.documentTypeName, exact: true });
  if (await heading.count() !== 1) throw new Error('The corrected document type does not resolve to one visible renewal requirement.');
  const card = heading.locator('xpath=ancestor::div[contains(concat(\" \", normalize-space(@class), \" \"), \" rounded-2xl \")][1]');
  const attached = card.getByText('View Attached →', { exact: true });
  await attached.waitFor({ state: 'visible', timeout: 20000 });
  await attached.click();
  const panel = h.page.getByRole('dialog');
  await panel.waitFor({ state: 'visible', timeout: 12000 });
  await h.page.waitForFunction(() => {
    const canvas = document.querySelector('[role=\"dialog\"] canvas');
    return Boolean(canvas && canvas.width > 300 && canvas.height > 400);
  }, null, { timeout: 20000 });
  const previewState = await panel.evaluate(element => {
    const text = element.innerText || '';
    const canvas = element.querySelector('canvas');
    return {
      filenameVisible: text.includes('SYNTHETIC-renewal-corrected.pdf'),
      renderedPdfCanvas: Boolean(canvas && canvas.width > 300 && canvas.height > 400),
      failureVisible: /could not be loaded|preview is not available/i.test(text),
      signedMaterialInTitle: /eyJ[A-Za-z0-9_-]{8,}\.|[?&](?:token|signature)=/i.test(document.title + ' ' + text),
    };
  });
  const previewPass = previewState.filenameVisible && previewState.renderedPdfCanvas && !previewState.failureVisible && !previewState.signedMaterialInTitle;
  mark('Installed PWA preview renders the approved renewal PDF with its safe filename', previewPass ? 'PASS' : 'FAIL', previewState);
  if (!previewPass) throw new Error('Installed PWA preview did not render the expected PDF safely.');

  const downloadButton = await visibleButton('Download File');
  const [download] = await Promise.all([
    h.page.waitForEvent('download', { timeout: 20000 }),
    downloadButton.click(),
  ]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Chrome did not expose the downloaded PDF bytes.');
  const hash = (await import('node:crypto')).createHash('sha256');
  let size = 0;
  for await (const chunk of stream) { hash.update(chunk); size += chunk.length; }
  const digest = hash.digest('hex');
  const filenameMatches = download.suggestedFilename() === expectedFileName;
  const filenameContainsSecretShape = /eyJ[A-Za-z0-9_-]{8,}\.|[?&](?:token|signature)=/i.test(download.suggestedFilename());
  const downloadPass = size === 674 && digest === expectedSha256 && filenameMatches && !filenameContainsSecretShape;
  mark('Installed PWA Download is a genuine Chrome download with the expected bytes and filename', downloadPass ? 'PASS' : 'FAIL', {
    browserDownloadEvent: true,
    size,
    sha256: digest,
    hashMatchesPriorVerifiedPDF: digest === expectedSha256,
    filenameMatchesExpected: filenameMatches,
    filenameContainsSignedQueryTraits: filenameContainsSecretShape,
  });
  if (!downloadPass) throw new Error('Installed PWA downloaded bytes or filename did not match the existing verified PDF.');

  h.phase = 'open-document-in-browser';
  const openInNewTabButton = await visibleButton('Open in New Tab');
  const [popup] = await Promise.all([
    h.page.waitForEvent('popup', { timeout: 20000 }),
    openInNewTabButton.click(),
  ]);
  await popup.waitForTimeout(2500);
  const popupState = await popup.evaluate(stagingRef => {
    const current = new URL(location.href);
    const src = current.searchParams.get('src');
    const target = src ? new URL(src) : current;
    const title = document.title;
    const values = [...target.searchParams.values()];
    return {
      distinctWindow: true,
      stagingPdfTarget: target.hostname === stagingRef + '.supabase.co' && /^\/storage\/v1\/object\/(?:sign|authenticated)\//.test(target.pathname),
      titleContainsQueryValue: values.some(value => value.length > 8 && title.includes(value)),
      titleLooksLikeJwt: /eyJ[A-Za-z0-9_-]{8,}\./.test(title),
      titlePresent: Boolean(title),
    };
  }, STAGING);
  const nestedPreviewCount = await h.page.getByRole('dialog').count();
  const popupPass = popupState.distinctWindow && popupState.stagingPdfTarget && !popupState.titleContainsQueryValue && !popupState.titleLooksLikeJwt && nestedPreviewCount === 1;
  mark('Installed PWA Open in browser opens the staging PDF in a distinct window without token-derived title', popupPass ? 'PASS' : 'FAIL', { ...popupState, existingPreviewCount: nestedPreviewCount });
  await popup.close();
  if (!popupPass) throw new Error('Open in browser did not stay separate from the document preview.');

  const cache = await cacheInventory();
  const cachePass = cache.externalEntries === 0 && cache.signedQueryEntries === 0 &&
    cache.queryEntries === 0 && cache.privateOrApiEntries.length === 0;
  mark('Service-worker CacheStorage contains no external documents, API/auth responses, or query-bearing references', cachePass ? 'PASS' : 'FAIL', cache);
  if (!cachePass) throw new Error('Service-worker cache contains a private or query-bearing entry.');

  const mobile = await h.page.evaluate(() => ({ standalone: matchMedia('(display-mode: standalone)').matches }));
  await h.page.setViewportSize({ width: 390, height: 844 });
  await h.page.waitForTimeout(900);
  const mobileLayout = await h.page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    previewVisible: Boolean(document.querySelector('[role=\"dialog\"]')),
    downloadVisible: [...document.querySelectorAll('button')].some(button => /^(Download|Download File)$/.test(button.innerText.trim()) && button.getBoundingClientRect().width > 0),
  }));
  const mobilePass = mobile.standalone && mobileLayout.viewport === 390 && mobileLayout.documentWidth <= 390 && mobileLayout.previewVisible && mobileLayout.downloadVisible;
  mark('Mobile-sized standalone app window keeps preview and download controls usable without horizontal overflow', mobilePass ? 'PASS' : 'FAIL', mobileLayout);
  await h.page.setViewportSize({ width: 1365, height: 900 });
  const closeDrawer = await visibleButton('Close document drawer');
  await closeDrawer.click();
  await h.page.waitForTimeout(500);

  h.phase = 'installed-app-restart';
  await h.page.close();
  const relaunched = await installedLaunch();
  await h.page.goto(base + '/app/renewals', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.waitForTimeout(4500);
  await h.page.getByText('View Attached →', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
  const restored = await h.page.evaluate(({ key, email }) => {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    return {
      sessionPresent: Boolean(session?.access_token),
      sameSyntheticAccount: session?.user?.email === email,
      route: location.pathname,
    };
  }, { key: authStorageKey, email: owner.email });
  const restoredText = await h.page.locator('body').innerText();
  const attachedActionCount = await h.page.getByText('View Attached →', { exact: true }).count();
  const approvedLockStateVisible = restoredText.includes('Locked from modification');
  const restartPass = relaunched.standalone && relaunched.hasController && restored.sessionPresent && restored.sameSyntheticAccount && attachedActionCount > 0 && approvedLockStateVisible;
  mark('Installed-app close and relaunch restores the same owner session and renewal data', restartPass ? 'PASS' : 'FAIL', {
    standalone: relaunched.standalone,
    serviceWorkerControlled: relaunched.hasController,
    sessionPresent: restored.sessionPresent,
    sameSyntheticAccount: restored.sameSyntheticAccount,
    renewalAttachedActionCount: attachedActionCount,
    approvedLockStateVisible,
    route: restored.route,
  });
  if (!restartPass) throw new Error('Installed app session or renewal data did not restore after relaunch.');

  h.phase = 'client-session-expiry';
  await h.page.evaluate(key => {
    const session = JSON.parse(localStorage.getItem(key) || 'null');
    if (!session) throw new Error('Organization auth session unavailable for expiry simulation.');
    session.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(session));
  }, authStorageKey);
  await h.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.waitForFunction(({ key, email }) => {
    try {
      const session = JSON.parse(localStorage.getItem(key) || 'null');
      return session?.user?.email === email && Number(session?.expires_at) > Math.floor(Date.now() / 1000) + 30;
    } catch { return false; }
  }, { key: authStorageKey, email: owner.email }, { timeout: 20000 });
  mark('Simulated expired local access-token metadata recovered through staging Auth refresh', 'PASS', {
    simulatedClientExpiry: true,
    refreshEndpointReturnedSuccess: audit.http.some(item => item.endpoint === '/auth/v1/token' && item.status === 200),
    serverSideSessionRevocationSimulated: false,
  });

  h.phase = 'offline-online-recovery';
  await h.page.getByText('View Attached →', { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await h.page.evaluate(() => {
    window.__ytraceOfflineEvents = 0;
    window.addEventListener('offline', () => { window.__ytraceOfflineEvents++; });
  });
  await context.setOffline(true);
  await h.page.waitForFunction(() => navigator.onLine === false, null, { timeout: 5000 }).catch(() => {});
  await h.page.waitForFunction(() => Boolean(document.querySelector('.pwa-runtime-banner.is-offline')), null, { timeout: 5000 }).catch(() => {});
  const offlineStatus = await h.page.evaluate(() => ({
    browserReportsOffline: navigator.onLine === false,
    offlineEventObserved: window.__ytraceOfflineEvents > 0,
    offlineBannerVisible: Boolean(document.querySelector('.pwa-runtime-banner.is-offline')),
    authenticatedPwaShellMounted: Boolean(document.querySelector('.ytrace-pwa-app')),
    appContentMounted: Boolean(document.querySelector('#root')?.childElementCount),
  }));
  mark('Installed app reports transition to offline while remaining open', !offlineStatus.browserReportsOffline || !offlineStatus.offlineBannerVisible ? 'FAIL' : 'PASS', offlineStatus);
  await h.page.close();
  h.page = null;
  const coldLaunch = await installedLaunch();
  await coldLaunch.page.waitForTimeout(5000);
  const coldOffline = await h.page.evaluate(() => ({
    rootMounted: Boolean(document.querySelector('#root')?.childElementCount),
    appContentVisible: Boolean(document.querySelector('#root')?.innerText?.trim()),
    appText: (document.querySelector('#root')?.innerText || '').slice(0, 240),
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
    browserReportsOffline: navigator.onLine === false,
    offlineBannerVisible: Boolean(document.querySelector('.pwa-runtime-banner.is-offline')),
    safeConnectionStateVisible: /offline|connection|required|unavailable|try again/i.test(document.querySelector('#root')?.innerText || ''),
    standalone: matchMedia('(display-mode: standalone)').matches,
  }));
  const coldOfflinePass = coldOffline.rootMounted && coldOffline.appContentVisible && coldOffline.serviceWorkerControlled &&
    coldOffline.browserReportsOffline && coldOffline.standalone && coldOffline.safeConnectionStateVisible;
  mark('Cold installed-app relaunch initializes React from cached assets and shows a safe offline state', coldOfflinePass ? 'PASS' : 'FAIL', coldOffline);
  if (!coldOfflinePass) throw new Error('Cold installed-app launch did not mount a visible React/offline state.');
  await context.setOffline(false);
  await h.page.waitForFunction(() => navigator.onLine === true, null, { timeout: 5000 }).catch(() => {});
  await h.page.goto(base + '/app/renewals', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.getByText('View Attached →', { exact: true }).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await h.page.waitForTimeout(1000);
  const onlineRecovered = await h.page.evaluate(key => {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const text = document.querySelector('#root')?.innerText || '';
    return {
      online: navigator.onLine,
      sessionPresent: Boolean(session?.access_token),
      route: location.pathname,
      renewalAttachedActionCount: [...document.querySelectorAll('body *')].filter(node => node.childElementCount === 0 && node.textContent?.trim() === 'View Attached →').length,
      approvedLockStateVisible: text.includes('Locked from modification'),
    };
  }, authStorageKey);
  const onlinePass = onlineRecovered.online && onlineRecovered.sessionPresent && onlineRecovered.renewalAttachedActionCount > 0 && onlineRecovered.approvedLockStateVisible;
  mark('Installed app recovers to renewal data after network connectivity returns', onlinePass ? 'PASS' : 'FAIL', onlineRecovered);

  h.phase = 'service-worker-update';
  const serviceWorkerPath = resolve(root, 'tmp/ytrace-installed-pwa-build/sw.js');
  const originalSw = await readFile(serviceWorkerPath, 'utf8');
  const cacheNameMatch = originalSw.match(/const CACHE_NAME = \"([^\"]+)\";/);
  if (!cacheNameMatch || cacheNameMatch[1].includes('-uat-update-')) throw new Error('The local test build service-worker cache name was not a stable application baseline.');
  serviceWorkerBackupPath = serviceWorkerPath;
  serviceWorkerBackupContents = originalSw;
  const previousCacheName = cacheNameMatch[1];
  const nextCacheName = `y-trace-uat-update-${Date.now()}`;
  await writeFile(serviceWorkerPath, originalSw.replace(cacheNameMatch[0], `const CACHE_NAME = \"${nextCacheName}\";`));
  await h.page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) throw new Error('Application service-worker registration missing.');
    await registration.update();
  });
  const updateHandoffCompleted = await h.page.waitForFunction(async ({ previousCacheName, nextCacheName }) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration('/');
    return names.includes(nextCacheName) && !names.includes(previousCacheName) &&
      registration?.active?.state === 'activated' && registration.installing === null &&
      registration.waiting === null && Boolean(navigator.serviceWorker.controller) &&
      navigator.serviceWorker.controller === registration.active;
  }, { previousCacheName, nextCacheName }, { timeout: 20000 }).then(() => true, () => false);
  await h.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await h.page.waitForTimeout(1200);
  const updateState = await h.page.evaluate(async ({ previousCacheName, nextCacheName }) => {
    const names = await caches.keys();
    const registration = await navigator.serviceWorker.getRegistration('/');
    return {
      newCachePresent: names.includes(nextCacheName),
      priorCacheRemoved: !names.includes(previousCacheName),
      workerActivated: registration?.active?.state === 'activated',
      installationFinished: registration?.installing === null && registration?.waiting === null,
      controllerPresent: Boolean(navigator.serviceWorker.controller),
      controllerIsActive: navigator.serviceWorker.controller === registration?.active,
    };
  }, { previousCacheName, nextCacheName });
  const updatePass = updateHandoffCompleted && Object.values(updateState).every(Boolean);
  mark('Service-worker update activates new cache and removes the prior app-shell cache', updatePass ? 'PASS' : 'FAIL', updateState);

  h.phase = 'organization-account-switch';
  await h.page.goto(base + '/app/more', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.getByRole('button', { name: 'Sign Out', exact: true }).first().click();
  const signOutDialog = h.page.getByRole('alertdialog');
  await signOutDialog.getByRole('heading', { name: 'Sign out?', exact: true }).waitFor({ state: 'visible', timeout: 8000 });
  await signOutDialog.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await h.page.waitForFunction(key => !localStorage.getItem(key), authStorageKey, { timeout: 15000 });
  await h.page.waitForTimeout(900);
  const signedOut = await h.page.evaluate(() => ({ route: location.pathname, previewCount: document.querySelectorAll('[role=\"dialog\"]').length }));
  const signOutPass = signedOut.route === '/app-start' && signedOut.previewCount === 0;
  mark('Organization logout clears the preview and returns to the public app start', signOutPass ? 'PASS' : 'FAIL', signedOut);
  if (!signOutPass) throw new Error('Normal organization logout did not clear the private preview state.');

  await login(other, other.email, 'Existing Organization B account switch through installed PWA');
  await h.page.goto(base + '/app/documents', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await h.page.waitForTimeout(2500);
  const switched = await h.page.evaluate(({ key, email, privateFilename }) => {
    let session = null;
    try { session = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const text = document.querySelector('#root')?.innerText || '';
    return {
      expectedIdentity: session?.user?.email === email,
      previousDocumentVisible: text.includes(privateFilename),
      previousPreviewPresent: Boolean(document.querySelector('[role=\"dialog\"]')),
      route: location.pathname,
    };
  }, { key: authStorageKey, email: other.email, privateFilename: expectedFileName });
  const switchPass = switched.expectedIdentity && !switched.previousDocumentVisible && !switched.previousPreviewPresent && switched.route === '/app/documents';
  mark('Account switch isolates private renewal references and preview from Organization B', switchPass ? 'PASS' : 'FAIL', switched);
  if (!switchPass) throw new Error('Organization account switch retained the prior private renewal document.');

  audit.networkIsolation = {
    browserResolverAllowlistConfigured: true,
    browserProxyAllowlistConfigured: true,
    serviceWorkerProbeBlocked: audit.networkIsolation.serviceWorkerProbeBlocked,
    egressProxyDeniedProbe: audit.networkIsolation.egressProxyDeniedProbe,
    productionAttemptsBlocked: proxy.counts.blockedProduction,
    productionRequestsObservedByHarness: audit.blocked.filter(item => item.production).length,
    proxy: { ...proxy.counts },
  };
} catch (error) {
  audit.operationErrors.push(safeError(error));
  output({ executionStopped: true, ...safeError(error) });
} finally {
  try {
    if (browserCdp && appId) {
      await browserCdp.send('PWA.uninstall', { manifestId: appId });
      audit.installedPwa.uninstalledAfterTest = true;
    }
  } catch (error) {
    audit.installedPwa.uninstallError = safeError(error);
  }
  try { if (context) await context.close(); } catch {}
  try { if (preview) preview.kill(); } catch {}
  try { if (proxy?.server) await new Promise(resolveClose => proxy.server.close(resolveClose)); } catch {}
  if (serviceWorkerBackupPath && serviceWorkerBackupContents !== undefined) {
    try { await writeFile(serviceWorkerBackupPath, serviceWorkerBackupContents); } catch {}
  }
  if (testProfile) {
    try {
      const parent = await realpath(resolve(root, 'tmp'));
      const target = await realpath(testProfile);
      const rel = relative(parent, target);
      if (rel && !rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)) await rm(target, { recursive: true, force: true });
    } catch {}
  }
  try {
    const buildRoot = await realpath(resolve(root, 'tmp/ytrace-installed-pwa-build'));
    const probePath = await realpath(resolve(root, 'tmp/ytrace-installed-pwa-build/__pwa_network_probe'));
    const rel = relative(buildRoot, probePath);
    if (rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel)) await rm(probePath, { recursive: true, force: true });
  } catch {}
  if (h) {
    try { await saveAudit(); }
    catch (error) { output({ evidenceSave: 'FAIL', ...safeError(error) }); }
  }
  if (audit.checks.some(check => check.status === 'FAIL') || audit.operationErrors.length > 0 || audit.installedPwa.uninstallError) process.exitCode = 1;
}

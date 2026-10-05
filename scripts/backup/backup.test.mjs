import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { safeRelativePath, localPath, sha256File, validateSecrets, redact, runQuiet } from './common.mjs';
import { backupStorage, enumerateObjects, discoverBuckets, storageApi, StorageApiError } from './backup-storage.mjs';
import { generateManifest, rejectCredentials } from './generate-manifest.mjs';
import { BASE_DATABASE_ARTIFACTS, inspectDatabase, backupDatabase } from './backup-database.mjs';
import { backupIdentity } from './run-backup.mjs';
import { uploadR2, preflightR2, classifyR2Diagnostic, classifyR2Error } from './upload-r2.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = (name, bytes = 'abc') => ({ name, id: `id-${name}`, updated_at: '2026-10-05T00:00:00Z',
  metadata: { size: Buffer.byteLength(bytes), mimetype: 'application/octet-stream' } });
const folder = name => ({ name, id: null, metadata: null });
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'ytrace-unit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
function mockApi() {
  const pages = { a: { '': [folder('nested'), entry('root.bin')], nested: [entry('one.bin'), entry('two.bin'), entry('three.bin')] },
    b: { '': [] }, c: { '': [entry('zero.bin', '')] } };
  return {
    buckets: async (limit, offset) => ['a', 'b', 'c'].slice(offset, offset + limit).map(id => ({ id, name: id, public: false })),
    list: async (bucket, prefix, limit, offset) => pages[bucket][prefix].slice(offset, offset + limit),
    download: async (bucket, objectPath) => new Response(objectPath === 'zero.bin' ? new Uint8Array() : Buffer.from('abc')),
  };
}

function mockSupabaseStorage({ listBuckets, list, download } = {}) {
  const calls = [];
  const client = {
    storage: {
      listBuckets: async options => {
        calls.push({ method: 'listBuckets', options });
        return listBuckets ? listBuckets(options) : { data: [], error: null };
      },
      from: bucket => ({
        list: async (prefix, options) => {
          calls.push({ method: 'list', bucket, prefix, options });
          return list ? list(bucket, prefix, options) : { data: [], error: null };
        },
        download: (objectPath, options, fetchOptions) => {
          calls.push({ method: 'download', bucket, objectPath, options, fetchOptions });
          return { asStream: async () => download
            ? download(bucket, objectPath)
            : { data: null, error: new Error('Unexpected mock download') } };
        },
      }),
    },
  };
  return { client, calls };
}

test('path handling rejects traversal, ambiguous names and platform escapes', () => {
  for (const value of ['../file', '/file', 'a/../file', 'a//file', '.', 'a/./b', 'C:/file', 'a\\file', 'a\nfile', '']) {
    assert.throws(() => safeRelativePath(value));
  }
  assert.equal(safeRelativePath('nested/Filipino file 你好.pdf'), 'nested/Filipino file 你好.pdf');
  assert.throws(() => localPath(tmpdir(), '../escape'));
});

test('bucket and nested object enumeration exhaust pagination, including exact full pages', async () => {
  const api = mockApi();
  assert.deepEqual((await discoverBuckets(api, 2)).map(b => b.id), ['a', 'b', 'c']);
  assert.deepEqual((await enumerateObjects(api, 'a', 2)).map(o => o.path), ['nested/one.bin', 'nested/three.bin', 'nested/two.bin', 'root.bin']);
});

test('storage preserves binary bytes, empty buckets/files, metadata and matching second inventory', async t => {
  const root = await fixture(t);
  const result = await backupStorage({ root, api: mockApi(), pageSize: 2 });
  assert.equal(result.objects.length, 5);
  assert.equal(result.buckets.length, 3);
  assert.equal(result.objects[0].sha256, digest('abc'));
  assert.equal(result.objects.at(-1).size, 0);
  assert.equal((await readFile(localPath(root, 'storage/a/nested/one.bin'))).toString(), 'abc');
  assert.equal(result.secondInventoryMatched, true);
});

test('enumeration/API failure, unsupported bucket and repeating pagination fail closed', async () => {
  await assert.rejects(discoverBuckets({ buckets: async () => [{ id: 'vectors', type: 'VECTOR' }] }), /Storage enumeration failed/);
  await assert.rejects(discoverBuckets({ buckets: async () => [{ id: 'a' }] }, 1), /pagination/);
  await assert.rejects(enumerateObjects({ list: async () => { throw new Error('secret diagnostic'); } }, 'a'), /enumeration failed: a/);
  await assert.rejects(enumerateObjects({ list: async () => [entry('../escape')] }, 'a'), /Unsafe/);
  await assert.rejects(enumerateObjects({ list: async () => [entry('a')] }, 'a', 1), /pagination/);
});

test('failed or truncated downloads do not create a successful inventory', async t => {
  for (const kind of ['network', 'size', 'encoded']) {
    const root = await fixture(t), api = mockApi();
    api.download = async () => {
      if (kind === 'network') throw new Error('credential-bearing URL');
      return new Response('a', kind === 'encoded' ? { headers: { 'content-encoding': 'gzip' } } : {});
    };
    await assert.rejects(backupStorage({ root, api, pageSize: 2 }), /download failed: a\/nested\/one.bin/);
    await assert.rejects(readFile(localPath(root, 'storage-inventory.json')));
  }
});

test('a changed second inventory fails instead of marking the backup complete', async t => {
  const root = await fixture(t), api = mockApi(), original = api.list;
  let calls = 0;
  api.list = async (...args) => {
    const values = await original(...args);
    calls++;
    return calls > 5 ? values.map(e => e.id ? { ...e, updated_at: 'changed' } : e) : values;
  };
  await assert.rejects(backupStorage({ root, api, pageSize: 2 }), /changed during backup/);
});

test('sb_secret key is passed only to the server-side Supabase client and listBuckets uses that client', async () => {
  const secret = 'sb_secret_mock-never-log-this';
  const sdk = mockSupabaseStorage({ listBuckets: async options => ({ data: [{ id: 'private-files', name: 'private-files', public: false }], error: null }) });
  let clientArgs;
  const api = storageApi('https://example.invalid', secret, {
    createClientImpl: (...args) => { clientArgs = args; return sdk.client; },
    fetchImpl: async () => { throw new Error('The adapter must use mocked SDK methods, not raw Storage requests'); },
  });
  assert.deepEqual(await api.buckets(25, 0), [{ id: 'private-files', name: 'private-files', public: false }]);
  assert.equal(clientArgs[0], 'https://example.invalid');
  assert.equal(clientArgs[1], secret);
  assert.deepEqual(clientArgs[2].auth, { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
  assert.equal(clientArgs[2].global.headers['Accept-Encoding'], 'identity');
  assert.equal(typeof clientArgs[2].global.fetch, 'function');
  assert.deepEqual(sdk.calls, [{ method: 'listBuckets', options: { limit: 25, offset: 0, sortColumn: 'id', sortOrder: 'asc' } }]);
  assert.equal(JSON.stringify(sdk.calls).includes(secret), false);
});

test('the installed official Supabase client can list buckets through a mocked fetch only', async () => {
  const requests = [];
  const api = storageApi('https://mock-project.supabase.invalid', 'sb_secret_mock-sdk-integration', {
    fetchImpl: async (input, init) => {
      requests.push({ url: new URL(input), method: init.method });
      return Response.json([{ id: 'documents', name: 'documents', public: false }]);
    },
  });
  assert.deepEqual(await api.buckets(100, 0), [{ id: 'documents', name: 'documents', public: false }]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.pathname, '/storage/v1/bucket');
  assert.equal(requests[0].url.searchParams.get('limit'), '100');
});

test('Supabase SDK bucket and recursive object listing exhausts every pagination page', async () => {
  const bucketPages = [
    [{ id: 'a', name: 'a', public: false }, { id: 'b', name: 'b', public: false }],
    [{ id: 'c', name: 'c', public: false }],
  ];
  const listPages = {
    'a|': [[folder('nested'), entry('root.bin')], [entry('second-root.bin')], []],
    'a|nested': [[entry('one.bin'), entry('two.bin')], [entry('three.bin')], []],
  };
  const sdk = mockSupabaseStorage({
    listBuckets: async ({ offset }) => ({ data: bucketPages[offset === 0 ? 0 : 1], error: null }),
    list: async (bucket, prefix, { offset }) => ({ data: listPages[`${bucket}|${prefix}`]?.[offset / 2] ?? [], error: null }),
  });
  const api = storageApi('https://example.invalid', 'sb_secret_mock-only', { createClientImpl: () => sdk.client });
  assert.deepEqual((await discoverBuckets(api, 2)).map(item => item.id), ['a', 'b', 'c']);
  assert.deepEqual((await enumerateObjects(api, 'a', 2)).map(item => item.path), [
    'nested/one.bin', 'nested/three.bin', 'nested/two.bin', 'root.bin', 'second-root.bin',
  ]);
  assert.ok(sdk.calls.some(call => call.method === 'listBuckets' && call.options.offset === 2));
  assert.ok(sdk.calls.some(call => call.method === 'list' && call.prefix === '' && call.options.offset === 2));
  assert.ok(sdk.calls.some(call => call.method === 'list' && call.prefix === 'nested' && call.options.offset === 2));
});

test('SDK authenticated download uses streaming API and keeps checksum and inventory validation', async t => {
  const root = await fixture(t), secret = 'sb_secret_mock-stream-only';
  let downloadCalls = 0;
  const sdk = mockSupabaseStorage({
    listBuckets: async () => ({ data: [{ id: 'private-files', name: 'private-files', public: false }], error: null }),
    list: async (_bucket, prefix) => ({ data: prefix ? [entry('file #1.pdf', 'binary bytes')] : [folder('nested')], error: null }),
    download: async (bucket, objectPath) => {
      downloadCalls++;
      assert.equal(bucket, 'private-files');
      assert.equal(objectPath, 'nested/file #1.pdf');
      return { data: Readable.toWeb(Readable.from([Buffer.from('binary bytes')])), error: null };
    },
  });
  let clientArgs;
  const api = storageApi('https://example.invalid', secret, { createClientImpl: (...args) => { clientArgs = args; return sdk.client; } });
  const result = await backupStorage({ root, api, pageSize: 100 });
  assert.equal(downloadCalls, 1);
  assert.equal(sdk.calls.filter(call => call.method === 'download')[0].objectPath, 'nested/file #1.pdf');
  assert.equal(clientArgs[1], secret);
  assert.equal(result.objects[0].sha256, digest('binary bytes'));
  assert.equal(result.objects[0].size, Buffer.byteLength('binary bytes'));
  assert.equal(result.objects[0].contentType, 'application/octet-stream');
  assert.equal(result.secondInventoryMatched, true);
  assert.equal((await readFile(localPath(root, 'storage/private-files/nested/file #1.pdf'))).toString(), 'binary bytes');
});

test('SDK authorization errors are sanitized and zero buckets still fail closed', async t => {
  const root = await fixture(t), secret = 'sb_secret_never-in-error-or-log';
  const deniedSdk = mockSupabaseStorage({ listBuckets: async () => ({ data: null, error: Object.assign(new Error(`private detail ${secret}`), { status: 403 }) }) });
  const denied = storageApi('https://example.invalid', secret, { createClientImpl: () => deniedSdk.client });
  await assert.rejects(denied.buckets(100, 0), error => error.message === 'Storage authorization failed (HTTP 403)' && !error.message.includes(secret));
  await assert.rejects(discoverBuckets(denied), error => error.message === 'Storage authorization failed (HTTP 403)');

  const emptySdk = mockSupabaseStorage({ listBuckets: async () => ({ data: [], error: null }) });
  const empty = storageApi('https://example.invalid', secret, { createClientImpl: () => emptySdk.client });
  await assert.rejects(backupStorage({ root, api: empty }), error => error instanceof StorageApiError &&
    error.message === 'Storage API returned zero buckets; refusing an empty inventory' && !error.message.includes(secret));
  await assert.rejects(readFile(localPath(root, 'storage-inventory.json')));

  const sdkError = mockSupabaseStorage({ listBuckets: async () => ({ data: null, error: new Error(secret) }) });
  const sanitized = storageApi('https://example.invalid', secret, { createClientImpl: () => sdkError.client });
  const originalConsole = Object.fromEntries(['log', 'info', 'warn', 'error'].map(method => [method, console[method]]));
  const emittedLogs = [];
  try {
    for (const method of Object.keys(originalConsole)) console[method] = (...args) => emittedLogs.push(args.join(' '));
    await assert.rejects(discoverBuckets(sanitized), error => error.message === 'Storage enumeration failed: bucket discovery' && !error.message.includes(secret));
  } finally {
    for (const [method, original] of Object.entries(originalConsole)) console[method] = original;
  }
  assert.deepEqual(emittedLogs, []);

  const downloadDenied = mockSupabaseStorage({
    listBuckets: async () => ({ data: [{ id: 'private-bucket', name: 'private-bucket', public: false }], error: null }),
    list: async () => ({ data: [entry('private.pdf')], error: null }),
    download: async () => ({ data: null, error: Object.assign(new Error(`private detail ${secret}`), { status: 401 }) }),
  });
  const deniedDownloadApi = storageApi('https://example.invalid', secret, { createClientImpl: () => downloadDenied.client });
  await assert.rejects(backupStorage({ root, api: deniedDownloadApi }), error =>
    error.message === 'Storage authorization failed: private-bucket/private.pdf' && !error.message.includes(secret));

  await assert.rejects(discoverBuckets({ buckets: async () => { throw new StorageApiError('Storage authorization failed (HTTP 401)'); } }),
    error => error.message === 'Storage authorization failed (HTTP 401)');
  await assert.rejects(enumerateObjects({ list: async () => { throw new StorageApiError('Storage authorization failed (HTTP 401)'); } }, 'private-bucket'),
    error => error.message === 'Storage authorization failed: private-bucket/');
  await assert.rejects(enumerateObjects({ list: async () => { throw new Error(secret); } }, 'private-bucket'),
    error => error.message === 'Storage enumeration failed: private-bucket/' && !error.message.includes(secret));
});

test('checksum is calculated from bytes without buffering a full file', async t => {
  const root = await fixture(t), bytes = Buffer.from([0, 255, 10, 13, 128]);
  await writeFile(localPath(root, 'bytes.bin'), bytes);
  assert.deepEqual(await sha256File(localPath(root, 'bytes.bin')), { sha256: digest(bytes), size: 5 });
});

async function manifestFixture(t, auth = false) {
  const root = await fixture(t);
  await backupStorage({ root, api: mockApi(), pageSize: 2 });
  await mkdir(localPath(root, 'database'));
  const artifacts = [...BASE_DATABASE_ARTIFACTS, ...(auth ? ['auth-users-identities-schema-reference.sql', 'auth-users-identities-data.sql'] : [])];
  for (const file of artifacts) await writeFile(localPath(root, `database/${file}`), '-- mock logical artifact\n');
  await writeFile(localPath(root, 'database-coverage.json'), JSON.stringify({
    authCoverage: auth ? 'users-and-identities-only' : 'not-included', artifacts: artifacts.map(f => `database/${f}`), warnings: ['Mock coverage warning'],
  }));
  await mkdir(localPath(root, 'recovery/migrations'), { recursive: true });
  await writeFile(localPath(root, 'recovery/migrations/001.sql'), '-- mock migration\n');
  return root;
}
const identity = { backupId: '2026-10-05T041500Z-123-1', createdAtUtc: '2026-10-05T04:15:00.000Z', gitCommitSha: 'a'.repeat(40) };

test('manifest covers DB artifacts, binary objects, migrations and independent checksum file', async t => {
  const root = await manifestFixture(t, true);
  const manifest = await generateManifest({ root, ...identity });
  assert.equal(manifest.storageObjectCount, 5);
  assert.equal(manifest.storageTotalBytes, 12);
  assert.equal(manifest.databaseArtifacts.length, 8);
  assert.equal(manifest.triggerType, 'workflow_dispatch');
  const sums = await readFile(localPath(root, 'SHA256SUMS'), 'utf8');
  for (const line of sums.trimEnd().split('\n')) {
    const [expected, file] = line.split('  ');
    assert.equal((await sha256File(localPath(root, file))).sha256, expected);
  }
  assert.match(sums, /manifest.json/);
  assert.match(sums, /recovery\/migrations\/001.sql/);
});

test('manifest fails on missing database, corrupt/missing/extra objects and incomplete enumeration', async t => {
  for (const kind of ['db', 'corrupt', 'missing', 'extra', 'enumeration', 'auth']) {
    const root = await manifestFixture(t, kind === 'auth');
    if (kind === 'db') await rm(localPath(root, 'database/schema.sql'));
    if (kind === 'auth') await rm(localPath(root, 'database/auth-users-identities-data.sql'));
    if (kind === 'corrupt') await writeFile(localPath(root, 'storage/a/root.bin'), 'xyz');
    if (kind === 'missing') await rm(localPath(root, 'storage/a/root.bin'));
    if (kind === 'extra') await writeFile(localPath(root, 'storage/a/extra.bin'), 'abc');
    if (kind === 'enumeration') {
      const filename = localPath(root, 'storage-inventory.json'), content = JSON.parse(await readFile(filename));
      content.enumerationComplete = false; await writeFile(filename, JSON.stringify(content));
    }
    await assert.rejects(generateManifest({ root, ...identity }));
    await assert.rejects(readFile(localPath(root, 'manifest.json')));
  }
});

test('credential scan detects values across stream boundaries and errors are redacted', async t => {
  const root = await fixture(t), filename = localPath(root, 'credential.bin');
  await writeFile(filename, Buffer.concat([Buffer.alloc(65530, 120), Buffer.from('mock-sensitive-key')]));
  await assert.rejects(rejectCredentials(filename, { SUPABASE_SECRET_KEY: 'mock-sensitive-key' }), /credential found/);
  assert.equal(redact('oops mock-sensitive-key https://user:password@example.invalid', { SUPABASE_SECRET_KEY: 'mock-sensitive-key' }), 'oops [redacted] [URL redacted]');
  await assert.rejects(runQuiet(process.execPath, ['-e', 'console.error("mock-sensitive-key"); process.exit(1)']), error => !error.message.includes('mock-sensitive-key'));
});

test('manifest rejects role password values even when they are not a configured workflow secret', async t => {
  const root = await manifestFixture(t);
  await writeFile(localPath(root, 'database/roles.sql'), "ALTER ROLE mock_role PASSWORD 'mock-role-password';\n");
  await assert.rejects(generateManifest({ root, ...identity }), /Role dump contains a password/);
});

test('manual identity is UTC, unique per attempt and rejects automatic triggers', () => {
  const env = { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40), GITHUB_EVENT_NAME: 'workflow_dispatch' };
  assert.deepEqual(backupIdentity(env, new Date(identity.createdAtUtc)), { backupId: identity.backupId, createdAtUtc: identity.createdAtUtc });
  assert.throws(() => backupIdentity({ ...env, GITHUB_EVENT_NAME: 'push' }));
});

const secrets = { R2_ACCESS_KEY_ID: 'mock-id', R2_SECRET_ACCESS_KEY: 'mock-key', R2_ENDPOINT: 'https://r2.example.invalid',
  R2_BUCKET_NAME: 'mock-bucket', SUPABASE_URL: 'https://supabase.example.invalid', SUPABASE_SECRET_KEY: 'mock-api-key',
  SUPABASE_DB_URL: 'postgresql://mock-user:mock-password@database.example.invalid:5432/postgres' };
test('secret validation rejects missing values, credential URLs and transaction pooler', () => {
  assert.doesNotThrow(() => validateSecrets(secrets));
  assert.throws(() => validateSecrets({ ...secrets, R2_ACCESS_KEY_ID: '' }), /R2_ACCESS_KEY_ID/);
  assert.throws(() => validateSecrets({ ...secrets, R2_ENDPOINT: 'https://user:pass@example.invalid' }));
  assert.throws(() => validateSecrets({ ...secrets, SUPABASE_DB_URL: secrets.SUPABASE_DB_URL.replace('5432', '6543') }), /transaction pooler/);
  assert.throws(() => validateSecrets({ ...secrets, SUPABASE_URL: 'https://projectone.supabase.co',
    SUPABASE_DB_URL: 'postgresql://mock:mock@db.projecttwo.supabase.co:5432/postgres' }), /different Supabase projects/);
});

function mockClient(readable = true, unknown = false) {
  return { connect: async () => {}, end: async () => {}, query: async sql => {
    if (sql.includes('FROM pg_policies') || sql.includes('FROM pg_trigger')) return { rows: [] };
    if (sql.includes('FROM pg_namespace')) return { rows: unknown ? [{ nspname: 'unknown' }] : [] };
    if (sql.includes('server_version_num')) return { rows: [{ version: 170006, migration_history: true, auth_tables: true }] };
    return { rows: [{ readable }] };
  } };
}
test('database inspection handles Auth permissions and refuses unknown schema omissions', async () => {
  assert.equal((await inspectDatabase(mockClient())).authReadable, true);
  assert.equal((await inspectDatabase(mockClient(false))).authReadable, false);
  await assert.rejects(inspectDatabase(mockClient(true, true)), /Unrecognized/);
});

test('database plan separates managed artifacts, uses matching pg_dump, and propagates command failures', async t => {
  for (const readable of [true, false]) {
    const root = await fixture(t), calls = [];
    const coverage = await backupDatabase({ root, env: secrets, Client: class { constructor() { return mockClient(readable); } },
      execute: async (command, args, env) => { calls.push({ command, args, env }); } });
    assert.equal(coverage.authCoverage, readable ? 'users-and-identities-only' : 'not-included');
    assert.equal(calls.length, readable ? 7 : 5);
    assert.ok(calls[1].args.includes('public'));
    assert.ok(calls[3].args.includes('supabase_migrations'));
    if (readable) {
      assert.ok(calls[5].args.includes('postgres:17'));
      assert.ok(calls[5].env.PGOPTIONS.includes('read_only=on'));
      assert.ok(!calls[5].args.join(' ').includes('mock-password'));
    }
  }
  const root = await fixture(t);
  await assert.rejects(backupDatabase({ root, env: secrets, Client: class { constructor() { return mockClient(); } },
    execute: async () => { throw new Error('mock dump failure'); } }), /mock dump failure/);
  const authRoot = await fixture(t);
  await assert.rejects(backupDatabase({ root: authRoot, env: secrets, Client: class { constructor() { return mockClient(); } },
    execute: async command => { if (command === 'docker') throw new Error('mock Auth dump failure'); } }), /mock Auth dump failure/);
  await assert.rejects(readFile(localPath(authRoot, 'database-coverage.json')));
});

test('R2 verifies destination absence, HEAD metadata/size and downloaded archive checksum', async t => {
  const root = await fixture(t), archive = localPath(root, 'archive.tar.gz');
  await writeFile(archive, 'mock archive bytes');
  const hash = await sha256File(archive);
  const calls = [];
  const execute = async (command, args, env) => {
    calls.push(args); assert.equal(command, 'aws'); assert.equal(env.AWS_DEFAULT_REGION, 'auto');
    if (args.includes('list-objects-v2')) return JSON.stringify({ KeyCount: 0 });
    if (args.includes('head-object')) return JSON.stringify(args.some(a => a.endsWith('.sha256'))
      ? { ContentLength: (await sha256File(`${archive}.sha256`)).size }
      : { ContentLength: hash.size, Metadata: { sha256: hash.sha256 } });
    if (args.includes(`${archive}.readback`)) await copyFile(archive, `${archive}.readback`);
    return '';
  };
  const result = await uploadR2({ archive, ...identity, env: secrets, execute });
  assert.equal(result.readBackVerified, true);
  assert.match(result.key, /^manual\/2026\/10\/05\/2026-10-05T041500Z-123-1\//);
  assert.equal(calls.length, 6);
});

test('R2 error diagnostics classify known failures without exposing stderr', async t => {
  const cases = [
    ['An error occurred (AccessDenied) while requesting this bucket', 'access_denied'],
    ['InvalidAccessKeyId: supplied key is invalid', 'invalid_access_key'],
    ['SignatureDoesNotMatch: request signature mismatch', 'signature_mismatch'],
    ['NoSuchBucket: requested bucket does not exist', 'bucket_not_found'],
    ['Could not connect to the endpoint URL', 'endpoint_unreachable'],
    ['unexpected output with secret marker', 'unknown_r2_error'],
  ];
  for (const [stderr, expected] of cases) assert.equal(classifyR2Diagnostic(stderr), expected);

  const root = await fixture(t), archive = localPath(root, 'archive.tar.gz');
  await writeFile(archive, 'mock archive');
  const secret = 'mock-r2-secret-never-in-error';
  await assert.rejects(uploadR2({ archive, ...identity, env: secrets,
    execute: async () => { const error = new Error(`raw output containing ${secret}`); throw error; },
    getErrorCode: () => 'access_denied' }),
  error => error.message === 'R2 destination check failed: access_denied' && !error.message.includes(secret));
  assert.equal(classifyR2Error(new Error('contains AccessDenied secret'), () => 'unknown_r2_error'), 'unknown_r2_error');
});

test('R2 preflight lists the configured destination before packaging and safely fails closed', async () => {
  const calls = [];
  const result = await preflightR2({ ...identity, env: secrets, execute: async (command, args, env, capture) => {
    calls.push({ command, args, env, capture }); return JSON.stringify({ KeyCount: 0, Contents: [] });
  } });
  assert.equal(result.bucketListVerified, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'aws');
  assert.ok(calls[0].args.includes('list-objects-v2'));
  assert.ok(calls[0].args.includes(secrets.R2_BUCKET_NAME));
  assert.equal(calls[0].env.AWS_ACCESS_KEY_ID, secrets.R2_ACCESS_KEY_ID);
  assert.equal(calls[0].env.AWS_SECRET_ACCESS_KEY, secrets.R2_SECRET_ACCESS_KEY);
  assert.equal(calls[0].capture, true);
  await assert.rejects(preflightR2({ ...identity, env: secrets,
    execute: async () => { throw new Error('private AWS response'); }, getErrorCode: () => 'bucket_not_found' }),
  error => error.message === 'R2 preflight failed: bucket_not_found' && !error.message.includes(secrets.R2_SECRET_ACCESS_KEY));
});

test('runQuiet captures only a safe R2 classification and withholds raw AWS stderr', async () => {
  const secret = 'mock-signature-secret-never-logged';
  await assert.rejects(runQuiet(process.execPath, ['-e', `process.stderr.write("AccessDenied ${secret}"); process.exit(1)`], process.env, false, classifyR2Diagnostic), error => {
    assert.equal(classifyR2Error(error), 'access_denied');
    assert.doesNotMatch(error.message, new RegExp(secret));
    assert.match(error.message, /tool output withheld/);
    return true;
  });
});

test('R2 existing prefix, upload failure, wrong size and corrupt read-back are failures', async t => {
  for (const kind of ['exists', 'upload', 'head', 'readback']) {
    const root = await fixture(t), archive = localPath(root, 'archive.tar.gz');
    await writeFile(archive, 'mock archive bytes');
    const hash = await sha256File(archive);
    const execute = async (command, args) => {
      if (args.includes('list-objects-v2')) return JSON.stringify({ KeyCount: kind === 'exists' ? 1 : 0 });
      if (kind === 'upload') throw new Error('mock upload failure');
      if (args.includes('head-object')) return JSON.stringify(args.some(a => a.endsWith('.sha256'))
        ? { ContentLength: (await sha256File(`${archive}.sha256`)).size }
        : { ContentLength: kind === 'head' ? 0 : hash.size, Metadata: { sha256: hash.sha256 } });
      if (args.includes(`${archive}.readback`)) await writeFile(`${archive}.readback`, 'corrupt archive');
      return '';
    };
    await assert.rejects(uploadR2({ archive, ...identity, env: secrets, execute }));
  }
});

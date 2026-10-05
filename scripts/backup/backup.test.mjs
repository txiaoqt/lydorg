import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { safeRelativePath, localPath, sha256File, validateSecrets, redact, runQuiet } from './common.mjs';
import { backupStorage, enumerateObjects, discoverBuckets, storageApi, storageAuthHeaders, StorageApiError } from './backup-storage.mjs';
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

test('authenticated download URL encodes original segments and never uses a public URL', async () => {
  let request;
  const api = storageApi('https://example.invalid', 'mock-secret-only', async (url, options) => {
    request = { url, options }; return new Response('binary');
  });
  await api.download('a', 'nested/file #1.pdf');
  assert.equal(request.url, 'https://example.invalid/storage/v1/object/authenticated/a/nested/file%20%231.pdf');
  assert.equal(request.options.headers.apikey, 'mock-secret-only');
  assert.equal(request.options.headers['Accept-Encoding'], 'identity');
  assert.equal(request.options.redirect, 'error');
  await assert.rejects(storageApi('https://example.invalid', 'mock', async () => new Response('secret detail', { status: 403 })).buckets(100, 0), /HTTP 403/);
});

test('Storage sb_secret API keys use apikey only; legacy service_role JWTs retain Bearer compatibility', async () => {
  const apiKey = 'sb_secret_mock-only-value';
  const newHeaders = storageAuthHeaders(apiKey);
  assert.equal(newHeaders.apikey, apiKey);
  assert.equal(newHeaders.Authorization, undefined);
  const legacy = 'eyJmock.header.signature';
  assert.equal(storageAuthHeaders(legacy).apikey, legacy);
  assert.equal(storageAuthHeaders(legacy).Authorization, `Bearer ${legacy}`);
  let actualHeaders;
  await storageApi('https://example.invalid', legacy, async (_url, options) => {
    actualHeaders = options.headers; return Response.json([]);
  }).buckets(100, 0);
  assert.equal(actualHeaders.apikey, legacy);
  assert.equal(actualHeaders.Authorization, `Bearer ${legacy}`);
});

test('Storage distinguishes authorization failures and rejects a suspicious empty bucket inventory', async t => {
  const root = await fixture(t), secret = 'sb_secret_mock-never-in-error';
  const denied = storageApi('https://example.invalid', secret, async (_url, options) => {
    assert.equal(options.headers.apikey, secret);
    assert.equal(options.headers.Authorization, undefined);
    return new Response('private gateway detail', { status: 403 });
  });
  await assert.rejects(denied.buckets(100, 0), error => error.message === 'Storage authorization failed (HTTP 403)' && !error.message.includes(secret));
  await assert.rejects(backupStorage({ root, api: { buckets: async () => [] } }),
    error => error instanceof StorageApiError && error.message === 'Storage API returned zero buckets; refusing an empty inventory');
  await assert.rejects(readFile(localPath(root, 'storage-inventory.json')));
  await assert.rejects(discoverBuckets({ buckets: async () => { throw new Error(secret); } }),
    error => error.message === 'Storage enumeration failed: bucket discovery' && !error.message.includes(secret));
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

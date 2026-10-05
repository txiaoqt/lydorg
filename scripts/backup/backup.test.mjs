import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { safeRelativePath, localPath, sha256File, validateSecrets, redact, runQuiet } from './common.mjs';
import { backupStorage, enumerateObjects, discoverBuckets, storageApi } from './backup-storage.mjs';
import { generateManifest, rejectCredentials } from './generate-manifest.mjs';
import { BASE_DATABASE_ARTIFACTS, inspectDatabase, backupDatabase } from './backup-database.mjs';
import { backupIdentity } from './run-backup.mjs';
import { uploadR2 } from './upload-r2.mjs';

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
  await assert.rejects(discoverBuckets({ buckets: async () => [{ id: 'vectors', type: 'VECTOR' }] }), /Unsupported/);
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

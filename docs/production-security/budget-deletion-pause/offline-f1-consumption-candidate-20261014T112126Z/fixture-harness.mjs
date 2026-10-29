// NON-RUNNABLE — NOT AUTHORIZED. Disposable synthetic fixtures only.
// Teardown is a test-owner action, never an operation recovery/resume path.
import { mkdtemp, open, lstat, realpath, readFile, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative, isAbsolute, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { need, digest, bindSyntheticContext, consumptionLeaf, recordBytes } from './synthetic-f1-core.mjs';
const SCOPE = 'OFFLINE_F1_DISPOSABLE_FIXTURE_V1';
const LEAF = '.fixture-scope';
const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
function lexical(descriptor) {
  need(descriptor && Object.keys(descriptor).sort().join('|') === 'fixtureId|format|root' &&
    descriptor.format === SCOPE && typeof descriptor.fixtureId === 'string' &&
    /^[0-9a-f-]{36}$/.test(descriptor.fixtureId) && typeof descriptor.root === 'string', 'FIXTURE_DESCRIPTOR_INVALID');
  const supplied = descriptor.root, parent = resolve(tmpdir()), root = resolve(supplied);
  need(isAbsolute(supplied) && !supplied.split(/[\\/]/).includes('..') && !/^[/\\]{2}/.test(supplied) &&
    same(supplied, root) && same(relative(parent, root), basename(root)) &&
    /^ytrace-f1-synthetic-[A-Za-z0-9]{6}$/.test(basename(root)), 'FIXTURE_PATH_INVALID');
  return { root, parent };
}
async function plainFile(path) {
  const info = await lstat(path);
  need(info.isFile() && !info.isSymbolicLink() && same(resolve(await realpath(path)), resolve(path)), 'FIXTURE_REDIRECT');
  return info;
}
export async function admitFixture(descriptor) {
  const { root, parent } = lexical(descriptor); // Reject all other paths before filesystem access.
  const dir = await lstat(root);
  need(dir.isDirectory() && !dir.isSymbolicLink() && same(await realpath(root), root) &&
    same(await realpath(parent), parent), 'FIXTURE_REDIRECT');
  const scopePath = join(root, LEAF), info = await plainFile(scopePath);
  const expected = Buffer.from(JSON.stringify({ format: SCOPE, fixtureId: descriptor.fixtureId }) + '\n');
  need(info.size === expected.length && (await readFile(scopePath)).equals(expected), 'FIXTURE_SCOPE_INVALID');
  return Object.freeze({ root });
}
export async function createDisposableFixture() {
  const parent = resolve(tmpdir());
  need(isAbsolute(parent) && !/^[/\\]{2}/.test(parent), 'FIXTURE_PATH_INVALID');
  const root = await mkdtemp(join(parent, 'ytrace-f1-synthetic-'));
  const descriptor = Object.freeze({ format: SCOPE, fixtureId: randomUUID(), root });
  lexical(descriptor);
  const handle = await open(join(root, LEAF), 'wx');
  try { await handle.writeFile(JSON.stringify({ format: SCOPE, fixtureId: descriptor.fixtureId }) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
  await admitFixture(descriptor);
  return descriptor;
}
export async function inspectSyntheticRecord(descriptor, context) {
  const { root } = await admitFixture(descriptor), binding = bindSyntheticContext(context);
  const path = join(root, consumptionLeaf(binding));
  try {
    const info = await plainFile(path), bytes = await readFile(path);
    return { exists: true, bytes: bytes.length, sha256: digest(bytes), data: bytes, regular: info.isFile() };
  } catch (error) { if (error?.code === 'ENOENT') return { exists: false }; throw error; }
}
export async function seedSyntheticState(descriptor, context, kind) {
  const { root } = await admitFixture(descriptor), binding = bindSyntheticContext(context);
  const complete = recordBytes(binding);
  let bytes;
  if (kind === 'empty') bytes = Buffer.alloc(0);
  else if (kind === 'partial') bytes = complete.subarray(0, 17);
  else if (kind === 'malformed') bytes = Buffer.from('{invalid synthetic state');
  else if (kind === 'conflict') bytes = recordBytes(bindSyntheticContext({ ...context, proofSha256: 'c'.repeat(64) }));
  else if (kind === 'forged-not-sent') bytes = Buffer.from('{"state":"NOT_SENT","synthetic":true}');
  else throw Error('UNSUPPORTED_SYNTHETIC_SEED');
  const h = await open(join(root, consumptionLeaf(binding)), 'wx');
  try { await h.writeFile(bytes); await h.sync(); } finally { await h.close(); }
}
export async function destroyDisposableFixture(descriptor) {
  const { root } = await admitFixture(descriptor);
  const entries = await readdir(root);
  need(entries.every(name => name === LEAF || /^consumed-[a-f0-9]{64}\.f1$/.test(name)), 'FIXTURE_SCOPE_INVALID');
  for (const name of entries) await plainFile(join(root, name));
  // Exact validated files only; no recursive deletion, path enumeration across shells or recovery cleanup.
  for (const name of entries) await unlink(join(root, name));
  await rmdir(root);
}

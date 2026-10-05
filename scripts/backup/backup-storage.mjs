import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { localPath, safeRelativePath } from './common.mjs';

export function storageApi(url, key, fetchImpl = fetch) {
  const origin = new URL(url).origin;
  async function request(route, body) {
    let response;
    try {
      response = await fetchImpl(`${origin}/storage/v1/${route}`, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(120_000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Encoding': 'identity', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error('Storage request failed (network/timeout)'); }
    if (!response.ok) throw new Error(`Storage request failed (HTTP ${response.status})`);
    return response;
  }
  async function json(route, body) {
    try { return await (await request(route, body)).json(); }
    catch (error) { if (error instanceof SyntaxError) throw new Error('Storage returned invalid JSON'); throw error; }
  }
  return {
    buckets: (limit, offset) => json(`bucket?limit=${limit}&offset=${offset}&sortColumn=id&sortOrder=asc`),
    list: (bucket, prefix, limit, offset) => json(`object/list/${encodeURIComponent(bucket)}`, {
      prefix, limit, offset, sortBy: { column: 'name', order: 'asc' },
    }),
    download: (bucket, objectPath) => request(`object/authenticated/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`),
  };
}

export async function discoverBuckets(api, pageSize = 100) {
  const buckets = [], seen = new Set();
  for (let offset = 0; ; offset += pageSize) {
    const page = await api.buckets(pageSize, offset);
    if (!Array.isArray(page) || page.length > pageSize) throw new Error('Invalid bucket enumeration response');
    for (const bucket of page) {
      safeRelativePath(bucket.id);
      if (bucket.id.includes('/') || seen.has(bucket.id)) throw new Error('Duplicate/unsafe bucket or bucket pagination did not advance');
      // Non-file buckets cannot be silently called a successful binary backup.
      if (bucket.type && bucket.type !== 'STANDARD') throw new Error(`Unsupported Storage bucket type: ${bucket.id}`);
      seen.add(bucket.id);
      buckets.push({ id: bucket.id, name: bucket.name, public: bucket.public,
        fileSizeLimit: bucket.file_size_limit ?? null, allowedMimeTypes: bucket.allowed_mime_types ?? null,
        type: bucket.type ?? 'STANDARD' });
    }
    if (page.length < pageSize) break;
  }
  return buckets.sort((a, b) => a.id.localeCompare(b.id));
}

export async function enumerateObjects(api, bucket, pageSize = 100) {
  const objects = [], folders = [''], visited = new Set();
  while (folders.length) {
    const prefix = folders.pop();
    if (visited.has(prefix)) throw new Error(`Duplicate folder: ${bucket}/${prefix}`);
    visited.add(prefix);
    const seen = new Set();
    for (let offset = 0; ; offset += pageSize) {
      let page;
      try { page = await api.list(bucket, prefix, pageSize, offset); }
      catch { throw new Error(`Storage enumeration failed: ${bucket}/${prefix}`); }
      if (!Array.isArray(page) || page.length > pageSize) throw new Error(`Invalid object enumeration: ${bucket}/${prefix}`);
      for (const entry of page) {
        safeRelativePath(entry.name);
        if (entry.name.includes('/') || seen.has(entry.name)) throw new Error(`Duplicate/unsafe entry or pagination did not advance: ${bucket}/${prefix}`);
        seen.add(entry.name);
        const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.id === null && entry.metadata === null) folders.push(objectPath);
        else if (typeof entry.id === 'string' && entry.id) objects.push({
          bucket, path: objectPath, objectId: entry.id, updatedAt: entry.updated_at ?? null,
          expectedSize: entry.metadata?.size ?? null, contentType: entry.metadata?.mimetype ?? null,
          etag: entry.metadata?.eTag ?? entry.metadata?.etag ?? null,
        });
        else throw new Error(`Unrecognized object/folder entry: ${bucket}/${objectPath}`);
      }
      if (page.length < pageSize) break;
    }
  }
  return objects.sort((a, b) => a.path.localeCompare(b.path));
}

export async function inventory(api, pageSize = 100) {
  const buckets = await discoverBuckets(api, pageSize), objects = [];
  for (const bucket of buckets) objects.push(...await enumerateObjects(api, bucket.id, pageSize));
  return { buckets, objects };
}

export async function backupStorage({ root, api, pageSize = 100 }) {
  const startedAtUtc = new Date().toISOString();
  const before = await inventory(api, pageSize);
  await mkdir(localPath(root, 'storage'), { recursive: true });
  for (const bucket of before.buckets) await mkdir(localPath(root, `storage/${bucket.id}`), { recursive: true });
  const objects = [];
  // Sequential streams bound memory and API pressure regardless of object byte size.
  for (const object of before.objects) {
    try {
      const relativePath = `storage/${object.bucket}/${object.path}`;
      const filename = localPath(root, relativePath);
      await mkdir(path.dirname(filename), { recursive: true });
      const response = await api.download(object.bucket, object.path);
      if (!response.body) throw new Error('Missing download body');
      if (response.headers.get('content-encoding') && response.headers.get('content-encoding') !== 'identity') {
        throw new Error('Unexpected transfer encoding; refusing potentially decoded object bytes');
      }
      let size = 0;
      const hash = createHash('sha256');
      const meter = new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length; hash.update(chunk); callback(null, chunk);
      } });
      await pipeline(Readable.fromWeb(response.body), meter, createWriteStream(filename, { flags: 'wx', mode: 0o600 }));
      const contentLength = response.headers.get('content-length');
      if ((object.expectedSize !== null && (!Number.isSafeInteger(Number(object.expectedSize)) || Number(object.expectedSize) !== size)) ||
          (contentLength !== null && !response.headers.get('content-encoding') && Number(contentLength) !== size)) throw new Error('Download size mismatch');
      objects.push({ ...object, relativePath, size, contentType: response.headers.get('content-type') || object.contentType, sha256: hash.digest('hex') });
    } catch { throw new Error(`Storage download failed: ${object.bucket}/${object.path}`); }
  }
  const after = await inventory(api, pageSize);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Storage changed during backup; retry in a quieter window');
  const result = { startedAtUtc, completedAtUtc: new Date().toISOString(), enumerationComplete: true,
    secondInventoryMatched: true, buckets: before.buckets, objects };
  await writeFile(localPath(root, 'storage-inventory.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return result;
}

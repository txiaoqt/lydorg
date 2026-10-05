import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { localPath, safeRelativePath } from './common.mjs';

export class StorageApiError extends Error {
  constructor(category, detail = '') {
    super(detail ? `${category}: ${detail}` : category);
    this.category = category;
  }
}

function safeSdkError(error) {
  const status = Number(error?.status ?? error?.statusCode);
  if (status === 401 || status === 403) return new StorageApiError(`Storage authorization failed (HTTP ${status})`);
  return new StorageApiError('Storage request failed');
}

function unwrapSdkResult(result) {
  if (!result || typeof result !== 'object') throw new StorageApiError('Storage returned an invalid SDK response');
  if (result.error) throw safeSdkError(result.error);
  return result.data;
}

/**
 * Build a server-side Storage adapter with the official Supabase client.
 * The API key is handed directly to createClient; this module does not construct
 * Storage URLs or authentication headers itself. The fetch wrapper only records
 * response metadata for the SDK's streaming download call so existing integrity
 * checks can still compare bytes, size, and transfer encoding.
 */
export function storageApi(url, key, { createClientImpl = createClient, fetchImpl = fetch } = {}) {
  let captureDownloadResponse = false;
  let downloadResponseHeaders = null;
  const sdkFetch = async (...args) => {
    const response = await fetchImpl(...args);
    if (captureDownloadResponse) downloadResponseHeaders = response.headers;
    return response;
  };

  let client;
  try {
    client = createClientImpl(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { 'Accept-Encoding': 'identity' },
        fetch: sdkFetch,
      },
    });
  } catch {
    throw new StorageApiError('Could not initialize Supabase Storage client');
  }

  return {
    buckets: async (limit, offset) => unwrapSdkResult(await client.storage.listBuckets({
      limit, offset, sortColumn: 'id', sortOrder: 'asc',
    })),
    list: async (bucket, prefix, limit, offset) => unwrapSdkResult(await client.storage.from(bucket).list(prefix, {
      limit, offset, sortBy: { column: 'name', order: 'asc' },
    })),
    download: async (bucket, objectPath) => {
      downloadResponseHeaders = null;
      captureDownloadResponse = true;
      let result;
      try {
        result = await client.storage.from(bucket).download(objectPath, {}, {
          redirect: 'error', signal: AbortSignal.timeout(120_000),
        }).asStream();
      } catch (error) {
        throw safeSdkError(error);
      } finally {
        captureDownloadResponse = false;
      }
      const body = unwrapSdkResult(result);
      if (!body) throw new StorageApiError('Storage returned an empty download stream');
      return { body, headers: downloadResponseHeaders };
    },
  };
}

export async function discoverBuckets(api, pageSize = 100) {
  const buckets = [], seen = new Set();
  for (let offset = 0; ; offset += pageSize) {
    let page;
    try { page = await api.buckets(pageSize, offset); }
    catch (error) {
      if (error instanceof StorageApiError && error.category.startsWith('Storage authorization failed')) throw error;
      throw new StorageApiError('Storage enumeration failed', 'bucket discovery');
    }
    if (!Array.isArray(page) || page.length > pageSize) throw new StorageApiError('Storage enumeration failed', 'invalid bucket response');
    for (const bucket of page) {
      safeRelativePath(bucket.id);
      if (bucket.id.includes('/') || seen.has(bucket.id)) throw new Error('Duplicate/unsafe bucket or bucket pagination did not advance');
      // Non-file buckets cannot be silently called a successful binary backup.
      if (bucket.type && bucket.type !== 'STANDARD') throw new StorageApiError('Storage enumeration failed', `unsupported bucket type: ${bucket.id}`);
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
      catch (error) {
        if (error instanceof StorageApiError && error.category.startsWith('Storage authorization failed')) {
          throw new StorageApiError('Storage authorization failed', `${bucket}/${prefix}`);
        }
        throw new StorageApiError('Storage enumeration failed', `${bucket}/${prefix}`);
      }
      if (!Array.isArray(page) || page.length > pageSize) throw new StorageApiError('Storage enumeration failed', `invalid object response: ${bucket}/${prefix}`);
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
  if (before.buckets.length === 0) throw new StorageApiError('Storage API returned zero buckets; refusing an empty inventory');
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
      const contentEncoding = response.headers?.get('content-encoding') ?? null;
      if (contentEncoding && contentEncoding !== 'identity') {
        throw new Error('Unexpected transfer encoding; refusing potentially decoded object bytes');
      }
      let size = 0;
      const hash = createHash('sha256');
      const meter = new Transform({ transform(chunk, encoding, callback) {
        size += chunk.length; hash.update(chunk); callback(null, chunk);
      } });
      const stream = response.body instanceof Readable ? response.body : Readable.fromWeb(response.body);
      await pipeline(stream, meter, createWriteStream(filename, { flags: 'wx', mode: 0o600 }));
      const contentLength = response.headers?.get('content-length') ?? null;
      if ((object.expectedSize !== null && (!Number.isSafeInteger(Number(object.expectedSize)) || Number(object.expectedSize) !== size)) ||
          (contentLength !== null && !contentEncoding && Number(contentLength) !== size)) throw new Error('Download size mismatch');
      if (contentEncoding && contentEncoding !== 'identity') throw new Error('Unexpected transfer encoding');
      objects.push({ ...object, relativePath, size, contentType: response.headers?.get('content-type') || object.contentType, sha256: hash.digest('hex') });
    } catch (error) {
      if (error instanceof StorageApiError && error.category.startsWith('Storage authorization failed')) {
        throw new Error(`Storage authorization failed: ${object.bucket}/${object.path}`);
      }
      throw new Error(`Storage download failed: ${object.bucket}/${object.path}`);
    }
  }
  const after = await inventory(api, pageSize);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Storage changed during backup; retry in a quieter window');
  const result = { startedAtUtc, completedAtUtc: new Date().toISOString(), enumerationComplete: true,
    secondInventoryMatched: true, buckets: before.buckets, objects };
  await writeFile(localPath(root, 'storage-inventory.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return result;
}

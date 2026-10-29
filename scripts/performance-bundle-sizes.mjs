// Build artifacts only; these numbers do not measure browser transfer or latency.
// node scripts/performance-bundle-sizes.mjs tmp/performance-baseline tmp/performance-after
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
const results = [];
for (const dir of process.argv.slice(2)) {
  const manifest = JSON.parse(await readFile(join(dir, '.vite/manifest.json'), 'utf8'));
  const entry = Object.values(manifest).find(chunk => chunk.isEntry);
  const visited = new Set();
  function visit(chunk) {
    if (visited.has(chunk.file)) return;
    visited.add(chunk.file);
    for (const key of chunk.imports ?? []) visit(manifest[key]);
  }
  visit(entry);
  const chunks = await Promise.all((await readdir(join(dir, 'assets'))).filter(f => f.endsWith('.js')).map(async file => {
    const bytes = await readFile(join(dir, 'assets', file));
    return { file: 'assets/' + file, bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
  }));
  results.push({ directory: dir, jsChunkCount: chunks.length, initialStaticJs: chunks.filter(c => visited.has(c.file)),
    initialBytes: chunks.filter(c => visited.has(c.file)).reduce((n,c) => n+c.bytes, 0),
    initialGzipBytes: chunks.filter(c => visited.has(c.file)).reduce((n,c) => n+c.gzipBytes, 0),
    largestChunks: chunks.sort((a,b) => b.bytes-a.bytes).slice(0,10) });
}
console.log(JSON.stringify(results, null, 2));

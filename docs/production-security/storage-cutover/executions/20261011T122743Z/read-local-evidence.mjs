// Read local reviewed artifacts in bounded chunks; no network or credentials.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const [path, offsetText = '0'] = process.argv.slice(2);
const bytes = await readFile(path);
const content = bytes.toString('utf8');
const offset = Number(offsetText);
if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid offset');
process.stdout.write(JSON.stringify({bytes:bytes.length,characters:content.length,sha256:createHash('sha256').update(bytes).digest('hex'),text:content.slice(offset,offset+12000)}));

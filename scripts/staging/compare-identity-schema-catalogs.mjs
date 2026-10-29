// Offline deterministic catalog fingerprints; no credentials or network.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory='docs/staging-validation/2026-10-10/identity-schema/';
const [production,staging]=await Promise.all(['production-catalog.json','staging-after-catalog.json'].map(async file=>JSON.parse(await readFile(directory+file,'utf8'))));
function normalize(value) {
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]));
  return typeof value==='string'?value.replaceAll('\r\n','\n'):value;
}
const digest=value=>createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
const sections=['complete',...Object.keys(production).sort()];
const fingerprints=sections.map(section=>({section,production:digest(section==='complete'?production:production[section]),
  staging:digest(section==='complete'?staging:staging[section])})).map(row=>({...row,status:row.production===row.staging?'PASS':'FAIL'}));
await writeFile(directory+'schema-fingerprints.json',JSON.stringify({algorithm:'SHA-256; sorted object keys; LF strings; catalog SQL supplies sorted arrays',fingerprints},null,2));
console.log(JSON.stringify(fingerprints));
if(fingerprints.some(row=>row.status!=='PASS'))process.exitCode=1;

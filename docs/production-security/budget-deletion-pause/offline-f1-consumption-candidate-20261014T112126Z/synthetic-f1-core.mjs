// NON-RUNNABLE — NOT AUTHORIZED. Synthetic policy only; no live authorization.
import { createHash } from 'node:crypto';
export const PROJECT = 'OFFLINE-PROJECT-ALPHA';
export const PURPOSE = 'OFFLINE-OBSERVATION-V1';
export const FORMAT = 'YTRACE_SYNTHETIC_F1_CONSUMPTION_V1';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export class SyntheticFailure extends Error {
  constructor(code) { super('Synthetic F1 operation stopped'); this.code = code; }
}
export function need(condition, code) { if (!condition) throw new SyntheticFailure(code); }
const CODES = new Set([
  'SYNTHETIC_SCOPE_INVALID', 'SYNTHETIC_CONTEXT_INVALID', 'SYNTHETIC_TIME_INVALID',
  'FIXTURE_DESCRIPTOR_INVALID', 'FIXTURE_PATH_INVALID', 'FIXTURE_REDIRECT',
  'FIXTURE_SCOPE_INVALID', 'CONSUMPTION_PRESENT_OR_UNCERTAIN', 'CONSUMPTION_IO_UNCERTAIN',
  'SYNTHETIC_FAULT', 'CONSUMPTION_READBACK_INVALID', 'OBSERVATION_UNCERTAIN',
  'INVOCATION_ALREADY_USED', 'OPTIONS_INVALID', 'SYNTHETIC_OPERATION_FAILED',
]);
export function safeCode(error) {
  try {
    if (!(error instanceof SyntheticFailure)) return 'SYNTHETIC_OPERATION_FAILED';
    const own = Object.getOwnPropertyDescriptor(error, 'code');
    return own && Object.hasOwn(own, 'value') && typeof own.value === 'string' && CODES.has(own.value)
      ? own.value : 'SYNTHETIC_OPERATION_FAILED';
  } catch { return 'SYNTHETIC_OPERATION_FAILED'; }
}
function utc(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value), 'SYNTHETIC_TIME_INVALID');
  const ms = Date.parse(value);
  need(Number.isSafeInteger(ms) && new Date(ms).toISOString() === value.slice(0, -1) + '.000Z', 'SYNTHETIC_TIME_INVALID');
  return ms;
}
const FIELDS = ['authorizationReference', 'project', 'purpose', 'nonce', 'proofSha256',
  'bundleSha256', 'approvedAt', 'validFromUtc', 'validUntilUtc'];
export function bindSyntheticContext(value) {
  need(value && Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join('|') === [...FIELDS].sort().join('|'), 'SYNTHETIC_CONTEXT_INVALID');
  const context = {};
  for (const name of FIELDS) {
    const own = Object.getOwnPropertyDescriptor(value, name);
    need(own && Object.hasOwn(own, 'value') && typeof own.value === 'string', 'SYNTHETIC_CONTEXT_INVALID');
    context[name] = own.value;
  }
  need(context.project === PROJECT && context.purpose === PURPOSE &&
    /^SYNTHETIC-AUTH-[A-Z0-9]{1,40}$/.test(context.authorizationReference), 'SYNTHETIC_SCOPE_INVALID');
  need(/^SYNTHETIC-NONCE-[A-Z0-9]{1,40}$/.test(context.nonce) &&
    /^[a-f0-9]{64}$/.test(context.proofSha256) && /^[a-f0-9]{64}$/.test(context.bundleSha256), 'SYNTHETIC_CONTEXT_INVALID');
  const approved = utc(context.approvedAt), start = utc(context.validFromUtc), end = utc(context.validUntilUtc);
  need(approved <= start && start < end, 'SYNTHETIC_TIME_INVALID');
  // The unique key deliberately excludes nonce, proof, bundle and timestamps.
  const key = digest(Buffer.from(JSON.stringify({
    authorizationReference: context.authorizationReference, project: PROJECT, purpose: PURPOSE,
  })));
  return Object.freeze({ key, contextSha256: digest(Buffer.from(JSON.stringify(context))), context: Object.freeze(context) });
}
export const consumptionLeaf = binding => 'consumed-' + binding.key + '.f1';
export function recordBytes(binding) {
  return Buffer.from(JSON.stringify({ format: FORMAT, authorizationKey: binding.key,
    contextSha256: binding.contextSha256, state: 'CONSUMED_BEFORE_OBSERVATION' }) + '\n');
}

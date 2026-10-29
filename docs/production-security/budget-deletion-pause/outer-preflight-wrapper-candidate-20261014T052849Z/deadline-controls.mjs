// Offline-review candidate. No I/O, environment access, or process launch.
export class WrapperFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function requireCondition(condition, code) {
  if (!condition) throw new WrapperFailure(code);
}
const NS_PER_MS = 1000000n;
export const PROOF_MAX_AGE_NS = 300000000000n;

// Parse the original ISO string; reject normalization, unknown -00:00 offsets,
// timezone-free text, leap seconds, 24:00, whitespace and excessive precision.
export function parseIsoNanoseconds(value, { utcOnly = false } = {}) {
  requireCondition(typeof value === 'string', 'TIME_MISSING_OR_INVALID');
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  requireCondition(m !== null, 'TIME_EXPLICIT_OFFSET_REQUIRED');
  const [, y, mo, d, h, mi, s, fraction = '', zone] = m;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
  requireCondition(month >= 1 && month <= 12 && day >= 1 && day <= 31 &&
    hour < 24 && minute < 60 && second < 60, 'TIME_COMPONENT_INVALID');
  requireCondition(zone !== '-00:00', 'TIME_UNKNOWN_OFFSET');
  requireCondition(!utcOnly || zone === 'Z' || zone === '+00:00', 'VALIDITY_MUST_BE_UTC');
  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const oh = Number(zone.slice(1, 3)), om = Number(zone.slice(4, 6));
    requireCondition(oh <= 14 && om <= 59 && (oh !== 14 || om === 0), 'TIME_OFFSET_INVALID');
    offsetMinutes = (zone[0] === '-' ? -1 : 1) * (oh * 60 + om);
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  requireCondition(date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day && Number.isSafeInteger(date.getTime()), 'TIME_CALENDAR_INVALID');
  return BigInt(date.getTime() - offsetMinutes * 60000) * NS_PER_MS +
    BigInt(fraction.padEnd(9, '0') || '0');
}
export function wallClockNanoseconds(value) {
  requireCondition(Number.isSafeInteger(value) && value >= 0, 'CLOCK_INVALID');
  return BigInt(value) * NS_PER_MS;
}
export function temporalGate({ proofTimestamp, validityStartUtc, validityEndUtc }, nowMs) {
  const proof = parseIsoNanoseconds(proofTimestamp);
  const start = parseIsoNanoseconds(validityStartUtc, { utcOnly: true });
  const end = parseIsoNanoseconds(validityEndUtc, { utcOnly: true });
  requireCondition(start < end, 'VALIDITY_INTERVAL_NOT_ORDERED');
  const now = wallClockNanoseconds(nowMs);
  requireCondition(now >= start && now <= end, 'OUTSIDE_APPROVED_VALIDITY');
  requireCondition(now >= proof, 'PROOF_TIMESTAMP_FUTURE');
  requireCondition(now - proof <= PROOF_MAX_AGE_NS, 'PROOF_EXPIRED');
  return { now, proof, start, end, deadline: proof + PROOF_MAX_AGE_NS < end ? proof + PROOF_MAX_AGE_NS : end };
}
export function completionGate(times, nowMs, launchGate, startMono, endMono) {
  const complete = temporalGate(times, nowMs);
  requireCondition(complete.now >= launchGate.now, 'WALL_CLOCK_REGRESSED');
  requireCondition(Number.isFinite(startMono) && Number.isFinite(endMono) &&
    startMono >= 0 && endMono >= startMono, 'MONOTONIC_CLOCK_INVALID');
  const elapsedNs = Math.ceil((endMono - startMono) * 1000000);
  requireCondition(Number.isSafeInteger(elapsedNs), 'MONOTONIC_DURATION_INVALID');
  requireCondition(launchGate.now + BigInt(elapsedNs) <= launchGate.deadline, 'DEADLINE_CROSSED');
  return complete;
}

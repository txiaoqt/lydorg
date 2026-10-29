// Public offline-review facade. No CLI/live transport. Validation cannot be replaced.
import { requireCondition } from './deadline-controls.mjs';
import { validateReviewedPreflightEvidence } from './preflight-evidence.mjs';
import { createPreflightWrapperEngine } from './preflight-wrapper-engine.mjs';
export { PINNED_PREFLIGHT_REQUEST } from './preflight-wrapper-engine.mjs';
export function createPreflightWrapper(options) {
  requireCondition(options && !Object.hasOwn(options, 'evidenceValidator'), 'EVIDENCE_VALIDATOR_OVERRIDE_FORBIDDEN');
  return createPreflightWrapperEngine({
    ...options, evidenceValidator: validateReviewedPreflightEvidence,
  });
}

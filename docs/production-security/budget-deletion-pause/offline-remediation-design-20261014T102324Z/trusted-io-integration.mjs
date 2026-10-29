// NON-RUNNABLE — NOT AUTHORIZED. No CLI and no real I/O implementations.
// This facade binds the unchanged reviewed wrapper and disallows test substitution.
import { requireCondition as need } from '../outer-preflight-wrapper-candidate-20261014T054751Z/deadline-controls.mjs';
import { createPreflightWrapper } from '../outer-preflight-wrapper-candidate-20261014T054751Z/preflight-wrapper.mjs';
import { createIntegrationEngine } from './integration-engine.mjs';
export function createTrustedIOIntegration(options) {
  need(options && !Object.hasOwn(options, 'makePreflight') &&
    !Object.hasOwn(options, 'evidenceValidator') && !Object.hasOwn(options, 'wrapperFactory'),
    'REVIEWED_WRAPPER_SUBSTITUTION_FORBIDDEN');
  return createIntegrationEngine({
    ...options, makePreflight: io => createPreflightWrapper(io),
  });
}
// Execution remains BLOCKED until the real provider set is separately implemented
// and reviewed, including atomic archive semantics and bounded native child lifetime.

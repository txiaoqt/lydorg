/**
 * Keeps an unsaved budget proposal in this browser so a reload does not lose typed answers.
 * Only a convenience copy: the saved request in the database stays the source of truth.
 */
const keyFor = (scope: string) => `ytrace_budget_proposal_draft:${scope}`;

export const readProposalDraft = <T>(scope: string): T | null => {
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeProposalDraft = (scope: string, value: unknown) => {
  try {
    window.localStorage.setItem(keyFor(scope), JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the form still works without it.
  }
};

export const clearProposalDraft = (scope: string) => {
  try {
    window.localStorage.removeItem(keyFor(scope));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
};

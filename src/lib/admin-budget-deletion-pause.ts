export const BUDGET_DELETION_PAUSED_CODE = "BUDGET_DELETION_PAUSED";
export const BUDGET_DELETION_PAUSED_MESSAGE =
  "Permanent budget deletion is temporarily unavailable. Existing records and files are preserved.";

export class BudgetDeletionPausedError extends Error {
  readonly code = BUDGET_DELETION_PAUSED_CODE;

  constructor() {
    super(BUDGET_DELETION_PAUSED_MESSAGE);
    this.name = "BudgetDeletionPausedError";
  }
}

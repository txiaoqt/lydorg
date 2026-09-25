/**
 * Centralized Revision Deadline & Enforcement Model
 *
 * Rules:
 * 1. Whenever an Admin requests revisions (status = 'needs_revision'),
 *    a 5-calendar-day deadline is created from the exact server/database timestamp.
 * 2. Initial state: status = needs_revision, revision_requested_at = NOW(),
 *    revision_due_at = NOW() + 5 days, revision_locked = false.
 * 3. When deadline expires: revision_locked = true (or enforced as locked).
 * 4. Admin can explicitly unlock submission: revision_locked = false,
 *    revision_unlocked_at = NOW(), preserving the original historical deadline.
 * 5. Server-side / database time and stored revision_locked boolean are authoritative.
 * 6. Prior deadlines and unlock events are preserved in revision history.
 */

export const REVISION_DEADLINE_DAYS = 5;
export const REVISION_DEADLINE_MS = REVISION_DEADLINE_DAYS * 24 * 60 * 60 * 1000;

export interface RevisionDeadlineCalculation {
  requestedAt: string;
  dueAt: string;
}

export interface RevisionLockStateItem {
  status?: string | null;
  adminStatus?: string | null;
  revisionRequestedAt?: string | null;
  revisionDueAt?: string | null;
  revisionLocked?: boolean | null;
  revisionLockedAt?: string | null;
  revisionUnlockedAt?: string | null;
  revisionUnlockedBy?: string | null;
}

/**
 * Calculates a 5-calendar-day deadline from a revision request timestamp.
 */
export const calculateRevisionDeadline = (
  requestedAtInput: string | Date = new Date(),
): RevisionDeadlineCalculation => {
  const reqDate = typeof requestedAtInput === "string" ? new Date(requestedAtInput) : requestedAtInput;
  const safeReqDate = Number.isNaN(reqDate.getTime()) ? new Date() : reqDate;
  const dueDate = new Date(safeReqDate.getTime() + REVISION_DEADLINE_MS);

  return {
    requestedAt: safeReqDate.toISOString(),
    dueAt: dueDate.toISOString(),
  };
};

/**
 * Determines whether a revision deadline has expired according to authoritative time.
 */
export const isRevisionExpired = (
  dueAt?: string | null,
  referenceNowInput?: string | Date,
): boolean => {
  if (!dueAt) return false;
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;

  const now = referenceNowInput
    ? (typeof referenceNowInput === "string" ? new Date(referenceNowInput) : referenceNowInput)
    : new Date();
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;

  return safeNow.getTime() >= dueDate.getTime();
};

/**
 * Determines whether a submission in Needs Revision state has been explicitly unlocked by an Admin
 * after the original deadline expired or is granted resubmission access.
 */
export const isRevisionAdminUnlocked = (
  item?: RevisionLockStateItem | null,
  referenceNowInput?: string | Date,
): boolean => {
  if (!item) return false;
  const rawStatus = (item.status ?? item.adminStatus)?.trim().toLowerCase();
  if (rawStatus && rawStatus !== "needs_revision" && rawStatus !== "rejected_red") {
    return false;
  }

  // If revision_unlocked_at is explicitly recorded
  if (item.revisionUnlockedAt) {
    return true;
  }

  // If revision_locked is explicitly false and deadline has passed without a locked timestamp
  if (item.revisionLocked === false && item.revisionDueAt && isRevisionExpired(item.revisionDueAt, referenceNowInput)) {
    // If not actively marked lockedAt, it's an administrative exception
    if (!item.revisionLockedAt) {
      return true;
    }
  }

  return false;
};

export interface RevisionTimeRemaining {
  isExpired: boolean;
  isUnlocked: boolean;
  label: string;
  formatted: string;
  days: number;
  hours: number;
  minutes: number;
  totalMsRemaining: number;
}

/**
 * Derives human-friendly remaining time text from a persisted revision deadline,
 * taking into account explicit Admin unlock state.
 */
export const getRevisionTimeRemaining = (
  dueAt?: string | null,
  referenceNowInput?: string | Date,
  isUnlocked: boolean = false,
): RevisionTimeRemaining => {
  if (isUnlocked) {
    return {
      isExpired: false,
      isUnlocked: true,
      label: "Unlocked by Admin",
      formatted: "Unlocked by Admin",
      days: 0,
      hours: 0,
      minutes: 0,
      totalMsRemaining: 0,
    };
  }

  if (!dueAt) {
    return {
      isExpired: false,
      isUnlocked: false,
      label: "",
      formatted: "",
      days: 0,
      hours: 0,
      minutes: 0,
      totalMsRemaining: 0,
    };
  }

  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return {
      isExpired: false,
      isUnlocked: false,
      label: "",
      formatted: "",
      days: 0,
      hours: 0,
      minutes: 0,
      totalMsRemaining: 0,
    };
  }

  const now = referenceNowInput
    ? (typeof referenceNowInput === "string" ? new Date(referenceNowInput) : referenceNowInput)
    : new Date();
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;

  const diffMs = dueDate.getTime() - safeNow.getTime();

  if (diffMs <= 0) {
    return {
      isExpired: true,
      isUnlocked: false,
      label: "Revision deadline expired",
      formatted: "Revision deadline expired",
      days: 0,
      hours: 0,
      minutes: 0,
      totalMsRemaining: 0,
    };
  }

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const totalHours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let label: string;
  if (days >= 2) {
    label = `${days} days remaining`;
  } else if (days === 1) {
    label = "1 day remaining";
  } else if (totalHours >= 1) {
    label = `${totalHours} ${totalHours === 1 ? "hour" : "hours"} remaining`;
  } else {
    label = `${Math.max(1, totalMinutes)} ${totalMinutes === 1 ? "minute" : "minutes"} remaining`;
  }

  return {
    isExpired: false,
    isUnlocked: false,
    label,
    formatted: label,
    days,
    hours,
    minutes,
    totalMsRemaining: diffMs,
  };
};

/**
 * Formats a revision due date in Asia/Manila timezone for display.
 */
export const formatRevisionDeadline = (dueAt?: string | null): string => {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

/**
 * Check if a submission/item in Needs Revision state is locked due to deadline expiration or locked flag.
 *
 * Rules:
 * - If status is not needs_revision / rejected_red -> false
 * - If explicitly unlocked by Admin (revisionUnlockedAt != null or revisionLocked === false past due) -> false
 * - If revisionLocked === true -> true
 * - If revisionLockedAt != null -> true
 * - If revisionDueAt has passed and item was not unlocked -> true
 * - Otherwise (within 5 days and revisionLocked !== true) -> false
 */
export const isSubmissionRevisionLocked = (
  item?: RevisionLockStateItem | null,
  referenceNowInput?: string | Date,
): boolean => {
  if (!item) return false;

  const rawStatus = (item.status ?? item.adminStatus)?.trim().toLowerCase();
  if (rawStatus && rawStatus !== "needs_revision" && rawStatus !== "rejected_red") {
    return false;
  }

  // If item has been explicitly unlocked by Admin
  if (item.revisionUnlockedAt) {
    return false;
  }

  // If authoritative revisionLocked boolean is explicitly true
  if (item.revisionLocked === true) {
    return true;
  }

  // If timestamp locked
  if (item.revisionLockedAt) {
    return true;
  }

  // If deadline has passed
  if (item.revisionDueAt && isRevisionExpired(item.revisionDueAt, referenceNowInput)) {
    // If Admin explicitly set revisionLocked = false as an override
    if (item.revisionLocked === false && item.revisionUnlockedAt) {
      return false;
    }
    // Default expiration locks the item
    return true;
  }

  return false;
};


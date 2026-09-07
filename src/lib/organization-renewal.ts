import type {
  AccreditationPersistedStatus,
  AccreditationStatus,
  DocumentSubmissionStatus,
  OrganizationProfile,
  OrganizationRenewalRecord,
  RenewalApplicationStatus,
} from "./lydo-connect-data";

export const ORGANIZATION_REGISTRATION_VALIDITY_YEARS = 3;
export const RENEWAL_WINDOW_DAYS = 90;
export const RENEWAL_WINDOW_EARLY_DAYS = 90;
export const RENEWAL_LATE_WINDOW_DAYS = 180;
export const RENEWAL_ANCHOR_CUTOFF_DAYS = 30;

export const ALLOWED_RENEWAL_TRANSITIONS: Record<
  RenewalApplicationStatus,
  readonly RenewalApplicationStatus[]
> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["needs_revision", "approved", "rejected"],
  needs_revision: ["resubmitted"],
  resubmitted: ["under_review"],
  approved: [],
  rejected: [],
} as const;

export const canTransitionRenewal = (
  from: RenewalApplicationStatus,
  to: RenewalApplicationStatus,
): boolean => {
  return (ALLOWED_RENEWAL_TRANSITIONS[from] as readonly string[])?.includes(to) ?? false;
};

export const isRenewalTerminal = (status: RenewalApplicationStatus): boolean => {
  return status === "approved" || status === "rejected";
};

export const canReplaceSubmissionFile = (adminStatus: DocumentSubmissionStatus): boolean => {
  return adminStatus === "needs_revision" || adminStatus === "rejected_red";
};

export type OrganizationRenewalCountdown = {
  expiresAt: string;
  daysRemaining: number;
  isDue: boolean;
};

export type RenewalWindowEligibility = {
  canDraft: boolean;
  canSubmit: boolean;
  reason?: string;
  windowStatus: "too_early" | "open" | "late_open" | "cutoff_exceeded";
  daysUntilOpen?: number;
  daysPastExpiry?: number;
};

/**
 * Canonical accreditation status derivation contract.
 * Pure deterministic derivation from persisted status and end_date.
 *
 * 1. If persisted status = revoked -> 'revoked'
 * 2. Else if persisted status = superseded -> 'superseded'
 * 3. Else if now > end_date -> 'expired'
 * 4. Else if end_date - now <= 90 days -> 'expiring_soon'
 * 5. Else -> 'active'
 *
 * NOTE: There is NO accreditation grace period. When current date passes
 * the active accreditation end_date, derived status becomes 'expired'
 * even if a renewal application is in progress.
 */
export const deriveAccreditationStatus = ({
  persistedStatus,
  endDate,
  now = new Date(),
}: {
  persistedStatus: AccreditationPersistedStatus;
  endDate: string | Date;
  now?: Date;
}): AccreditationStatus => {
  if (persistedStatus === "revoked") return "revoked";
  if (persistedStatus === "superseded") return "superseded";

  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (Number.isNaN(end.getTime())) return "active";

  // Compare on day boundary or timestamp
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "expired";

  const daysRemaining = Math.ceil(diffMs / 86_400_000);
  if (daysRemaining <= RENEWAL_WINDOW_DAYS) return "expiring_soon";

  return "active";
};

/**
 * Standard Continuous Protection Anchor (Final Locked Policy 7).
 *
 * Let:
 *   anchor_cutoff = previous_accreditation.end_date + 30 calendar days
 *
 * If approval_date <= anchor_cutoff:
 *   new_start_date = previous_accreditation.end_date
 *   new_end_date = previous_accreditation.end_date + 3 years
 *   (Continuous coverage: early renewers forfeit 0 days; in-grace renewers maintain continuous legal standing)
 *
 * If approval_date > anchor_cutoff:
 *   new_start_date = approval_date
 *   new_end_date = approval_date + 3 years
 *   (Lapsed late renewal beyond 30 days starts fresh on approval date)
 */
export const calculateStandardContinuousProtectionRenewalTerm = (
  previousEndDate: string | Date,
  approvalDate: string | Date = new Date(),
  validityYears = ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
): { startDate: string; endDate: string; isContinuous: boolean } => {
  const prevEnd = typeof previousEndDate === "string" ? new Date(previousEndDate) : previousEndDate;
  const approval = typeof approvalDate === "string" ? new Date(approvalDate) : approvalDate;

  if (Number.isNaN(prevEnd.getTime())) {
    throw new Error("Invalid previous accreditation end date provided.");
  }
  if (Number.isNaN(approval.getTime())) {
    throw new Error("Invalid approval date provided.");
  }

  // Use UTC date-only components for clean calendar boundary comparison
  const prevDate = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate()));
  const approvalDateOnly = new Date(Date.UTC(approval.getUTCFullYear(), approval.getUTCMonth(), approval.getUTCDate()));

  // Anchor cutoff is exactly previous_end + 30 calendar days
  const cutoffDate = new Date(prevDate);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() + RENEWAL_ANCHOR_CUTOFF_DAYS);

  if (approvalDateOnly.getTime() <= cutoffDate.getTime()) {
    // Timely or In-Grace Approval -> Continuous anchor
    const startDate = new Date(prevDate);
    const endDate = new Date(startDate);
    endDate.setUTCFullYear(endDate.getUTCFullYear() + validityYears);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      isContinuous: true,
    };
  } else {
    // Lapsed Late Renewal (> 30 days past expiration) -> Approval date anchor
    const startDate = new Date(approvalDateOnly);
    const endDate = new Date(startDate);
    endDate.setUTCFullYear(endDate.getUTCFullYear() + validityYears);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      isContinuous: false,
    };
  }
};

/**
 * Backwards-compatible fixed-anniversary helper.
 */
export const calculateFixedAnniversaryRenewalTerm = (
  previousEndDate: string | Date,
  validityYears = ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
): { startDate: string; endDate: string } => {
  const res = calculateStandardContinuousProtectionRenewalTerm(previousEndDate, previousEndDate, validityYears);
  return {
    startDate: res.startDate,
    endDate: res.endDate,
  };
};

/**
 * Evaluates whether an organization is inside the permitted renewal drafting window.
 *
 * Rules (Final Locked Policy 6):
 * - Window opens: 90 calendar days before expiry
 * - Window closes: 180 calendar days after expiry
 * - Beyond 180 days: Renewal drafting blocked; organization must re-register
 */
export const getRenewalWindowEligibility = (
  accreditationExpiresAt: string | Date | null | undefined,
  now = new Date(),
): RenewalWindowEligibility => {
  if (!accreditationExpiresAt) {
    return {
      canDraft: false,
      canSubmit: false,
      reason: "No authoritative accreditation expiration date found.",
      windowStatus: "too_early",
    };
  }

  const expiry = typeof accreditationExpiresAt === "string" ? new Date(accreditationExpiresAt) : accreditationExpiresAt;
  if (Number.isNaN(expiry.getTime())) {
    return {
      canDraft: false,
      canSubmit: false,
      reason: "Invalid accreditation expiration date.",
      windowStatus: "too_early",
    };
  }

  const nowDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const expiryDateOnly = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate()));

  const diffMs = expiryDateOnly.getTime() - nowDateOnly.getTime();
  const daysDiff = Math.round(diffMs / 86_400_000);

  // Case 1: More than 90 days before expiry -> Too early
  if (daysDiff > RENEWAL_WINDOW_EARLY_DAYS) {
    const daysUntilOpen = daysDiff - RENEWAL_WINDOW_EARLY_DAYS;
    return {
      canDraft: false,
      canSubmit: false,
      reason: `Renewal window opens 90 days before expiry (in ${daysUntilOpen} days).`,
      windowStatus: "too_early",
      daysUntilOpen,
    };
  }

  // Case 2: Between 90 days before expiry and expiry date -> Active Open Window
  if (daysDiff >= 0) {
    return {
      canDraft: true,
      canSubmit: true,
      windowStatus: "open",
    };
  }

  // Case 3: Expired, but within 180 days after expiry -> Late Renewal Window
  const daysPastExpiry = Math.abs(daysDiff);
  if (daysPastExpiry <= RENEWAL_LATE_WINDOW_DAYS) {
    return {
      canDraft: true,
      canSubmit: true,
      reason: `Late renewal allowed within 180 days of expiry (${daysPastExpiry} days expired).`,
      windowStatus: "late_open",
      daysPastExpiry,
    };
  }

  // Case 4: More than 180 days past expiry -> Cutoff exceeded
  return {
    canDraft: false,
    canSubmit: false,
    reason: `Late renewal window expired (180 days past expiry). Full re-registration is required.`,
    windowStatus: "cutoff_exceeded",
    daysPastExpiry,
  };
};

/**
 * Budget eligibility predicate (Final Locked Policy 3):
 * When accreditation expires, new Budget Requests are blocked.
 */
export const canCreateBudgetRequest = (accreditationStatus: AccreditationStatus): boolean => {
  return accreditationStatus === "active" || accreditationStatus === "expiring_soon";
};

/**
 * Budget disbursement predicate (Final Locked Policy 3):
 * Pending budget releases are paused when accreditation is expired, but resume after renewal.
 */
export const canDisburseBudget = (accreditationStatus: AccreditationStatus): boolean => {
  return accreditationStatus === "active" || accreditationStatus === "expiring_soon";
};

/**
 * Liquidation report predicate (Final Locked Policy 3):
 * Approved/released funds remain permanently valid for liquidation across all statuses.
 */
export const canLiquidateFunds = (_accreditationStatus: AccreditationStatus): boolean => {
  return true;
};

/**
 * YPOP participation predicate (Final Locked Policy 4):
 * When accreditation expires, new YPOP participation is paused and points cannot be earned.
 */
export const canParticipateInYpop = (accreditationStatus: AccreditationStatus): boolean => {
  return accreditationStatus === "active" || accreditationStatus === "expiring_soon";
};

/**
 * Resolves authoritative renewal countdown.
 * Prioritizes the authoritative projection (profile.accreditationExpiresAt)
 * while maintaining 100% backwards compatibility with profile.verifiedAt.
 */
export const getOrganizationRenewalCountdown = (
  profile?: OrganizationProfile | null,
  now = new Date(),
): OrganizationRenewalCountdown | null => {
  let expiresAt: Date | null = null;

  // 1. Authoritative Projection Source (Phase 1 Ledger Projection)
  if (profile?.accreditationExpiresAt) {
    const parsed = new Date(profile.accreditationExpiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      expiresAt = parsed;
    }
  }

  // 2. Legacy Fallback (verifiedAt + 3 years)
  if (!expiresAt) {
    if (!profile?.verifiedAt) return null;

    const verifiedAt = new Date(profile.verifiedAt);
    if (Number.isNaN(verifiedAt.getTime())) return null;

    expiresAt = new Date(verifiedAt);
    expiresAt.setUTCFullYear(
      expiresAt.getUTCFullYear() + ORGANIZATION_REGISTRATION_VALIDITY_YEARS,
    );
  }

  const millisecondsRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(millisecondsRemaining / 86_400_000),
  );

  return {
    expiresAt: expiresAt.toISOString(),
    daysRemaining,
    isDue: millisecondsRemaining <= 0,
  };
};

export type UserFacingRenewalStateKey =
  | "active_renewal_unavailable"
  | "expiring_soon_renewal_available"
  | "expired_within_renewal_window"
  | "expired_beyond_renewal_window"
  | "renewal_draft"
  | "renewal_submitted"
  | "renewal_under_review"
  | "renewal_needs_revision"
  | "renewal_resubmitted"
  | "renewal_rejected"
  | "renewal_approved";

export type UserFacingRenewalState = {
  key: UserFacingRenewalStateKey;
  accreditationStatus: AccreditationStatus;
  renewalStatus: RenewalApplicationStatus | null;
  canStartRenewal: boolean;
  canContinueRenewal: boolean;
  canResubmitRenewal: boolean;
  renewalBlockedReason: string | null;
  daysRemaining: number;
  daysSinceExpiry: number;
  expiresAt: string | null;
  isExpired: boolean;
  statusLabel: string;
  actionLabel: string | null;
  adminRemarks: string | null;
  cycleNumber: number | null;
  activeRenewal: OrganizationRenewalRecord | null;
  lateCutoffDate: string | null;
};

/**
 * Canonical user-facing renewal state resolver.
 * Consumes authoritative Phase 1 accreditation projections and active renewal applications.
 *
 * Deterministically resolves:
 * - 1. ACTIVE — renewal unavailable (> 90 days before expiry)
 * - 2. EXPIRING SOON — renewal available (<= 90 days before expiry)
 * - 3. EXPIRED WITHIN RENEWAL WINDOW — renewal available, but privileges blocked (<= 180 days after expiry)
 * - 4. EXPIRED BEYOND RENEWAL WINDOW — renewal blocked, fresh registration required (> 180 days after expiry)
 * - 5. RENEWAL DRAFT — continue existing application
 * - 6. RENEWAL SUBMITTED — read-only pending review
 * - 7. RENEWAL UNDER REVIEW — read-only pending review
 * - 8. RENEWAL NEEDS REVISION — correction action available
 * - 9. RENEWAL RESUBMITTED — read-only pending review
 * - 10. RENEWAL REJECTED — terminal; contact LYDO
 * - 11. RENEWAL APPROVED — new term active
 */
export const resolveUserRenewalState = ({
  profile,
  renewals = [],
  now = new Date(),
  hasError = false,
}: {
  profile?: OrganizationProfile | null;
  renewals?: OrganizationRenewalRecord[];
  now?: Date;
  hasError?: boolean;
}): UserFacingRenewalState => {
  // If an error occurred loading renewals, fail safely without making false eligibility claims
  if (hasError) {
    return {
      key: "active_renewal_unavailable",
      accreditationStatus: "active",
      renewalStatus: null,
      canStartRenewal: false,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: "Unable to verify renewal status at this time. Please try again later.",
      daysRemaining: 0,
      daysSinceExpiry: 0,
      expiresAt: null,
      isExpired: false,
      statusLabel: "Status Verification Unavailable",
      actionLabel: null,
      adminRemarks: null,
      cycleNumber: null,
      activeRenewal: null,
      lateCutoffDate: null,
    };
  }

  const isVerified = profile?.profileStatus === "verified";
  const countdown = getOrganizationRenewalCountdown(profile, now);
  const expiresAt = countdown?.expiresAt ?? null;

  if (!isVerified || !expiresAt) {
    return {
      key: "active_renewal_unavailable",
      accreditationStatus: "active",
      renewalStatus: null,
      canStartRenewal: false,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: isVerified
        ? "No authoritative accreditation expiration date found."
        : "Organization is not verified yet.",
      daysRemaining: 0,
      daysSinceExpiry: 0,
      expiresAt: null,
      isExpired: false,
      statusLabel: isVerified ? "Accreditation Active" : "Pending Verification",
      actionLabel: null,
      adminRemarks: null,
      cycleNumber: null,
      activeRenewal: null,
      lateCutoffDate: null,
    };
  }

  const expiryDate = new Date(expiresAt);
  const nowDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const expiryDateOnly = new Date(Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth(), expiryDate.getUTCDate()));
  const diffMs = expiryDateOnly.getTime() - nowDateOnly.getTime();
  const daysDiff = Math.round(diffMs / 86_400_000);
  const isExpired = daysDiff < 0;
  const daysRemaining = Math.max(0, daysDiff);
  const daysSinceExpiry = isExpired ? Math.abs(daysDiff) : 0;

  // Calculate late cutoff date (exactly 180 calendar days after expiry)
  const cutoffDateObj = new Date(expiryDateOnly);
  cutoffDateObj.setUTCDate(cutoffDateObj.getUTCDate() + RENEWAL_LATE_WINDOW_DAYS);
  const lateCutoffDate = cutoffDateObj.toISOString().split("T")[0];

  // Derive pure accreditation status (LOCKED: No grace period)
  const accreditationStatus: AccreditationStatus = deriveAccreditationStatus({
    persistedStatus: "active",
    endDate: expiryDateOnly,
    now,
  });

  // Evaluate renewal records
  const sortedRenewals = [...renewals].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const latestRenewal = sortedRenewals[0] ?? null;
  const activeRenewal = renewals.find((r) =>
    ["draft", "submitted", "under_review", "needs_revision", "resubmitted"].includes(r.status),
  ) ?? null;

  // Case 1: Latest renewal for the cycle is rejected (terminal: no restart, continue, or resubmit)
  if (latestRenewal?.status === "rejected" && !activeRenewal) {
    return {
      key: "renewal_rejected",
      accreditationStatus,
      renewalStatus: "rejected",
      canStartRenewal: false,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: "Renewal application was not approved. The organization must contact the LYDO office directly for guidance.",
      daysRemaining,
      daysSinceExpiry,
      expiresAt,
      isExpired,
      statusLabel: "Renewal Application Not Approved",
      actionLabel: null,
      adminRemarks: latestRenewal.adminRemarks ?? null,
      cycleNumber: latestRenewal.cycleNumber,
      activeRenewal: latestRenewal,
      lateCutoffDate,
    };
  }

  // Case 2: Active non-terminal renewal exists
  if (activeRenewal) {
    const cycleNumber = activeRenewal.cycleNumber;
    switch (activeRenewal.status) {
      case "draft":
        return {
          key: "renewal_draft",
          accreditationStatus,
          renewalStatus: "draft",
          canStartRenewal: false,
          canContinueRenewal: true,
          canResubmitRenewal: false,
          renewalBlockedReason: null,
          daysRemaining,
          daysSinceExpiry,
          expiresAt,
          isExpired,
          statusLabel: "Renewal Draft in Progress",
          actionLabel: "Continue Renewal",
          adminRemarks: null,
          cycleNumber,
          activeRenewal,
          lateCutoffDate,
        };
      case "needs_revision":
        return {
          key: "renewal_needs_revision",
          accreditationStatus,
          renewalStatus: "needs_revision",
          canStartRenewal: false,
          canContinueRenewal: false,
          canResubmitRenewal: true,
          renewalBlockedReason: null,
          daysRemaining,
          daysSinceExpiry,
          expiresAt,
          isExpired,
          statusLabel: "Renewal Action Required",
          actionLabel: "Review Remarks",
          adminRemarks: activeRenewal.adminRemarks ?? null,
          cycleNumber,
          activeRenewal,
          lateCutoffDate,
        };
      case "submitted":
        return {
          key: "renewal_submitted",
          accreditationStatus,
          renewalStatus: "submitted",
          canStartRenewal: false,
          canContinueRenewal: false,
          canResubmitRenewal: false,
          renewalBlockedReason: "Renewal application has been submitted and is pending administrator review.",
          daysRemaining,
          daysSinceExpiry,
          expiresAt,
          isExpired,
          statusLabel: "Renewal Submitted (Pending Review)",
          actionLabel: null,
          adminRemarks: null,
          cycleNumber,
          activeRenewal,
          lateCutoffDate,
        };
      case "under_review":
        return {
          key: "renewal_under_review",
          accreditationStatus,
          renewalStatus: "under_review",
          canStartRenewal: false,
          canContinueRenewal: false,
          canResubmitRenewal: false,
          renewalBlockedReason: "Renewal application is actively under administrator review.",
          daysRemaining,
          daysSinceExpiry,
          expiresAt,
          isExpired,
          statusLabel: "Renewal Under Review",
          actionLabel: null,
          adminRemarks: null,
          cycleNumber,
          activeRenewal,
          lateCutoffDate,
        };
      case "resubmitted":
        return {
          key: "renewal_resubmitted",
          accreditationStatus,
          renewalStatus: "resubmitted",
          canStartRenewal: false,
          canContinueRenewal: false,
          canResubmitRenewal: false,
          renewalBlockedReason: "Corrected renewal documents have been resubmitted and are pending review.",
          daysRemaining,
          daysSinceExpiry,
          expiresAt,
          isExpired,
          statusLabel: "Renewal Resubmitted (Pending Review)",
          actionLabel: null,
          adminRemarks: null,
          cycleNumber,
          activeRenewal,
          lateCutoffDate,
        };
    }
  }

  // Case 3: No active renewal application exists -> evaluate time-driven window
  const windowEligibility = getRenewalWindowEligibility(expiresAt, now);

  if (windowEligibility.windowStatus === "open") {
    // 90 days before expiry down to expiry day
    return {
      key: "expiring_soon_renewal_available",
      accreditationStatus: "expiring_soon",
      renewalStatus: null,
      canStartRenewal: true,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: null,
      daysRemaining,
      daysSinceExpiry: 0,
      expiresAt,
      isExpired: false,
      statusLabel: "Renewal Window Open",
      actionLabel: "Start Renewal",
      adminRemarks: null,
      cycleNumber: null,
      activeRenewal: null,
      lateCutoffDate,
    };
  }

  if (windowEligibility.windowStatus === "late_open") {
    // Expired, but within 180 days after expiry
    return {
      key: "expired_within_renewal_window",
      accreditationStatus: "expired",
      renewalStatus: null,
      canStartRenewal: true,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: null,
      daysRemaining: 0,
      daysSinceExpiry,
      expiresAt,
      isExpired: true,
      statusLabel: "Accreditation Expired (Renewal Available)",
      actionLabel: "Start Renewal",
      adminRemarks: null,
      cycleNumber: null,
      activeRenewal: null,
      lateCutoffDate,
    };
  }

  if (windowEligibility.windowStatus === "cutoff_exceeded") {
    // Beyond 180 days past expiry -> Cutoff exceeded
    return {
      key: "expired_beyond_renewal_window",
      accreditationStatus: "expired",
      renewalStatus: null,
      canStartRenewal: false,
      canContinueRenewal: false,
      canResubmitRenewal: false,
      renewalBlockedReason: "The 180-day late renewal window has elapsed. Full re-registration is required.",
      daysRemaining: 0,
      daysSinceExpiry,
      expiresAt,
      isExpired: true,
      statusLabel: "Accreditation Expired (Registration Required)",
      actionLabel: null,
      adminRemarks: null,
      cycleNumber: null,
      activeRenewal: null,
      lateCutoffDate,
    };
  }

  // Window status is too_early (> 90 days before expiry)
  return {
    key: "active_renewal_unavailable",
    accreditationStatus: "active",
    renewalStatus: null,
    canStartRenewal: false,
    canContinueRenewal: false,
    canResubmitRenewal: false,
    renewalBlockedReason: `Renewal window opens 90 days before expiry (in ${windowEligibility.daysUntilOpen ?? 0} days).`,
    daysRemaining,
    daysSinceExpiry: 0,
    expiresAt,
    isExpired: false,
    statusLabel: "Accreditation Active",
    actionLabel: null,
    adminRemarks: null,
    cycleNumber: null,
    activeRenewal: null,
    lateCutoffDate,
  };
};

import type {
  OrganizationProfile,
  YPOPCityActivity,
  YPOPEntry,
  YPOPEventFile,
  YPOPEventParticipation,
  YPOPFile,
  YPOPOrgActivityFile,
  YPOPPeriod,
} from "./lydo-connect-data";

export const YPOP_TIME_ZONE = "Asia/Manila";

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

export const parseYpopActivityDate = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  if (ISO_DATE_ONLY.test(normalized)) return new Date(`${normalized}T00:00:00.000+08:00`);
  if (ISO_LOCAL_DATE_TIME.test(normalized)) return new Date(`${normalized}+08:00`);
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getYpopEventEndAt = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  if (ISO_DATE_ONLY.test(normalized)) return new Date(`${normalized}T23:59:59.999+08:00`);
  return parseYpopActivityDate(normalized);
};

export const isPastYpopActivityDate = (value: string, now = new Date()) => {
  const endAt = getYpopEventEndAt(value);
  return endAt ? now.getTime() >= endAt.getTime() : false;
};

export const isYpopPeriodOpen = (period: YPOPPeriod | null | undefined, now = new Date()) => {
  if (!period || period.status !== "open") return false;
  if (!period.validationDeadline) return true;
  const deadline = new Date(period.validationDeadline);
  return Number.isNaN(deadline.getTime()) || now.getTime() <= deadline.getTime();
};

export const isYpopEntryEditable = (entry: YPOPEntry | null | undefined) =>
  !entry || entry.status === "draft" || entry.status === "needs_revision" || entry.status === "submitted" || entry.status === "under_review";

export type YpopJoinEligibility = {
  allowed: boolean;
  reason: "eligible" | "already_joined" | "event_ended" | "period_closed" | "submission_locked" | "profile_unverified";
  label: string;
};

export const getYpopEventJoinEligibility = (params: {
  activity: YPOPCityActivity;
  period?: YPOPPeriod | null;
  entry?: YPOPEntry | null;
  participation?: YPOPEventParticipation | null;
  profile?: OrganizationProfile | null;
  now?: Date;
}): YpopJoinEligibility => {
  const now = params.now ?? new Date();
  if (params.participation) return { allowed: false, reason: "already_joined", label: "Proof Uploaded" };
  // Event date does NOT block proof submission as long as the YPOP semester remains OPEN.
  if (!isYpopPeriodOpen(params.period, now)) return { allowed: false, reason: "period_closed", label: "Semester Closed" };
  if (params.profile && params.profile.profileStatus !== "verified") {
    return { allowed: false, reason: "profile_unverified", label: "Verification Required" };
  }
  return { allowed: true, reason: "eligible", label: "Submit Proof" };
};

export type YpopSubmissionEligibility = {
  eligible: boolean;
  reason?: "no_city_led_activities" | "missing_supporting_documents" | "entry_not_editable" | "profile_unverified";
  message: string;
};

/**
 * Validates whether an organization is eligible to participate in the YPOP semester workflow.
 * In the continuous submission lifecycle, organizations continuously accumulate submissions
 * while the semester is open without being blocked by optional or unproved activities.
 */
export const validateYpopSubmissionEligibility = (params: {
  entry?: YPOPEntry | null | undefined;
  participations?: YPOPEventParticipation[];
  eventFiles?: YPOPEventFile[];
  entryFiles?: YPOPFile[];
  orgActivityFiles?: YPOPOrgActivityFile[];
  profile?: OrganizationProfile | null;
}): YpopSubmissionEligibility => {
  const { profile } = params;

  if (profile && profile.profileStatus !== "verified") {
    return {
      eligible: false,
      reason: "profile_unverified",
      message: "Your organization profile must be verified to participate in YPOP validation.",
    };
  }

  return {
    eligible: true,
    message: "Ready for continuous submission.",
  };
};

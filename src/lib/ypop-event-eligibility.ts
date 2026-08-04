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
  !entry || entry.status === "draft" || entry.status === "needs_revision";

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
  if (params.participation) return { allowed: false, reason: "already_joined", label: "Joined" };
  if (isPastYpopActivityDate(params.activity.date, now)) return { allowed: false, reason: "event_ended", label: "Event Ended" };
  if (!isYpopPeriodOpen(params.period, now)) return { allowed: false, reason: "period_closed", label: "Joining Closed" };
  if (!isYpopEntryEditable(params.entry)) return { allowed: false, reason: "submission_locked", label: "Submission Locked" };
  if (params.profile?.profileStatus !== "verified") return { allowed: false, reason: "profile_unverified", label: "Verification Required" };
  return { allowed: true, reason: "eligible", label: "Join Event" };
};

export type YpopSubmissionEligibility = {
  eligible: boolean;
  reason?: "no_city_led_activities" | "missing_supporting_documents" | "entry_not_editable" | "profile_unverified";
  message: string;
};

export const validateYpopSubmissionEligibility = (params: {
  entry: YPOPEntry | null | undefined;
  participations: YPOPEventParticipation[];
  eventFiles?: YPOPEventFile[];
  entryFiles?: YPOPFile[];
  orgActivityFiles?: YPOPOrgActivityFile[];
  profile?: OrganizationProfile | null;
}): YpopSubmissionEligibility => {
  const { entry, participations, eventFiles = [], entryFiles = [], orgActivityFiles = [], profile } = params;

  if (!entry) {
    return {
      eligible: false,
      reason: "entry_not_editable",
      message: "No active YPOP semester entry found.",
    };
  }

  if (!isYpopEntryEditable(entry)) {
    return {
      eligible: false,
      reason: "entry_not_editable",
      message: "This YPOP submission is currently locked or under administrative review.",
    };
  }

  if (profile && profile.profileStatus !== "verified") {
    return {
      eligible: false,
      reason: "profile_unverified",
      message: "Your organization profile must be verified before submitting a YPOP validation request.",
    };
  }

  const hasCityLedActivity =
    participations.length > 0 || (entry.cityLedAttendance && entry.cityLedAttendance.length > 0);

  if (!hasCityLedActivity) {
    return {
      eligible: false,
      reason: "no_city_led_activities",
      message: "You must log at least one City-Led Activity before submitting a YPOP validation request.",
    };
  }

  const participationsWithFiles = new Set(eventFiles.map((file) => file.participationId));

  const unprovedParticipations = participations.filter((p) => {
    const hasProofTimestamp = Boolean(p.proofSubmittedAt && p.proofSubmittedAt.trim());
    const hasAttachedFile = participationsWithFiles.has(p.id);
    return !hasProofTimestamp && !hasAttachedFile;
  });

  const totalAttachedFilesCount = eventFiles.length + entryFiles.length + orgActivityFiles.length;

  if (unprovedParticipations.length > 0 || totalAttachedFilesCount === 0) {
    return {
      eligible: false,
      reason: "missing_supporting_documents",
      message: "You must attach all required supporting proof documents for your logged City-Led Activities before submitting for validation.",
    };
  }

  return {
    eligible: true,
    message: "Ready for validation submission.",
  };
};

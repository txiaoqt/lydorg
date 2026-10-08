import { seedState, type OrganizationProfile, type SubmissionFile, type YPOPPeriod, type YPOPEntry } from "./lydo-connect-data";
import type { YorpRegistryEntry } from "../admin/components/YorpRegistryTable";

export const reportEntry: YorpRegistryEntry = {
  org: { ...seedState.organizationProfiles[0], id: "org-report", organizationName: "Pasig Youth Council", urn: "01-26-103",
    organizationEmail: "primary@example.org", additionalEmails: ["second@example.org", "third@example.org"],
    contactNumber: "09123456789", additionalContactNumbers: ["09987654321"],
    representativeFirstName: "Maria", representativeLastName: "Santos", representativeName: "Legacy head",
    adviserFirstName: "Juan", adviserLastName: "Cruz", adviserName: "Legacy adviser",
    district: "District I", barangay: "Palatiw", address: "12 Youth Street, Pasig",
    majorClassification: "Youth Organization", subClassification: "community-based", advocacies: ["education"],
    facebookPageUrl: "https://facebook.com/pasigyouth",
  } as OrganizationProfile,
  registrationDate: new Date("2026-01-06T00:00:00Z"), expiryDate: new Date("2029-01-06T00:00:00Z"), yorpStatus: "active",
};
export const reportPeriod = { id: "period", semesterKey: "2026-s1", semesterLabel: "1st Semester 2026", status: "open", createdAt: "2026-01-01" } as YPOPPeriod;
export const reportYpopEntry = { id: "ypop-report", organizationId: "org-report", semester: "2026-s1", pointsRequired: 70, status: "qualified" } as YPOPEntry;
export const reportDetail = {
  ypopCityActivities: [{ id: "city", semesterKey: "2026-s1", name: "Youth Summit", date: "2026-02-10", category: "mandatory", points: 20 },
    { id: "old", semesterKey: "2025-s2", name: "Old Activity", date: "2025-09-01", category: "mandatory", points: 20 }],
  ypopEventParticipations: [{ id: "joined", activityId: "city", organizationId: "org-report", activityName: "Youth Summit", status: "verified", createdAt: "2026-02-11" },
    { id: "another", activityId: "city", organizationId: "other-org", activityName: "Private Other Org", status: "verified", createdAt: "2026-02-11" }],
  ypopOrgActivities: [{ id: "project", ypopEntryId: "ypop-report", activityName: "Community Garden", activityDate: "2026-03-10", status: "approved", createdAt: "2026-03-11" },
    { id: "pending", ypopEntryId: "ypop-report", activityName: "Unapproved", activityDate: "2026-03-10", status: "pending", createdAt: "2026-03-11" }],
} as typeof seedState;
export const reportFiles = [{ id: "file", submissionId: "submission", documentTypeId: "constitution", documentTypeName: "Constitution and By-Laws",
  fileName: "Constitution.pdf", fileUrl: "storage://private/constitution.pdf", fileSize: 81920, adminStatus: "needs_revision", uploadedAt: "2026-01-07", createdAt: "2026-01-07" },
  { id: "draft", fileName: "Draft.pdf", fileUrl: "storage://private/draft.pdf", adminStatus: "draft" },
] as SubmissionFile[];

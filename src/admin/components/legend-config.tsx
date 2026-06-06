import React from "react";
import { StatusBadge } from "./StatusBadge";
import { getDocumentTypeBadgeClasses } from "./DocumentTypeBadge";
import type { LegendItem } from "./LegendModal";

const makeDocBadge = (label: string, key: string) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getDocumentTypeBadgeClasses(key)}`}>
    {label}
  </span>
);

export const programStatusLegendItems: LegendItem[] = [
  { key: "published", label: "Published", description: "Visible and available in the portal.", badge: <StatusBadge status="published" /> },
  { key: "draft", label: "Draft", description: "Saved but not publicly published.", badge: <StatusBadge status="draft" /> },
  { key: "upcoming", label: "Upcoming", description: "Scheduled for a future date.", badge: <StatusBadge status="upcoming" /> },
  { key: "ongoing", label: "Ongoing", description: "Currently active.", badge: <StatusBadge status="ongoing" /> },
  { key: "completed", label: "Completed", description: "Already finished.", badge: <StatusBadge status="completed" /> },
  { key: "cancelled", label: "Cancelled", description: "No longer proceeding.", badge: <StatusBadge status="cancelled" /> },
  { key: "pending", label: "Pending", description: "Waiting for review or update.", badge: <StatusBadge status="pending" /> },
  { key: "archived", label: "Archived", description: "Kept for records but no longer active.", badge: <StatusBadge status="archived" /> },
];

export const baseEventStatusLegendItems: LegendItem[] = [
  { key: "upcoming", label: "Upcoming", description: "Scheduled for a future date.", badge: <StatusBadge status="upcoming" /> },
  { key: "ongoing", label: "Ongoing", description: "Currently happening or active.", badge: <StatusBadge status="ongoing" /> },
  { key: "past", label: "Past", description: "Event date has already passed.", badge: <StatusBadge status="past" /> },
  { key: "completed", label: "Completed", description: "Officially finished.", badge: <StatusBadge status="completed" /> },
  { key: "cancelled", label: "Cancelled", description: "Event was cancelled.", badge: <StatusBadge status="cancelled" /> },
  { key: "pending", label: "Pending", description: "Waiting for review or confirmation.", badge: <StatusBadge status="pending" /> },
];

export const optionalEventStatusLegendItems: LegendItem[] = [
  { key: "published", label: "Published", description: "Visible and available in the portal.", badge: <StatusBadge status="published" /> },
  { key: "archived", label: "Archived", description: "Kept for records but no longer active.", badge: <StatusBadge status="archived" /> },
];

export const organizationStatusLegendItems: LegendItem[] = [
  { key: "active", label: "Active", description: "Currently active organization.", badge: <StatusBadge status="active" /> },
  { key: "partner", label: "Partner", description: "Recognized partner organization.", badge: <StatusBadge status="partner" /> },
  { key: "pending", label: "Pending", description: "Waiting for review or activation.", badge: <StatusBadge status="pending" /> },
  { key: "inactive", label: "Inactive", description: "Currently inactive record.", badge: <StatusBadge status="inactive" /> },
  { key: "archived", label: "Archived", description: "Kept for records, no longer active.", badge: <StatusBadge status="archived" /> },
];

export const organizationTypeLegendSeed = [
  {
    key: "civic",
    label: "Civic Volunteer Group",
    description: "Community service and volunteer-focused organizations.",
  },
  {
    key: "advocacy",
    label: "Advocacy Network",
    description: "Organizations focused on advocacy and campaigns.",
  },
  {
    key: "multi",
    label: "Multi-organization Network",
    description: "Federated or coalition organizations.",
  },
  {
    key: "interest",
    label: "Youth Interest Group",
    description: "Interest-based youth organization groupings.",
  },
  {
    key: "governance",
    label: "Youth Governance",
    description: "Youth governance and leadership-oriented groups.",
  },
  {
    key: "campus",
    label: "Campus Youth Partner",
    description: "Campus-based partner organizations.",
  },
  {
    key: "other",
    label: "Other / Custom Type",
    description: "Types outside the standard organization groups.",
  },
] as const;

export const documentTypeLegendItems: LegendItem[] = [
  {
    key: "program_outcome",
    label: "Program Outcome",
    description: "Reports or outputs related to completed initiatives.",
    badge: makeDocBadge("Program Outcome", "program_outcome"),
  },
  {
    key: "ordinance",
    label: "Ordinance",
    description: "Official ordinances and policy-related documents.",
    badge: makeDocBadge("Ordinance", "ordinance"),
  },
  {
    key: "financial_statement",
    label: "Financial Statement",
    description: "Budget, spending, and financial transparency documents.",
    badge: makeDocBadge("Financial Statement", "financial_statement"),
  },
  {
    key: "resolution",
    label: "Resolution",
    description: "Official resolutions and council decisions.",
    badge: makeDocBadge("Resolution", "resolution"),
  },
  {
    key: "bac_document",
    label: "BAC Document",
    description: "Procurement, bidding, and BAC-related files.",
    badge: makeDocBadge("BAC Document", "bac_document"),
  },
  {
    key: "other",
    label: "Other / Custom Type",
    description: "Documents that do not match the standard categories.",
    badge: makeDocBadge("Other / Custom Type", "other"),
  },
];

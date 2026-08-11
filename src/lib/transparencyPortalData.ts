export type DisclosureDocument = {
  id: string;
  title: string;
  documentType: string;
  fiscalYear: number;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  barangay: string;
  office: string;
  publishedDate: string;
  size: string;
  pdfUrl: string;
};

export const disclosureRegistry: DisclosureDocument[] = [
  {
    id: "doc-001",
    title: "SK Budget Utilization and Disbursement Summary",
    documentType: "Financial Statement",
    fiscalYear: 2026,
    quarter: "Q1",
    barangay: "Malanday",
    office: "LYDO",
    publishedDate: "2026-03-01",
    size: "1.5 MB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
  {
    id: "doc-002",
    title: "Hirayang Kabataan Program Outcome Report",
    documentType: "Program Outcome",
    fiscalYear: 2026,
    quarter: "Q1",
    barangay: "All Barangays",
    office: "LYDO",
    publishedDate: "2026-03-03",
    size: "2.1 MB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
  {
    id: "doc-003",
    title: "Quarterly Procurement Posting",
    documentType: "BAC Document",
    fiscalYear: 2026,
    quarter: "Q1",
    barangay: "All Barangays",
    office: "Municipal BAC",
    publishedDate: "2026-02-22",
    size: "540 KB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
  {
    id: "doc-004",
    title: "Executive Order on Youth Program Monitoring",
    documentType: "Executive Order",
    fiscalYear: 2025,
    quarter: "Q4",
    barangay: "All Barangays",
    office: "Office of the Mayor",
    publishedDate: "2025-11-10",
    size: "490 KB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
  {
    id: "doc-005",
    title: "Resolution Adopting Quarterly LYDC Monitoring Matrix",
    documentType: "Resolution",
    fiscalYear: 2025,
    quarter: "Q4",
    barangay: "All Barangays",
    office: "LYDC",
    publishedDate: "2025-12-02",
    size: "810 KB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
  {
    id: "doc-006",
    title: "Barangay Youth Activity Appropriations Ordinance",
    documentType: "Ordinance",
    fiscalYear: 2025,
    quarter: "Q3",
    barangay: "Santa Ana",
    office: "Sangguniang Bayan",
    publishedDate: "2025-09-20",
    size: "940 KB",
    pdfUrl: "/disclosure-registry-test.pdf",
  },
];

export const transparencyKpis = {
  reportsReceived: 2074,
  reportsResolved: 1213,
  avgResponseHours: 18,
  pendingTickets: 861,
  disclosuresPublished: disclosureRegistry.length,
};

export const serviceAdvisories = [
  {
    id: "adv-001",
    title: "Scheduled Maintenance Window",
    status: "Maintenance",
    updatedAt: "2026-03-06 20:00",
    message: "Transparency uploads and issue tracking may be temporarily unavailable for 30 minutes.",
  },
  {
    id: "adv-002",
    title: "Daily Data Sync Complete",
    status: "Operational",
    updatedAt: "2026-03-07 08:10",
    message: "Event registrations and disclosure registry data are fully synchronized.",
  },
  {
    id: "adv-003",
    title: "Facebook-to-Portal Sync Reminder",
    status: "Notice",
    updatedAt: "2026-03-07 09:15",
    message: "Please link source Facebook post URLs for newly encoded initiatives.",
  },
];

export const ticketTypes = ["Information Request", "Complaint / Grievance", "Suggestion", "Service Request"] as const;

export type TicketType = (typeof ticketTypes)[number];

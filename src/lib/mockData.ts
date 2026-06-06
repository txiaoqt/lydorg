export const barangays = [
  "Ampid I",
  "Ampid II",
  "Banaba",
  "Dulong Bayan I",
  "Dulong Bayan II",
  "Guinayang",
  "Guitnang Bayan I",
  "Guitnang Bayan II",
  "Gulod Malaya",
  "Malanday",
  "Maly",
  "Pintong Bocaue",
  "San Jose",
  "San Rafael",
  "Santa Ana",
  "Santo Nino",
];

export const barangayData: Record<
  string,
  {
    youthPopulation: number;
    skBudget: number;
    utilizedBudget: number;
    activities: number;
    participants: number;
    organizations: number;
    complianceStatus: "compliant" | "pending" | "overdue";
    compliancePercent: number;
    skChairperson: string;
  }
> = {
  "Ampid I": { youthPopulation: 2340, skBudget: 500000, utilizedBudget: 385000, activities: 12, participants: 890, organizations: 4, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Maria Santos" },
  "Ampid II": { youthPopulation: 1890, skBudget: 450000, utilizedBudget: 320000, activities: 8, participants: 560, organizations: 3, complianceStatus: "compliant", compliancePercent: 92, skChairperson: "Juan Dela Cruz" },
  Banaba: { youthPopulation: 3100, skBudget: 600000, utilizedBudget: 410000, activities: 15, participants: 1200, organizations: 6, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Ana Reyes" },
  "Dulong Bayan I": { youthPopulation: 1560, skBudget: 380000, utilizedBudget: 290000, activities: 6, participants: 420, organizations: 2, complianceStatus: "pending", compliancePercent: 75, skChairperson: "Pedro Garcia" },
  "Dulong Bayan II": { youthPopulation: 1420, skBudget: 350000, utilizedBudget: 180000, activities: 5, participants: 310, organizations: 2, complianceStatus: "overdue", compliancePercent: 50, skChairperson: "Rosa Mendoza" },
  Guinayang: { youthPopulation: 2780, skBudget: 520000, utilizedBudget: 460000, activities: 14, participants: 980, organizations: 5, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Carlos Bautista" },
  "Guitnang Bayan I": { youthPopulation: 2100, skBudget: 480000, utilizedBudget: 350000, activities: 10, participants: 720, organizations: 4, complianceStatus: "compliant", compliancePercent: 88, skChairperson: "Luz Villanueva" },
  "Guitnang Bayan II": { youthPopulation: 1950, skBudget: 460000, utilizedBudget: 390000, activities: 9, participants: 650, organizations: 3, complianceStatus: "pending", compliancePercent: 67, skChairperson: "Miguel Torres" },
  "Gulod Malaya": { youthPopulation: 2450, skBudget: 510000, utilizedBudget: 420000, activities: 11, participants: 830, organizations: 4, complianceStatus: "compliant", compliancePercent: 95, skChairperson: "Elena Cruz" },
  Malanday: { youthPopulation: 3500, skBudget: 650000, utilizedBudget: 520000, activities: 18, participants: 1500, organizations: 7, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Roberto Aquino" },
  Maly: { youthPopulation: 1680, skBudget: 400000, utilizedBudget: 280000, activities: 7, participants: 480, organizations: 3, complianceStatus: "pending", compliancePercent: 58, skChairperson: "Diana Ramos" },
  "Pintong Bocaue": { youthPopulation: 1350, skBudget: 320000, utilizedBudget: 210000, activities: 4, participants: 280, organizations: 2, complianceStatus: "overdue", compliancePercent: 33, skChairperson: "Fernando Lopez" },
  "San Jose": { youthPopulation: 2200, skBudget: 490000, utilizedBudget: 380000, activities: 13, participants: 760, organizations: 5, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Grace Tan" },
  "San Rafael": { youthPopulation: 1890, skBudget: 440000, utilizedBudget: 310000, activities: 9, participants: 590, organizations: 3, complianceStatus: "compliant", compliancePercent: 83, skChairperson: "Mark Rivera" },
  "Santa Ana": { youthPopulation: 2650, skBudget: 550000, utilizedBudget: 470000, activities: 16, participants: 1100, organizations: 5, complianceStatus: "compliant", compliancePercent: 100, skChairperson: "Linda Pascual" },
  "Santo Nino": { youthPopulation: 1780, skBudget: 420000, utilizedBudget: 340000, activities: 8, participants: 520, organizations: 3, complianceStatus: "compliant", compliancePercent: 92, skChairperson: "Antonio Diaz" },
};

export const transparencyReports = [
  { id: 1, title: "Q4 2025 Financial Report", category: "Financial", date: "2026-01-15", size: "2.4 MB", downloads: 145 },
  { id: 2, title: "Annual SK Accomplishment Report 2025", category: "Accomplishment", date: "2026-01-10", size: "5.1 MB", downloads: 230 },
  { id: 3, title: "LYDO Full Disclosure - December 2025", category: "Full Disclosure", date: "2025-12-31", size: "3.8 MB", downloads: 189 },
  { id: 4, title: "Youth Development Fund Utilization Q3", category: "Financial", date: "2025-10-05", size: "1.9 MB", downloads: 98 },
  { id: 5, title: "SK Federation Annual Plan 2026", category: "Planning", date: "2026-02-01", size: "4.2 MB", downloads: 312 },
  { id: 6, title: "Barangay Youth Investment Program Report", category: "Accomplishment", date: "2025-11-20", size: "2.7 MB", downloads: 167 },
  { id: 7, title: "Q1 2026 Budget Allocation Summary", category: "Financial", date: "2026-03-01", size: "1.5 MB", downloads: 78 },
  { id: 8, title: "LYDO Transparency Seal 2026", category: "Full Disclosure", date: "2026-01-01", size: "890 KB", downloads: 456 },
];

export const complianceDocuments = [
  "Monthly Financial Report",
  "SK Resolution",
  "Activity Accomplishment Report",
  "Budget Utilization Report",
  "Youth Census Update",
  "Annual Investment Plan",
];

export const feedbackCategories = [
  "LYDO Services",
  "SK Performance",
  "Youth Activities",
  "Financial Transparency",
  "Community Concerns",
  "Suggestions",
];

export const monthlyBudgetData = [
  { month: "Jan", allocated: 850000, utilized: 620000 },
  { month: "Feb", allocated: 920000, utilized: 780000 },
  { month: "Mar", allocated: 1100000, utilized: 890000 },
  { month: "Apr", allocated: 780000, utilized: 650000 },
  { month: "May", allocated: 960000, utilized: 820000 },
  { month: "Jun", allocated: 1050000, utilized: 940000 },
];

export const complianceOverview = {
  total: 16,
  compliant: 10,
  pending: 3,
  overdue: 2,
  partial: 1,
};

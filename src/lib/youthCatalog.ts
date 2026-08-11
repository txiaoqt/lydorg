export type YouthOrganization = {
  id: string;
  name: string;
  type: string;
  focus: string;
  sourceTag: string;
  status: "active" | "partner" | "pending" | "inactive";
  sourcePostUrl?: string;
  category?: string | null;
  overview?: string | null;
  mission?: string | null;
  objectives?: string | null;
  programs?: string | null;
  activities?: string | null;
  location?: string | null;
  coverageArea?: string | null;
  targetBeneficiaries?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactPerson?: string | null;
  relatedInitiatives?: string | null;
  activityYear?: string | null;
  sourceName?: string | null;
  sourceDate?: string | null;
  relatedInitiativesList?: Array<{ name: string; year?: string | null; sourceUrl?: string | null }>;
  sourceLinks?: Array<{ label: string; url: string }>;
};

export const youthOrganizations: YouthOrganization[] = [
  {
    id: "ydac-arts-culture",
    name: "Youth Development Advocate Circle (YDAC) for Arts and Culture",
    type: "Advocacy Group",
    focus: "Arts, culture, and youth creative engagement",
    sourceTag: "Prototype seed reference, July 13, 2025",
    status: "active",
    sourcePostUrl: "https://www.facebook.com/metrolydo/",
  },
  {
    id: "ydac-agri-envi",
    name: "Youth Development Advocate Circle (YDAC) for Agriculture and Environment",
    type: "Advocacy Group",
    focus: "Environment and agriculture initiatives for youth",
    sourceTag: "Prototype seed reference, July 18, 2025",
    status: "active",
    sourcePostUrl: "https://www.facebook.com/metrolydo/",
  },
  {
    id: "prototype-sk-network",
    name: "Sangguniang Kabataan (Barangay SK network)",
    type: "Youth Governance",
    focus: "Barangay youth governance and leadership",
    sourceTag: "Prototype seed reference, September 1, 2025",
    status: "active",
    sourcePostUrl: "https://www.facebook.com/metrolydo/",
  },
  {
    id: "prototype-seb",
    name: "SMMC Student Executive Board (SEB)",
    type: "Campus Youth Partner",
    focus: "Campus-led youth representation and initiatives",
    sourceTag: "Prototype seed reference, August 20, 2025",
    status: "partner",
    sourcePostUrl: "https://www.facebook.com/metrolydo/",
  },
  {
    id: "prototype-youth-org-assembly",
    name: "Prototype LYDO Youth Organizations Assembly Network",
    type: "Multi-organization Network",
    focus: "Municipal youth organizations coordination and dialogue",
    sourceTag: "Prototype Project Bigkis Kabataan, October 12, 2025",
    status: "active",
    sourcePostUrl: "https://www.facebook.com/metrolydo/",
  },
];

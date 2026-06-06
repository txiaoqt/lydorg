import { supabase } from "@/lib/supabase";
import type { YouthOrganization } from "@/lib/youthCatalog";
import type { DisclosureDocument } from "@/lib/transparencyPortalData";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const formatDateRange = (startDate?: string | null, endDate?: string | null, scheduleText?: string | null) => {
  if (scheduleText) return scheduleText;
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  if (startDate) return startDate;
  if (endDate) return endDate;
  return "TBA";
};

const formatTimeValue = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const hhmm = raw.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return raw;
  const [hourText, minuteText] = hhmm.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return raw;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const formatTimeRange = (
  startTime?: string | null,
  endTime?: string | null,
) => {
  const start = formatTimeValue(startTime);
  const end = formatTimeValue(endTime);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return "";
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "N/A";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

export type FinancialDashboardRow = {
  name: string;
  skBudget: number;
  utilizedBudget: number;
  remaining: number;
  percent: number;
  youthPopulation: number;
  skChairperson: string;
  activities: number;
  participants: number;
  organizations: number;
  complianceStatus: "compliant" | "pending" | "overdue";
  latitude?: number | null;
  longitude?: number | null;
};

export type FinancialDashboardData = {
  rows: FinancialDashboardRow[];
  monthlyTrend: Array<{ month: string; allocated: number; utilized: number }>;
};

export type ComplianceBoardRow = {
  barangay: string;
  cbydp: "ok" | "partial" | "issue";
  abyip: "ok" | "partial" | "issue";
  annualBudget: "ok" | "partial" | "issue";
  rcb: "ok" | "partial" | "issue";
  mil: "ok" | "partial" | "issue";
  remarks: string;
};

export type MonthlyComplianceRow = {
  month: string;
  monthIndex: number;
  barangay: string;
  dueDate: string;
  submissions: {
    mfr: "submitted" | "late" | "missing";
    mil: "submitted" | "late" | "missing";
    rcb: "submitted" | "late" | "missing";
    accomplishment: "submitted" | "late" | "missing";
    census: "submitted" | "late" | "missing";
  };
  reportPdf: string;
};

export type TicketTypeOption = string;

type FinancialRow = {
  barangay_id: string;
  fiscal_year: number;
  month_no: number;
  allocated_amount: number | null;
  utilized_amount: number | null;
  sk_budget: number | null;
};

type BarangayMetricRow = {
  barangay_id: string;
  fiscal_year: number;
  activities: number | null;
  participants: number | null;
  organizations: number | null;
  compliance_status: "compliant" | "pending" | "overdue" | string | null;
};

export async function fetchOrganizations(): Promise<YouthOrganization[]> {
  if (!supabase) return [];

  const pickFirstString = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return null;
  };
  const pickFirstArray = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (Array.isArray(value)) return value;
    }
    return [];
  };

  const { data, error } = await supabase
    .from("organizations")
    .select("*, organization_references(reference_title, reference_url, published_on)")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => {
    const raw = row as Record<string, unknown>;
    const rawInitiatives = pickFirstArray(raw, ["related_initiatives", "initiatives", "organization_initiatives"]);
    const relatedInitiativesList = rawInitiatives
      .map((item) => {
        if (typeof item === "string") return { name: item, year: null, sourceUrl: null };
        if (!item || typeof item !== "object") return null;
        const typed = item as Record<string, unknown>;
        const name = pickFirstString(typed, ["name", "title", "initiative"]);
        if (!name) return null;
        return {
          name,
          year: pickFirstString(typed, ["year", "activity_year", "date"]),
          sourceUrl: pickFirstString(typed, ["source_url", "url", "reference_url"]),
        };
      })
      .filter((entry): entry is { name: string; year?: string | null; sourceUrl?: string | null } => Boolean(entry));

    const referenceRows = pickFirstArray(raw, ["organization_references"]);
    const rawSources = pickFirstArray(raw, ["source_links", "sources", "organization_sources"]);
    const normalizedReferenceSources = referenceRows
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const typed = entry as Record<string, unknown>;
        const url = pickFirstString(typed, ["reference_url", "url"]);
        if (!url) return null;
        return {
          label: pickFirstString(typed, ["reference_title", "label", "name", "title"]) ?? "Reference",
          url,
        };
      })
      .filter((entry): entry is { label: string; url: string } => Boolean(entry));
      const sourceLinks = [
        ...normalizedReferenceSources,
        ...rawSources
        .map((item) => {
          if (typeof item === "string") {
            return item.trim().length > 0 ? { label: "Reference", url: item } : null;
        }
        if (!item || typeof item !== "object") return null;
        const typed = item as Record<string, unknown>;
          const url = pickFirstString(typed, ["url", "source_url", "link"]);
          if (!url) return null;
          return { label: pickFirstString(typed, ["label", "name", "title"]) ?? "Reference", url };
        })
        .filter((entry): entry is { label: string; url: string } => Boolean(entry)),
      ];

    const normalizedStatus = String(raw.status ?? "active").toLowerCase();
    return {
      id: String(raw.id ?? ""),
      name: String(raw.name ?? "Unnamed Organization"),
      type: String(raw.type ?? pickFirstString(raw, ["category", "organization_type"]) ?? "Organization"),
      focus: String(raw.focus ?? pickFirstString(raw, ["overview", "description", "mission"]) ?? "N/A"),
      sourceTag: String(raw.source_tag ?? pickFirstString(raw, ["source_name", "source_reference", "source_reference_title"]) ?? "Prototype Data"),
      status:
        normalizedStatus === "partner"
          ? "partner"
          : normalizedStatus === "pending"
            ? "pending"
            : normalizedStatus === "inactive"
              ? "inactive"
              : "active",
      sourcePostUrl: pickFirstString(raw, ["source_post_url", "source_reference_url", "source_link", "official_source_url"]) ?? undefined,
      category: pickFirstString(raw, ["category", "organization_type"]),
      overview: pickFirstString(raw, ["overview", "description"]),
      mission: pickFirstString(raw, ["mission", "purpose"]),
      objectives: pickFirstString(raw, ["objectives"]),
      programs: pickFirstString(raw, ["programs_projects", "programs", "projects"]),
      activities: pickFirstString(raw, ["activities"]),
      location: pickFirstString(raw, ["location", "address"]),
      coverageArea: pickFirstString(raw, ["coverage_area"]),
      targetBeneficiaries: pickFirstString(raw, ["target_beneficiaries", "beneficiaries"]),
      contactEmail: pickFirstString(raw, ["contact_email", "email"]),
      contactPhone: pickFirstString(raw, ["contact_phone", "phone"]),
      contactPerson: pickFirstString(raw, ["contact_person"]),
      relatedInitiatives: pickFirstString(raw, ["related_initiatives_summary", "initiatives_summary", "related_initiatives", "initiatives"]),
      activityYear: pickFirstString(raw, ["activity_year", "related_activity_year", "source_reference_published_on"]),
      sourceName: pickFirstString(raw, ["source_reference_title", "source_name"]),
      sourceDate: pickFirstString(raw, ["source_reference_published_on", "source_date"]),
      relatedInitiativesList,
      sourceLinks,
    };
  }).filter((row) => row.id);
}

export async function fetchDisclosureRegistry(): Promise<DisclosureDocument[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("disclosure_documents")
    .select(
      "id,title,document_type,document_type_other,fiscal_year,quarter,published_date,file_size_bytes,public_url,storage_path,applies_to_all_barangays,barangays(name),offices(name)",
    )
    .order("published_date", { ascending: false });

  if (error || !data || data.length === 0) return [];

  return data.map((row) => {
    const office = Array.isArray(row.offices) ? row.offices[0] : row.offices;
    const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
    const mappedType =
      row.document_type === "other"
        ? String(row.document_type_other || "Other")
        : toTitleCase(String(row.document_type ?? "other"))
            .replace("Bac", "BAC")
            .replace("Executive Order", "Executive Order")
            .replace("Program Outcome", "Program Outcome")
            .replace("Financial Statement", "Financial Statement");

    return {
      id: row.id,
      title: row.title,
      documentType: mappedType as DisclosureDocument["documentType"],
      fiscalYear: row.fiscal_year,
      quarter: row.quarter,
      barangay: row.applies_to_all_barangays ? "All Barangays" : barangay?.name ?? "N/A",
      office: office?.name ?? "N/A",
      publishedDate: row.published_date,
      size: formatFileSize(row.file_size_bytes),
      pdfUrl: row.public_url ?? row.storage_path ?? "",
    };
  });
}

export async function fetchTransparencyKpis() {
  if (!supabase) {
    return {
      disclosuresPublished: 0,
      reportsReceived: 0,
      reportsResolved: 0,
      avgResponseHours: 0,
      pendingTickets: 0,
    };
  }

  const { data, error } = await supabase
    .from("transparency_kpis")
    .select("disclosures_published,reports_received,reports_resolved,avg_response_hours,pending_tickets")
    .maybeSingle();

  if (error || !data) {
    return {
      disclosuresPublished: 0,
      reportsReceived: 0,
      reportsResolved: 0,
      avgResponseHours: 0,
      pendingTickets: 0,
    };
  }

  return {
    disclosuresPublished: data.disclosures_published ?? 0,
    reportsReceived: data.reports_received ?? 0,
    reportsResolved: data.reports_resolved ?? 0,
    avgResponseHours: data.avg_response_hours ?? 0,
    pendingTickets: data.pending_tickets ?? 0,
  };
}

export async function fetchTicketTypeOptions(): Promise<TicketTypeOption[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from("ticket_types").select("name").order("id", { ascending: true });
  if (error || !data || data.length === 0) return [];

  return data.map((row) => row.name);
}

export async function submitYouthTicket(params: {
  type: string;
  subject: string;
  message: string;
  email: string;
  userId?: string | null;
}) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data: typeRow } = await supabase
    .from("ticket_types")
    .select("id")
    .eq("name", params.type)
    .maybeSingle();
  if (!typeRow) throw new Error("Ticket type is not configured in the database.");

  const { data, error } = await supabase
    .from("youth_tickets")
    .insert({
      reference_no: "",
      type_id: typeRow.id,
      subject: params.subject,
      message: params.message,
      requester_email: params.email,
      created_by_user_id: params.userId ?? null,
    })
    .select("id,reference_no,status,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit ticket.");
  }

  return data;
}

export async function trackYouthTicket(referenceNo: string, requesterEmail: string) {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("track_youth_ticket", {
    _reference_no: referenceNo,
    _requester_email: requesterEmail,
  });

  if (error || !data || data.length === 0) return null;
  return data[0] as {
    reference_no: string;
    ticket_type: string;
    subject: string;
    status: "received" | "in_progress" | "resolved" | "closed";
    created_at: string;
    updated_at: string;
  };
}

export async function fetchMyYouthTickets(userId: string) {
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from("youth_tickets")
    .select("id,reference_no,subject,status,created_at,updated_at,ticket_types(name)")
    .eq("created_by_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => {
    const type = Array.isArray(row.ticket_types) ? row.ticket_types[0] : row.ticket_types;
    return {
      id: row.id,
      referenceNo: row.reference_no,
      subject: row.subject,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      type: type?.name ?? "",
    };
  });
}

export async function fetchFinancialDashboardData(): Promise<FinancialDashboardData> {
  if (!supabase) return { rows: [], monthlyTrend: [] };

  const [{ data: bData, error: bError }, { data: fData, error: fError }, { data: mData, error: mError }] = await Promise.all([
    supabase
      .from("barangays")
      .select("id,name,latitude,longitude,sk_chairperson,youth_population")
      .order("name", { ascending: true }),
    supabase
      .from("barangay_financials")
      .select("barangay_id,fiscal_year,month_no,allocated_amount,utilized_amount,sk_budget")
      .order("fiscal_year", { ascending: false })
      .order("month_no", { ascending: false }),
    supabase
      .from("barangay_youth_metrics")
      .select("barangay_id,fiscal_year,activities,participants,organizations,compliance_status")
      .order("fiscal_year", { ascending: false }),
  ]);

  if (bError || fError || mError || !bData || !fData || bData.length === 0 || fData.length === 0) {
    return { rows: [], monthlyTrend: [] };
  }

  const financialRows = fData as FinancialRow[];
  const metricRows = (mData ?? []) as BarangayMetricRow[];

  const latestByBarangay = new Map<string, FinancialRow>();
  const latestMetricsByBarangay = new Map<string, BarangayMetricRow>();
  const byYear = new Map<number, FinancialRow[]>();

  financialRows.forEach((row) => {
    if (!latestByBarangay.has(row.barangay_id)) latestByBarangay.set(row.barangay_id, row);
    const group = byYear.get(row.fiscal_year) ?? [];
    group.push(row);
    byYear.set(row.fiscal_year, group);
  });
  metricRows.forEach((row) => {
    if (!latestMetricsByBarangay.has(row.barangay_id)) latestMetricsByBarangay.set(row.barangay_id, row);
  });

  const latestYear = Math.max(...Array.from(byYear.keys()));
  const selectedYearRows = byYear.get(latestYear) ?? [];

  const monthlyMap = new Map<number, { allocated: number; utilized: number }>();
  selectedYearRows.forEach((row) => {
    const existing = monthlyMap.get(row.month_no) ?? { allocated: 0, utilized: 0 };
    monthlyMap.set(row.month_no, {
      allocated: existing.allocated + Number(row.allocated_amount ?? 0),
      utilized: existing.utilized + Number(row.utilized_amount ?? 0),
    });
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([monthNo, values]) => ({
      month: monthNames[Math.max(0, Math.min(11, monthNo - 1))],
      allocated: values.allocated,
      utilized: values.utilized,
    }));

  const rows: FinancialDashboardRow[] = bData
    .map((barangayRow) => {
    const latestFinancial = latestByBarangay.get(barangayRow.id);
    if (!latestFinancial) return null;
    const metric = latestMetricsByBarangay.get(barangayRow.id);

    const compliance =
      metric?.compliance_status === "compliant" || metric?.compliance_status === "pending" || metric?.compliance_status === "overdue"
        ? metric.compliance_status
        : "pending";

    const skBudget = Number(latestFinancial.sk_budget ?? 0);
    const utilizedBudget = Number(latestFinancial.utilized_amount ?? 0);
    const remaining = Math.max(skBudget - utilizedBudget, 0);
    const percent = skBudget > 0 ? Math.round((utilizedBudget / skBudget) * 100) : 0;

    return {
      name: barangayRow.name,
      skBudget,
      utilizedBudget,
      remaining,
      percent,
      youthPopulation: Number(barangayRow.youth_population ?? 0),
      skChairperson: barangayRow.sk_chairperson ?? "",
      activities: Number(metric?.activities ?? 0),
      participants: Number(metric?.participants ?? 0),
      organizations: Number(metric?.organizations ?? 0),
      complianceStatus: compliance,
      latitude: barangayRow.latitude,
      longitude: barangayRow.longitude,
    };
    })
    .filter((row): row is FinancialDashboardRow => Boolean(row));

  return { rows, monthlyTrend };
}

export async function fetchComplianceBoardData(): Promise<{
  fiscalYearLabel: string;
  rows: ComplianceBoardRow[];
}> {
  if (!supabase) return { fiscalYearLabel: "No published quarter", rows: [] };

  const { data: latest } = await supabase
    .from("compliance_board_status")
    .select("fiscal_year,quarter")
    .order("fiscal_year", { ascending: false })
    .order("quarter", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return { fiscalYearLabel: "No published quarter", rows: [] };

  const { data } = await supabase
    .from("compliance_board_status")
    .select("barangays(name),cbydp,abyip,annual_budget,rcb,mil,remarks")
    .eq("fiscal_year", latest.fiscal_year)
    .eq("quarter", latest.quarter);

  const rows: ComplianceBoardRow[] =
    data?.map((row) => {
      const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
      return {
        barangay: barangay?.name ?? "N/A",
        cbydp: row.cbydp,
        abyip: row.abyip,
        annualBudget: row.annual_budget,
        rcb: row.rcb,
        mil: row.mil,
        remarks: row.remarks ?? "",
      };
    }) ?? [];

  return {
    fiscalYearLabel: `${latest.quarter} ${latest.fiscal_year}`,
    rows,
  };
}

export async function fetchMonthlyComplianceData(): Promise<MonthlyComplianceRow[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from("monthly_compliance")
    .select(
      "month_no,due_date,mfr_status,mil_status,rcb_status,accomplishment_status,census_status,barangays(name),disclosure_documents(public_url,storage_path)",
    )
    .order("month_no", { ascending: true });

  if (!data || data.length === 0) return [];

  return data.map((row) => {
    const barangay = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
    const report = Array.isArray(row.disclosure_documents) ? row.disclosure_documents[0] : row.disclosure_documents;

    return {
      month: `${monthNames[Math.max(0, Math.min(11, row.month_no - 1))]} ${new Date(row.due_date).getFullYear()}`,
      monthIndex: row.month_no - 1,
      barangay: barangay?.name ?? "N/A",
      dueDate: row.due_date,
      submissions: {
        mfr: row.mfr_status,
        mil: row.mil_status,
        rcb: row.rcb_status,
        accomplishment: row.accomplishment_status,
        census: row.census_status,
      },
      reportPdf: report?.public_url ?? report?.storage_path ?? "",
    };
  });
}


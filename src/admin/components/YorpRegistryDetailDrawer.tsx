import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Award,
  Building2,
  CalendarDays,
  Copy,
  Globe,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  computeYpopScore,
  formatSubClassificationLabel,
  resolveYpopCityLedCategory,
  normalizeYpopCityLedPoints,
  DEFAULT_ORG_LED_TIERS,
  YPOP_CITY_LED_CATEGORY_LABELS,
  YPOP_CITY_LED_CATEGORY_POINTS,
  YPOP_SCORE_THRESHOLD,
  type YPOPCityActivityCategory,
} from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import type { YorpRegistryEntry } from "@/admin/components/YorpRegistryTable";

type YorpRegistryDetailDrawerProps = {
  entry: YorpRegistryEntry | null;
  onOpenChange: (open: boolean) => void;
};

type TabKey = "overview" | "representatives" | "location" | "ypop" | "contact";

const TABS: { value: TabKey; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "representatives", label: "Representatives" },
  { value: "location", label: "Location" },
  { value: "ypop", label: "YPOP" },
  { value: "contact", label: "Contact" },
];

const formatAdvocacyLabel = (value: string) =>
  value.replace(/\b\w/g, (letter) => letter.toUpperCase());

const SectionCard = ({
  title,
  icon: Icon,
  headerRight,
  children,
}: {
  title: string;
  icon: LucideIcon;
  headerRight?: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-6 shadow-sm">
    <div className="flex items-center justify-between gap-1.5 border-b border-slate-300 pb-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-[13px] w-[13px] shrink-0 text-slate-500" strokeWidth={1.6} />
        <p className="font-segoe text-[13px] font-semibold uppercase leading-none text-slate-500">{title}</p>
      </div>
      {headerRight ?? null}
    </div>
    {children}
  </div>
);

const DataField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-2 rounded-md border border-border-panel-subtle bg-bg-panel-subtle px-4 py-3">
    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">{label}</p>
    <p className="font-segoe text-sm font-semibold leading-none text-text-default">{value}</p>
  </div>
);

const CopyableField = ({ label, value }: { label: string; value: string }) => {
  const canCopy = Boolean(value) && value !== "Not provided";

  const handleCopy = () => {
    if (!canCopy) return;
    void navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${value} copied to clipboard.` });
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border-panel-subtle bg-bg-panel-subtle px-4 py-3">
      <div className="flex flex-col gap-2">
        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">{label}</p>
        <p className="font-segoe text-sm font-semibold leading-none text-text-default">{value}</p>
      </div>
      {canCopy ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-text-default"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>
      ) : null}
    </div>
  );
};

const AdvocacyPill = ({ label }: { label: string }) => (
  <span className="inline-flex w-fit items-center rounded-full border border-border-tertiary-200 bg-bg-tertiary-subtle px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
    {formatAdvocacyLabel(label)}
  </span>
);

const CATEGORY_PILL_CLASSES: Record<YPOPCityActivityCategory, string> = {
  mandatory: "border-border-mandatory-subtle bg-bg-mandatory-subtle text-text-mandatory",
  partnership: "border-border-partnership-subtle bg-bg-partnership-subtle text-text-partnership",
  invitational: "border-border-pink-subtle bg-bg-pink-subtle text-text-pink",
};

const CategoryPill = ({ category }: { category: YPOPCityActivityCategory }) => (
  <span
    className={cn(
      "inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]",
      CATEGORY_PILL_CLASSES[category],
    )}
  >
    {YPOP_CITY_LED_CATEGORY_LABELS[category]}
  </span>
);

const PointsPill = ({ points }: { points: number }) => (
  <span className="inline-flex w-fit shrink-0 items-center rounded border border-border-tertiary-200 bg-bg-tertiary-subtle px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
    {points} pts
  </span>
);

const RepresentativeCard = ({
  icon: Icon,
  title,
  name,
  email,
  phone,
}: {
  icon: LucideIcon;
  title: string;
  name: string;
  email: string;
  phone: string;
}) => (
  <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-6 shadow-sm">
    <div className="flex items-center gap-1.5 border-b border-slate-300 pb-3">
      <Icon className="h-[13px] w-[13px] shrink-0 text-slate-500" strokeWidth={1.6} />
      <p className="font-segoe text-[13px] font-semibold uppercase leading-none text-slate-500">{title}</p>
    </div>
    <div className="flex flex-col gap-1.5">
      <p className="font-segoe text-sm font-semibold leading-none text-text-default">{name || "Not provided"}</p>
      {name ? (
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 font-segoe text-xs font-normal leading-[140%] text-slate-500">
            <Mail className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
            {email || "Not provided"}
          </span>
          <span className="flex items-center gap-1.5 font-segoe text-xs font-normal leading-[140%] text-slate-500">
            <Phone className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
            {phone || "Not provided"}
          </span>
        </div>
      ) : null}
    </div>
  </div>
);

const AccreditationStatusCard = ({ entry, now }: { entry: YorpRegistryEntry; now: number }) => {
  const diffMs = entry.expiryDate.getTime() - now;
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / 86400000);
  const hours = Math.floor((absMs % 86400000) / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);

  if (entry.yorpStatus === "expired") {
    return (
      <div className="flex items-center rounded-md border border-status-danger-border bg-danger-subtle p-3">
        <div className="flex flex-col gap-1 px-4 py-3">
          <p className="font-segoe text-lg font-semibold leading-none text-text-danger-strong">Expired</p>
          <p className="font-segoe text-xs font-normal leading-none text-slate-500">
            Expired {days} day{days === 1 ? "" : "s"} ago · Renewal required
          </p>
        </div>
      </div>
    );
  }

  const isActive = entry.yorpStatus === "active";

  return (
    <div
      className={cn(
        "flex items-center gap-10 rounded-md border p-3",
        isActive
          ? "border-border-success-subtle bg-bg-success-subtle"
          : "border-border-warning-subtle bg-bg-warning-subtle",
      )}
    >
      <div className="flex flex-col gap-1 px-4 py-3">
        <p
          className={cn(
            "font-segoe text-lg font-semibold leading-none",
            isActive ? "text-text-positive-strong" : "text-text-warning-secondary",
          )}
        >
          {isActive ? "Active" : "Expiring Soon"}
        </p>
        <p className="font-segoe text-xs font-normal leading-none text-slate-500">
          {isActive ? "In good standing" : "Renew before expiration"}
        </p>
      </div>
      <div className="h-16 w-px shrink-0 bg-slate-500/50" />
      <div className="flex flex-1 flex-col items-center gap-2 py-3">
        <p
          className={cn(
            "font-segoe text-[11px] font-semibold uppercase leading-none",
            isActive ? "text-positive-secondary" : "text-text-warning-secondary",
          )}
        >
          Days Until Expiration
        </p>
        <div className="flex items-end gap-4">
          {[
            { value: days, label: "days" },
            { value: hours, label: "hours" },
            { value: minutes, label: "minutes" },
            { value: seconds, label: "seconds" },
          ].map((unit) => (
            <div key={unit.label} className="flex flex-col items-center gap-0.5">
              <p
                className={cn(
                  "font-cascadia text-xl font-semibold leading-none",
                  isActive ? "text-text-positive-strong" : "text-text-warning-secondary",
                )}
              >
                {String(unit.value).padStart(2, "0")}
              </p>
              <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">{unit.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EmptyTab = ({ label, description = "Coming soon." }: { label: string; description?: string }) => (
  <div className="flex flex-col items-center gap-1 py-16 text-center">
    <p className="font-segoe text-sm font-semibold text-text-default">{label}</p>
    <p className="font-segoe text-xs text-slate-500">{description}</p>
  </div>
);

export const YorpRegistryDetailDrawer = ({ entry, onOpenChange }: YorpRegistryDetailDrawerProps) => {
  const { state } = useLydoConnect();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [now, setNow] = useState(() => Date.now());
  const [isYpopBreakdownOpen, setIsYpopBreakdownOpen] = useState(false);
  const ypopBreakdownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const ypopBreakdownPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!entry) return undefined;
    setActiveTab("overview");
    setNow(Date.now());
    setIsYpopBreakdownOpen(false);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [entry?.org.id]);

  useEffect(() => {
    if (!isYpopBreakdownOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ypopBreakdownPanelRef.current?.contains(target)) return;
      if (ypopBreakdownTriggerRef.current?.contains(target)) return;
      setIsYpopBreakdownOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsYpopBreakdownOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isYpopBreakdownOpen]);

  const org = entry?.org;

  const ypopData = useMemo(() => {
    if (!org) return null;

    const openPeriod = [...state.ypopPeriods]
      .filter((period) => period.status === "open")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!openPeriod) return null;

    const ypopEntry =
      state.ypopEntries.find(
        (item) => item.organizationId === org.id && item.semester === openPeriod.semesterKey,
      ) ?? null;

    const semesterActivities = state.ypopCityActivities.filter(
      (activity) => activity.semesterKey === openPeriod.semesterKey,
    );
    const semesterActivityIds = new Set(semesterActivities.map((activity) => activity.id));

    const orgParticipations = state.ypopEventParticipations
      .filter((item) => item.organizationId === org.id && semesterActivityIds.has(item.activityId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const verifiedAttendance = semesterActivities.map((activity) => ({
      activityId: activity.id,
      attended: orgParticipations.some((item) => item.activityId === activity.id && item.status === "verified"),
    }));

    const orgActivities = ypopEntry
      ? state.ypopOrgActivities
          .filter((activity) => activity.ypopEntryId === ypopEntry.id && activity.status === "approved")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];

    const score = computeYpopScore(verifiedAttendance, semesterActivities, orgActivities.length);

    const isQualified =
      ypopEntry?.status === "qualified"
        ? true
        : ypopEntry?.status === "not_qualified"
          ? false
          : score.totalScore >= (ypopEntry?.pointsRequired ?? YPOP_SCORE_THRESHOLD);

    const joinedActivities = orgParticipations.map((participation) => {
      const activity = semesterActivities.find((item) => item.id === participation.activityId);
      const category = resolveYpopCityLedCategory(activity?.category, activity?.points);
      const points = normalizeYpopCityLedPoints(activity?.points ?? 0, activity?.category);
      return { participation, category, points };
    });

    const categoryBreakdown = (["mandatory", "invitational", "partnership"] as YPOPCityActivityCategory[])
      .map((category) => {
        const activitiesInCategory = semesterActivities.filter(
          (activity) => resolveYpopCityLedCategory(activity.category, activity.points) === category,
        );
        if (!activitiesInCategory.length) return null;
        const pointsPerActivity = YPOP_CITY_LED_CATEGORY_POINTS[category];
        const attendedCount = activitiesInCategory.filter((activity) =>
          verifiedAttendance.some((item) => item.activityId === activity.id && item.attended),
        ).length;
        return {
          category,
          count: activitiesInCategory.length,
          pointsPerActivity,
          attendedCount,
          earnedPts: attendedCount * pointsPerActivity,
          maxPts: activitiesInCategory.length * pointsPerActivity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      percent: score.totalScore,
      cityLedPercent: score.cityLedPercent,
      cityLedEarned: score.cityLedEarned,
      cityLedMax: score.cityLedMax,
      orgLedBonus: score.orgLedBonus,
      totalScore: score.totalScore,
      approvedOrgActivityCount: orgActivities.length,
      isQualified,
      joinedActivities,
      orgActivities,
      categoryBreakdown,
    };
  }, [
    org,
    state.ypopPeriods,
    state.ypopEntries,
    state.ypopEventParticipations,
    state.ypopOrgActivities,
    state.ypopCityActivities,
  ]);

  return (
    <Sheet open={Boolean(entry)} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-[672px]">
        {entry && org ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 bg-bg-panel-subtle px-8 py-6">
              <div className="flex flex-col gap-2">
                <ReferenceCodeChip code={org.urn || "—"} className="w-fit" />
                <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">
                  {org.organizationName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 font-segoe text-xs leading-[140%] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                    {[org.district, org.barangay ? `Brgy. ${org.barangay}` : ""].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                    Term: {format(entry.registrationDate, "d MMM yyyy")} – {format(entry.expiryDate, "d MMM yyyy")}
                  </span>
                </div>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
              <div className="flex items-center gap-0.5 rounded-md border border-slate-300 bg-admin-surface p-1">
                {TABS.map((tab) => {
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveTab(tab.value)}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
                        active
                          ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                          : "text-text-default hover:bg-slate-50",
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === "overview" ? (
                <div className="flex flex-col gap-4">
                  <SectionCard title="General" icon={Building2}>
                    <div className="flex flex-col gap-3">
                      <DataField label="Organization" value={org.organizationName} />
                      <div className="grid grid-cols-2 gap-3">
                        <DataField label="Unique Registration Number" value={org.urn || "—"} />
                        <DataField label="Founding Date" value={format(entry.registrationDate, "d MMM yyyy")} />
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Accreditation" icon={Award}>
                    <div className="flex flex-col gap-3">
                      <AccreditationStatusCard entry={entry} now={now} />
                      <div className="grid grid-cols-2 gap-3">
                        <DataField label="Registration Date" value={format(entry.registrationDate, "d MMM yyyy")} />
                        <DataField label="Expiration Date" value={format(entry.expiryDate, "d MMM yyyy")} />
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Classification" icon={Shield}>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <DataField label="Major Classification" value={org.majorClassification || "—"} />
                        <DataField
                          label="Sub-classification"
                          value={org.subClassification ? formatSubClassificationLabel(org.subClassification) : "—"}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2 rounded-md border border-border-panel-subtle bg-bg-panel-subtle px-4 py-3">
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">
                            Advocacy
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {org.advocacies.length ? (
                              org.advocacies.map((advocacy) => <AdvocacyPill key={advocacy} label={advocacy} />)
                            ) : (
                              <span className="font-cascadia text-sm font-semibold text-text-default">—</span>
                            )}
                          </div>
                        </div>
                        <DataField label="Level" value="City/Municipal" />
                      </div>
                    </div>
                  </SectionCard>
                </div>
              ) : null}

              {activeTab === "representatives" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <RepresentativeCard
                    icon={User}
                    title="Representative"
                    name={org.representativeName}
                    email={org.organizationEmail}
                    phone={org.contactNumber}
                  />
                  <RepresentativeCard
                    icon={User}
                    title="Adviser"
                    name={org.adviserName}
                    email={org.organizationEmail}
                    phone={org.contactNumber}
                  />
                </div>
              ) : null}

              {activeTab === "location" ? (
                <SectionCard title="Location" icon={MapPin}>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <DataField label="District" value={org.district || "—"} />
                      <DataField label="Barangay" value={org.barangay || "—"} />
                    </div>
                    <DataField label="Full Address" value={org.address || "Not provided"} />
                  </div>
                </SectionCard>
              ) : null}

              {activeTab === "ypop" ? (
                ypopData ? (
                  <div className="flex flex-col gap-4">
                    <SectionCard
                      title="YPOP Participation"
                      icon={Globe}
                      headerRight={
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            ref={ypopBreakdownTriggerRef}
                            aria-label="View YPOP points breakdown"
                            onClick={() => setIsYpopBreakdownOpen((current) => !current)}
                            className="flex h-[13px] w-[13px] shrink-0 items-center justify-center text-text-disabled transition-colors hover:text-slate-500"
                          >
                            <HelpCircle className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                          </button>
                          {isYpopBreakdownOpen ? (
                            <div
                              ref={ypopBreakdownPanelRef}
                              className="absolute right-0 top-full z-10 mt-2 flex w-[408px] max-h-[553px] flex-col overflow-y-auto rounded-md border border-slate-300 bg-admin-surface px-4 py-3 shadow-lg"
                            >
                              <div className="flex flex-col gap-1 border-b border-slate-300 px-2 pb-4 pt-3">
                                <p className="font-segoe text-lg font-semibold leading-none text-text-default">
                                  YPOP Points Breakdown
                                </p>
                                <p className="text-justify font-segoe text-[13px] font-normal leading-none text-slate-500">
                                  Breakdown of this organization&rsquo;s overall YPOP points.
                                </p>
                              </div>

                              <div className="flex flex-col gap-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <p className="font-segoe text-xs font-semibold leading-none text-slate-500">
                                    City-Led Points
                                  </p>
                                  {ypopData.categoryBreakdown.map(
                                    ({ category, count, pointsPerActivity, attendedCount, earnedPts }) => (
                                      <div
                                        key={category}
                                        className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5"
                                      >
                                        <p className="font-segoe text-xs font-semibold leading-none text-text-default">
                                          {count}× {YPOP_CITY_LED_CATEGORY_LABELS[category]}
                                        </p>
                                        {attendedCount === 0 ? (
                                          <p className="font-segoe text-[10px] font-semibold italic leading-none text-text-disabled">
                                            Not attended
                                          </p>
                                        ) : (
                                          <p className="font-segoe text-[10px] font-semibold leading-none text-text-disabled">
                                            {count} × {pointsPerActivity} pts =
                                          </p>
                                        )}
                                        <p
                                          className={cn(
                                            "font-segoe text-xs font-bold leading-none",
                                            attendedCount === 0 ? "text-text-disabled" : "text-text-default",
                                          )}
                                        >
                                          {earnedPts} pts
                                        </p>
                                      </div>
                                    ),
                                  )}
                                  <div className="flex items-center justify-between gap-2 border-t border-dashed border-border-default py-1.5">
                                    <p className="font-segoe text-xs font-semibold leading-none text-text-neutral-secondary">
                                      City-led subtotal
                                    </p>
                                    <p className="font-segoe text-[10px] font-semibold leading-none text-text-disabled">
                                      {ypopData.cityLedEarned} pts ÷ {ypopData.cityLedMax} max pts ={" "}
                                      {ypopData.cityLedPercent}%
                                    </p>
                                    <p className="font-segoe text-xs font-bold leading-none text-text-default">
                                      {ypopData.cityLedEarned} pts
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <p className="font-segoe text-xs font-semibold leading-none text-slate-500">
                                    Organization-Led Bonus
                                  </p>
                                  {(() => {
                                    const activeTierMinProjects = [...DEFAULT_ORG_LED_TIERS]
                                      .filter((tier) => ypopData.approvedOrgActivityCount >= tier.minProjects)
                                      .map((tier) => tier.minProjects)
                                      .sort((a, b) => b - a)[0];
                                    return DEFAULT_ORG_LED_TIERS.map((tier) => {
                                      const active = tier.minProjects === activeTierMinProjects;
                                      return (
                                        <div
                                          key={tier.minProjects}
                                          className={cn(
                                            "flex items-center justify-between gap-2 rounded-md border px-3 py-1.5",
                                            active
                                              ? "border-brand-info-border bg-bg-info-tertiary"
                                              : "border-transparent bg-bg-panel-subtle",
                                          )}
                                        >
                                          <p
                                            className={cn(
                                              "font-segoe text-xs font-semibold leading-none",
                                              active ? "text-text-info-strong" : "text-text-disabled",
                                            )}
                                          >
                                            ≥ {tier.minProjects} project{tier.minProjects === 1 ? "" : "s"}
                                          </p>
                                          <p
                                            className={cn(
                                              "font-segoe text-xs font-bold leading-none",
                                              active ? "text-text-info-strong" : "text-text-disabled",
                                            )}
                                          >
                                            +{tier.bonus}%
                                          </p>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                <div
                                  className={cn(
                                    "flex flex-col gap-1 rounded-md border px-0 py-1.5",
                                    ypopData.isQualified
                                      ? "border-border-success-subtle bg-bg-success-subtle"
                                      : "border-status-danger-border bg-danger-subtle",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2 px-3">
                                    <p
                                      className={cn(
                                        "font-segoe text-xs font-normal leading-none",
                                        ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                                      )}
                                    >
                                      City-led score
                                    </p>
                                    <p
                                      className={cn(
                                        "font-segoe text-xs font-bold leading-none",
                                        ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                                      )}
                                    >
                                      {ypopData.cityLedPercent}%
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 px-3">
                                    <p
                                      className={cn(
                                        "font-segoe text-xs font-normal leading-none",
                                        ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                                      )}
                                    >
                                      Organization-led bonus
                                    </p>
                                    <p
                                      className={cn(
                                        "font-segoe text-xs font-bold leading-none",
                                        ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                                      )}
                                    >
                                      +{ypopData.orgLedBonus}%
                                    </p>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2 px-3">
                                    <p className="font-segoe text-xs font-bold leading-none text-text-default">
                                      Total YPOP Points
                                    </p>
                                    <p
                                      className={cn(
                                        "font-segoe text-lg font-bold leading-none",
                                        ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                                      )}
                                    >
                                      {ypopData.totalScore}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      }
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={cn(
                            "flex flex-col gap-3 rounded-md border p-3",
                            ypopData.isQualified
                              ? "border-border-success-subtle bg-bg-success-subtle"
                              : "border-status-danger-border bg-danger-subtle",
                          )}
                        >
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">
                            Eligibility Status
                          </p>
                          <div>
                            <p
                              className={cn(
                                "font-segoe text-xl font-semibold leading-none",
                                ypopData.isQualified ? "text-text-positive-strong" : "text-text-danger-strong",
                              )}
                            >
                              {ypopData.isQualified ? "Qualified" : "Not Qualified"}
                            </p>
                            <p className="mt-1 font-segoe text-xs font-normal leading-none text-slate-500">
                              {ypopData.isQualified ? "Met minimum threshold" : "Below minimum threshold"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 rounded-md border border-border-panel-subtle bg-bg-panel-subtle p-3">
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">
                            Semester Validation Points
                          </p>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <p className="font-cascadia text-2xl font-semibold leading-none text-text-default">
                                {ypopData.percent}%
                              </p>
                              <span className="inline-flex w-fit shrink-0 items-center rounded-full border-[0.6px] border-slate-300 bg-admin-surface px-1.5 py-1 font-cascadia text-[9px] font-normal leading-[140%] text-text-neutral-tertiary">
                                Min. {YPOP_SCORE_THRESHOLD}% Required
                              </span>
                            </div>
                            <div className="relative mt-1 h-2 w-full rounded-full bg-bg-progress-track">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  ypopData.percent >= YPOP_SCORE_THRESHOLD
                                    ? "bg-bg-success-default"
                                    : "bg-icon-danger-secondary",
                                )}
                                style={{ width: `${Math.min(ypopData.percent, 100)}%` }}
                              />
                              <div
                                className="absolute top-0 h-full w-px bg-slate-500"
                                style={{ left: `${YPOP_SCORE_THRESHOLD}%` }}
                              />
                            </div>
                            <div className="relative h-3 w-full">
                              <p
                                className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-cascadia text-[9px] font-normal leading-none text-slate-500"
                                style={{ left: `${YPOP_SCORE_THRESHOLD}%` }}
                              >
                                {YPOP_SCORE_THRESHOLD}% min
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="City-Led Activities Joined"
                      icon={Globe}
                      headerRight={
                        <span className="font-segoe text-[13px] font-semibold leading-none text-public-bg-brand">
                          View All
                        </span>
                      }
                    >
                      {ypopData.joinedActivities.length ? (
                        <div className="flex flex-col">
                          {ypopData.joinedActivities.map(({ participation, category, points }) => (
                            <div
                              key={participation.id}
                              className="flex items-center justify-between gap-2 border-b border-slate-300 py-3 last:border-b-0"
                            >
                              <p className="min-w-0 flex-1 truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                                {participation.activityName}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                <CategoryPill category={category} />
                                <PointsPill points={points} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center font-segoe text-xs text-slate-500">
                          No city-led activities joined yet.
                        </p>
                      )}
                    </SectionCard>

                    <SectionCard
                      title="Organization-Initiated Activities"
                      icon={Globe}
                      headerRight={
                        <span className="font-segoe text-[13px] font-semibold leading-none text-public-bg-brand">
                          View All
                        </span>
                      }
                    >
                      <div className="flex items-baseline gap-2">
                        <p className="font-segoe text-2xl font-semibold leading-none text-text-default">
                          {ypopData.orgActivities.length}
                        </p>
                        <p className="font-segoe text-xs font-semibold leading-[140%] text-slate-500">
                          activities completed this cycle
                        </p>
                      </div>
                      {ypopData.orgActivities.length ? (
                        <div className="flex flex-col">
                          {ypopData.orgActivities.map((activity) => (
                            <div key={activity.id} className="border-b border-slate-300 py-3 last:border-b-0">
                              <p className="font-segoe text-sm font-semibold leading-[140%] text-text-default">
                                {activity.activityName}
                              </p>
                              <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">
                                Completed {activity.activityDate || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-center font-segoe text-xs text-slate-500">
                          No organization-initiated activities completed yet.
                        </p>
                      )}
                    </SectionCard>
                  </div>
                ) : (
                  <EmptyTab label="YPOP" description="No active YPOP cycle at the moment." />
                )
              ) : null}

              {activeTab === "contact" ? (
                <SectionCard title="Socials" icon={Globe}>
                  <div className="flex flex-col gap-3">
                    <CopyableField label="Primary Email" value={org.organizationEmail || "Not provided"} />
                    <CopyableField label="Alternative Email" value="Not provided" />
                    <CopyableField label="Mobile Number" value={org.contactNumber || "Not provided"} />
                    <CopyableField label="Facebook Page" value={org.facebookPageUrl || "Not provided"} />
                  </div>
                </SectionCard>
              ) : null}

              {/* Footer */}
              <div className="-mx-6 -mb-8 mt-auto flex items-center justify-end gap-3 border-t border-slate-300 bg-bg-panel-subtle px-8 py-6">
                <SheetClose asChild>
                  <button
                    type="button"
                    className="flex h-11 w-[66px] items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                  >
                    Close
                  </button>
                </SheetClose>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

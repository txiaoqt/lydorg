import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, CheckCircle2, ChevronRight, ExternalLink, Facebook,
  MapPin, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  fetchPublicOrganizationDirectory,
  fetchPublicOrganizationProfile,
} from "@/lib/lydo-connect-supabase";
import type {
  PublicOrganizationActivity,
  PublicOrganizationDirectoryItem,
} from "@/lib/lydo-connect-data";
import { PwaOrganizationAvatar } from "../PwaOrganizationAvatar";
import { PWA_ROUTES, pwaOrganizationRoute } from "../pwaRoutes";
import { usePwaNavigation } from "../hooks/usePwaNavigation";

const titleCase = (value: string) => value
  .replaceAll("_", " ")
  .replaceAll("-", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
const classificationParts = (item: PublicOrganizationDirectoryItem) =>
  [item.majorClassification, item.subClassification].filter(Boolean).map(titleCase);
const location = (item: PublicOrganizationDirectoryItem) =>
  [item.district, item.barangay].filter(Boolean).map(titleCase).join(" · ") || "Pasig City";
const dateLabel = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(parsed);
};

let directoryViewState = {
  query: "",
  district: "all",
  barangay: "all",
  classification: "all",
  advocacy: "all",
  visibleCount: 8,
};

function AdvocacyTags({ values, limit = 2 }: { values: string[]; limit?: number }) {
  const visible = values.slice(0, limit);
  const remaining = values.length - visible.length;
  return values.length ? (
    <div className="pwa-directory-tags">
      {visible.map((value) => <span key={value}>{titleCase(value)}</span>)}
      {remaining > 0 ? <span>+{remaining} more</span> : null}
    </div>
  ) : null;
}

function DirectoryCard({ item }: { item: PublicOrganizationDirectoryItem }) {
  const { go } = usePwaNavigation();
  const destination = pwaOrganizationRoute(item.organizationId);
  const parts = classificationParts(item);
  return (
    <article
      className="pwa-card pwa-directory-card"
      tabIndex={0}
      role="link"
      onClick={() => go(destination)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go(destination);
        }
      }}
    >
      <div className="pwa-directory-card-heading">
        <PwaOrganizationAvatar className="pwa-directory-avatar" organizationName={item.organizationName} profileImageUrl={item.profileImageUrl} />
        <div className="pwa-directory-card-identity">
          <div><h2>{item.organizationName}</h2><StatusBadge status="verified" /></div>
          {parts.length ? <p>{parts.join(" · ")}</p> : <p>Youth organization</p>}
        </div>
      </div>
      <p className="pwa-directory-location"><MapPin aria-hidden="true" />{location(item)}</p>
      <AdvocacyTags values={item.advocacies} />
      <button type="button" className="pwa-directory-card-link" onClick={(event) => { event.stopPropagation(); go(destination); }}>
        View Profile <ChevronRight aria-hidden="true" />
      </button>
    </article>
  );
}

function DirectorySkeletons() {
  return <section className="pwa-directory-grid" aria-label="Loading organizations">
    {[0, 1, 2].map((item) => <div className="pwa-card pwa-directory-skeleton" key={item}><span /><div><i /><i /><i /></div></div>)}
  </section>;
}

export function PwaOrganizationDirectory() {
  const [organizations, setOrganizations] = useState<PublicOrganizationDirectoryItem[]>([]);
  const [query, setQuery] = useState(directoryViewState.query);
  const [district, setDistrict] = useState(directoryViewState.district);
  const [barangay, setBarangay] = useState(directoryViewState.barangay);
  const [classification, setClassification] = useState(directoryViewState.classification);
  const [advocacy, setAdvocacy] = useState(directoryViewState.advocacy);
  const [visibleCount, setVisibleCount] = useState(directoryViewState.visibleCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrganizations(await fetchPublicOrganizationDirectory());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The directory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    directoryViewState = { query, district, barangay, classification, advocacy, visibleCount };
  }, [advocacy, barangay, classification, district, query, visibleCount]);

  const options = useMemo(() => ({
    districts: [...new Set(organizations.map((item) => item.district).filter(Boolean))].sort(),
    barangays: [...new Set(organizations.map((item) => item.barangay).filter(Boolean))].sort(),
    classifications: [...new Set(organizations.map((item) => item.majorClassification).filter(Boolean))].sort(),
    advocacies: [...new Set(organizations.flatMap((item) => item.advocacies).filter(Boolean))].sort(),
  }), [organizations]);
  const filtersActive = Boolean(query.trim() || district !== "all" || barangay !== "all" || classification !== "all" || advocacy !== "all");
  const clearFilters = () => {
    setQuery(""); setDistrict("all"); setBarangay("all"); setClassification("all"); setAdvocacy("all"); setVisibleCount(8);
  };
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return organizations.filter((item) =>
      (district === "all" || item.district === district) &&
      (barangay === "all" || item.barangay === barangay) &&
      (classification === "all" || item.majorClassification === classification) &&
      (advocacy === "all" || item.advocacies.includes(advocacy)) &&
      (!normalized || [item.organizationName, item.barangay, item.majorClassification, item.subClassification, ...item.advocacies]
        .some((value) => value.toLowerCase().includes(normalized))),
    );
  }, [advocacy, barangay, classification, district, organizations, query]);

  return (
    <div className="pwa-stack pwa-directory-page">
      <section className="pwa-directory-heading">
        <h2>Discover verified youth organizations</h2>
        <p>Registered with Pasig City LYDO / PCYDO.</p>
      </section>
      <label className="pwa-directory-search"><Search aria-hidden="true" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(8); }} placeholder="Search organizations..." aria-label="Search organizations" /></label>
      <section className="pwa-directory-filter-row">
        <select value={district} onChange={(event) => { setDistrict(event.target.value); setVisibleCount(8); }} aria-label="Filter by district">
          <option value="all">All districts</option>
          {options.districts.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
        </select>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline"><SlidersHorizontal aria-hidden="true" />Filters</Button></SheetTrigger>
          <SheetContent side="bottom" className="pwa-directory-filter-sheet">
            <SheetHeader><SheetTitle>Filter Organizations</SheetTitle><SheetDescription>Narrow results by location, classification, or advocacy.</SheetDescription></SheetHeader>
            <div className="pwa-directory-filter-fields">
              <label>District<select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">All districts</option>{options.districts.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Barangay<select value={barangay} onChange={(event) => setBarangay(event.target.value)}><option value="all">All barangays</option>{options.barangays.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Classification<select value={classification} onChange={(event) => setClassification(event.target.value)}><option value="all">All classifications</option>{options.classifications.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
              <label>Advocacy<select value={advocacy} onChange={(event) => setAdvocacy(event.target.value)}><option value="all">All advocacies</option>{options.advocacies.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
            </div>
            {filtersActive ? <Button variant="outline" onClick={clearFilters}>Clear all filters</Button> : null}
          </SheetContent>
        </Sheet>
      </section>
      <div className="pwa-directory-result-summary"><p>{filtered.length} organization{filtered.length === 1 ? "" : "s"} found</p>{filtersActive ? <button type="button" onClick={clearFilters}>Clear filters</button> : null}</div>
      {loading ? <DirectorySkeletons /> : null}
      {error ? <section className="pwa-card pwa-directory-state"><RefreshCw aria-hidden="true" /><h3>Unable to load organizations</h3><p>{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></section> : null}
      {!loading && !error && !organizations.length ? <section className="pwa-card pwa-directory-state"><h3>No organizations available</h3><p>Verified organizations will appear after enabling directory visibility.</p></section> : null}
      {!loading && !error && organizations.length > 0 && !filtered.length ? <section className="pwa-card pwa-directory-state"><h3>No organizations found</h3><p>Try changing your search term or removing some filters.</p><Button variant="outline" onClick={clearFilters}>Clear filters</Button></section> : null}
      {!loading && !error ? <section className="pwa-directory-grid">{filtered.slice(0, visibleCount).map((item) => <DirectoryCard key={item.organizationId} item={item} />)}</section> : null}
      {filtered.length > visibleCount ? <Button className="pwa-directory-load-more" variant="outline" onClick={() => setVisibleCount((count) => count + 8)}>Load More</Button> : null}
    </div>
  );
}

export function PwaOrganizationDirectoryProfile() {
  const { organizationId = "" } = useParams();
  const [organization, setOrganization] = useState<PublicOrganizationDirectoryItem | null>(null);
  const [activities, setActivities] = useState<PublicOrganizationActivity[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchPublicOrganizationProfile(organizationId);
      if (!result) setError("This organization is not available in the directory.");
      else { setOrganization(result.organization); setActivities(result.activities); }
    } catch {
      setError("This organization profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="pwa-stack pwa-directory-profile">
      {loading ? <DirectorySkeletons /> : null}
      {error ? <section className="pwa-card pwa-directory-state"><h3>Profile unavailable</h3><p>{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></section> : null}
      {organization ? <>
        <section className="pwa-card pwa-directory-profile-hero">
          <div className="pwa-directory-profile-identity">
            <PwaOrganizationAvatar className="pwa-directory-profile-avatar" organizationName={organization.organizationName} profileImageUrl={organization.profileImageUrl} />
            <div><h1>{organization.organizationName}</h1><p className="pwa-directory-verified"><CheckCircle2 aria-hidden="true" />Verified organization</p>{classificationParts(organization).map((part) => <p key={part}>{part}</p>)}<p><MapPin aria-hidden="true" />{location(organization)}</p></div>
          </div>
          <AdvocacyTags values={organization.advocacies} limit={4} />
          {(organization.representativeName || organization.adviserName || organization.yorpRegisteredYear) ? <dl className="pwa-directory-public-meta">
            {organization.yorpRegisteredYear ? <div><dt>YORP Member Since</dt><dd>{organization.yorpRegisteredYear}</dd></div> : null}
            {organization.representativeName ? <div><dt>Representative</dt><dd>{organization.representativeName}</dd></div> : null}
            {organization.adviserName ? <div><dt>Adviser</dt><dd>{organization.adviserName}</dd></div> : null}
          </dl> : null}
        </section>
        {organization.facebookPageUrl ? <section className="pwa-card pwa-directory-connect"><span><Facebook aria-hidden="true" /><strong>Connect</strong></span><a href={organization.facebookPageUrl} target="_blank" rel="noopener noreferrer">Visit Facebook Page <ExternalLink aria-hidden="true" /></a></section> : null}
        <section className="pwa-card pwa-directory-activity-section">
          <div className="pwa-directory-section-heading"><h2><ShieldCheck aria-hidden="true" />Verified Activities</h2><span>{activities.length}</span></div>
          {activities.length ? <div className="pwa-directory-activities">{activities.slice(0, showAllActivities ? activities.length : 3).map((activity) => <article key={`${activity.kind}-${activity.id}`}><span className="pwa-directory-activity-icon"><CheckCircle2 aria-hidden="true" /></span><div><strong>{titleCase(activity.name)}</strong><span>{activity.kind === "city_led" ? "City-led activity" : "Organization-led activity"}</span><time><CalendarDays aria-hidden="true" />{dateLabel(activity.date)}</time>{activity.venue ? <p>{activity.venue}</p> : null}</div></article>)}</div> : <div className="pwa-directory-activity-empty"><p>No verified activities to display yet.</p><small>Activities appear here after they have been confirmed by LYDO / PCYDO.</small></div>}
          {activities.length > 3 ? <button type="button" className="pwa-profile-section-link" onClick={() => setShowAllActivities((shown) => !shown)}>{showAllActivities ? "Show fewer activities" : "View all activities"} <ChevronRight aria-hidden="true" /></button> : null}
        </section>
      </> : null}
    </div>
  );
}

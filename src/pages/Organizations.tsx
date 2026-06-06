import { AlertCircle, Building2, CalendarDays, FileText, Filter, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { YouthOrganization } from "@/lib/youthCatalog";
import { fetchOrganizations } from "@/lib/data-api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Organizations() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "partner">("active");
  const [organizations, setOrganizations] = useState<YouthOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<YouthOrganization | null>(null);

  const loadOrganizations = async () => {
    setIsLoadingOrgs(true);
    setErrorMessage(null);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data);
    } catch {
      setErrorMessage("Unable to load organizations right now. Please try again.");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  const filtered = useMemo(
    () =>
      organizations.filter(
        (org) =>
          org.status === tab &&
          (org.name.toLowerCase().includes(search.toLowerCase()) ||
            org.type.toLowerCase().includes(search.toLowerCase()) ||
            org.focus.toLowerCase().includes(search.toLowerCase()) ||
            (org.overview ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (org.location ?? "").toLowerCase().includes(search.toLowerCase())),
      ),
    [organizations, search, tab],
  );

  const showValue = (value?: string | null) => {
    const text = (value ?? "").trim();
    return text.length > 0 ? text : "N/A";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <PageHero
          align="center"
          title="Youth Organizations"
          description="Prototype organization records are shown for system demonstration and testing purposes."
          titleClassName="mb-3 sm:mb-4"
        />

        <section className="py-6 sm:py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Button variant={tab === "active" ? "default" : "outline"} size="sm" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" onClick={() => setTab("active")}>
                  Active
                </Button>
                <Button variant={tab === "partner" ? "default" : "outline"} size="sm" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm" onClick={() => setTab("partner")}>
                  Partners
                </Button>
              </div>
            </div>

            {isLoadingOrgs ? (
              <div className="text-center py-12 sm:py-16 text-muted-foreground">
                <p className="text-sm">Loading organizations...</p>
              </div>
            ) : errorMessage ? (
              <div className="text-center py-12 sm:py-16 text-muted-foreground">
                <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-destructive/70" />
                <p className="text-lg font-medium text-foreground">Could not load organization records</p>
                <p className="mt-2 mb-5 text-sm">{errorMessage}</p>
                <Button variant="outline" onClick={() => void loadOrganizations()}>Retry</Button>
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6 items-stretch">
                {filtered.map((org) => (
                  <div
                    key={org.id}
                    className="h-full rounded-lg border border-border bg-card p-4 sm:p-5 card-shadow hover:card-shadow-hover transition-all duration-200 flex flex-col"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-4">
                      <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-primary/10 text-primary">
                        {showValue(org.category ?? org.type)}
                      </span>
                      <span className="text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-muted text-foreground/80">
                        {org.status === "partner" ? "Partner" : org.status === "pending" ? "Pending" : org.status === "inactive" ? "Inactive" : "Active"}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-foreground text-base sm:text-lg leading-snug mb-1.5 sm:mb-2 min-h-[2.5rem] sm:min-h-[3.25rem] line-clamp-2">{org.name}</h3>
                    <p className="text-muted-foreground text-sm mb-3 sm:mb-4 leading-5 sm:leading-6 min-h-[2.8rem] sm:min-h-[3rem] line-clamp-2">{org.overview ?? org.focus}</p>
                    <div className="space-y-2 text-sm text-muted-foreground mb-3 sm:mb-4 border-t border-border pt-3 sm:pt-4">
                      <span className="flex items-center gap-2.5">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        {showValue(org.type)}
                      </span>
                      <span className="flex items-start gap-2.5">
                        <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0 text-primary" />
                        {showValue(org.sourceTag)}
                      </span>
                      {(org.coverageArea || org.location) && (
                        <span className="flex items-start gap-2.5">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0 text-primary" />
                          {showValue(org.coverageArea ?? org.location)}
                        </span>
                      )}
                      {org.sourcePostUrl && (
                        <a
                          href={org.sourcePostUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2.5 font-semibold text-primary hover:text-primary/80"
                        >
                          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          Reference Link
                        </a>
                      )}
                    </div>
                    <Button size="sm" className="w-full h-10 sm:h-9 mt-auto" onClick={() => setSelectedOrganization(org)}>
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      View Organization Info
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16 text-muted-foreground">
                <Filter className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-40" />
                <p className="text-lg font-medium">No organizations found</p>
              </div>
            )}

            <div className="mt-7 sm:mt-10 bg-muted/40 border rounded-lg p-3 sm:p-4 text-sm text-muted-foreground flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Organization list uses prototype data for demonstration and testing purposes.
              </p>
            </div>
          </div>
        </section>
      </div>
      <Dialog open={Boolean(selectedOrganization)} onOpenChange={(open) => !open && setSelectedOrganization(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedOrganization ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl pr-8">{selectedOrganization.name}</DialogTitle>
                <DialogDescription>{showValue(selectedOrganization.category ?? selectedOrganization.type)}</DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-5 text-sm">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Description / Overview</h4>
                    <p className="text-muted-foreground leading-6">{showValue(selectedOrganization.overview ?? selectedOrganization.focus)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Mission / Purpose / Objectives</h4>
                    <p className="text-muted-foreground leading-6">
                      {showValue(selectedOrganization.mission ?? selectedOrganization.objectives)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Initiatives / Projects / Activities</h4>
                    <p className="text-muted-foreground leading-6">
                      {showValue(selectedOrganization.programs ?? selectedOrganization.activities ?? selectedOrganization.relatedInitiatives)}
                    </p>
                    {selectedOrganization.relatedInitiativesList && selectedOrganization.relatedInitiativesList.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {selectedOrganization.relatedInitiativesList.map((initiative, index) => (
                          <li key={`${initiative.name}-${index}`} className="leading-6">
                            {initiative.name}
                            {initiative.year ? ` (${initiative.year})` : ""}
                            {initiative.sourceUrl ? (
                              <>
                                {" - "}
                                <a
                                  href={initiative.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-primary hover:text-primary/80"
                                >
                                  Source
                                </a>
                              </>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Target Beneficiaries</h4>
                    <p className="text-muted-foreground leading-6">{showValue(selectedOrganization.targetBeneficiaries)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Location / Coverage Area</h4>
                    <p className="text-muted-foreground leading-6">{showValue(selectedOrganization.coverageArea ?? selectedOrganization.location)}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Contact Information</h4>
                    <p className="text-muted-foreground leading-6">
                      {showValue(
                        [selectedOrganization.contactPerson, selectedOrganization.contactEmail, selectedOrganization.contactPhone]
                          .filter((value) => value && value.trim().length > 0)
                          .join(" | "),
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Related Activity Date / Year</h4>
                    <p className="text-muted-foreground leading-6 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                      {showValue(selectedOrganization.activityYear ?? selectedOrganization.sourceDate)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Source Name:</span>{" "}
                  {showValue(selectedOrganization.sourceName)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Reference:</span>{" "}
                  {selectedOrganization.sourcePostUrl ? (
                    <a
                      href={selectedOrganization.sourcePostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Source Link
                    </a>
                  ) : (
                    "N/A"
                  )}
                </p>
                {selectedOrganization.sourceLinks && selectedOrganization.sourceLinks.length > 0 ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Additional References:</p>
                    {selectedOrganization.sourceLinks.map((source, index) => (
                      <a
                        key={`${source.url}-${index}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-primary hover:text-primary/80 font-medium"
                      >
                        {source.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

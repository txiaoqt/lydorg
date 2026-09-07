import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  ExternalLink,
  Globe,
  Award,
  CalendarDays,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PortalPublicProfilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  profileStatus?: string;
  profile: {
    majorClassification?: string;
    subClassification?: string;
    district?: string;
    barangay?: string;
    representativeName?: string;
    adviserName?: string;
    facebookPageUrl?: string;
    profileImageUrl?: string;
    advocacies?: string[];
    [key: string]: any;
  };
  profileSubClass: string;
  displayUrn?: string;
  profilePercent: number;
  joinedYpopEvents?: Array<any>;
  formatShortPortalDate: (dateStr: string) => string;
}

// Format URL concisely for civic/institutional presentation without overflowing
const formatDisplayUrl = (url?: string): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    const search = parsed.search ? parsed.search : "";
    const full = `${host}${pathname}${search}`;
    return full.length > 42 ? `${full.slice(0, 39)}...` : full;
  } catch {
    return url.length > 42 ? `${url.slice(0, 39)}...` : url;
  }
};

// Compute clean organization initials for graceful avatar fallback
const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return "YO";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const PortalPublicProfilePreviewDialog: React.FC<
  PortalPublicProfilePreviewDialogProps
> = ({
  open,
  onOpenChange,
  profileName,
  profileStatus,
  profile,
  profileSubClass,
  displayUrn,
  profilePercent,
  joinedYpopEvents = [],
  formatShortPortalDate,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever profile image URL changes
  useEffect(() => {
    setImageError(false);
  }, [profile?.profileImageUrl]);

  const hasAdvocacies = Array.isArray(profile?.advocacies) && profile.advocacies.length > 0;
  const recentEvents = (joinedYpopEvents || []).slice(0, 3);
  const initials = getInitials(profileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={true}
        className="max-w-[95vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xl transition-all"
      >
        <div className="flex flex-col max-h-[88vh] sm:max-h-[85vh]">
          {/* 1. CIVIC MODAL HEADER BAR */}
          <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-border/60 flex items-start justify-between gap-4 shrink-0 bg-muted/20">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider font-mono">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>Pasig City Youth Registry Record</span>
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Public Profile Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Simulated public view reflecting verified credentials currently on file with PCYDO.
              </DialogDescription>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close preview dialog"
              className="h-8 w-8 rounded-xl border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* SCROLLABLE PREVIEW BODY */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain">
            {/* 2. PRIMARY ORGANIZATION IDENTITY */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Civic Seal / Avatar Container with Graceful Image Error Handling */}
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs overflow-hidden mt-0.5 sm:mt-0">
                  {profile?.profileImageUrl && !imageError ? (
                    <img
                      src={profile.profileImageUrl}
                      alt={profileName}
                      onError={() => setImageError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 select-none">
                      <span className="text-base sm:text-lg font-bold text-primary tracking-tight">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Identity Text Hierarchy */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-full">
                      {profileName}
                    </h2>
                    <div className="shrink-0">
                      <PortalStatusBadge status={profileStatus} />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium flex flex-wrap items-center gap-1.5">
                    <span>{profile?.majorClassification || "Youth Organization"}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{profileSubClass}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/90 flex items-center gap-1.5 pt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {profile?.barangay || "Pasig City"}, {profile?.district || "District I"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Restrained Registry Status Indicator */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Registry Status
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/70 text-xs font-semibold text-foreground shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{profilePercent}% Verified</span>
                </div>
              </div>
            </div>

            {/* 3. VERIFIED INSTITUTIONAL INFORMATION (CLEAN EDITORIAL SECTION) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Verified Institutional Information</span>
              </div>

              <div className="bg-card rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4">
                {/* Leadership Details */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                  <div className="space-y-0.5">
                    <dt className="text-[11px] font-semibold text-muted-foreground">
                      Authorized Representative
                    </dt>
                    <dd className="font-bold text-foreground text-sm flex items-center gap-1.5 pt-0.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">
                        {profile?.representativeName || "Unassigned Representative"}
                      </span>
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[11px] font-semibold text-muted-foreground">
                      Organization Adviser
                    </dt>
                    <dd className="font-bold text-foreground text-sm flex items-center gap-1.5 pt-0.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate">
                        {profile?.adviserName || "Unassigned Adviser"}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="h-px bg-border/40" />

                {/* Core Registry Location & Classification */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                  <div className="space-y-0.5">
                    <dt className="text-[11px] font-semibold text-muted-foreground">
                      Jurisdiction / Location
                    </dt>
                    <dd className="font-bold text-foreground text-xs sm:text-sm pt-0.5">
                      {profile?.barangay || "Pasig City"}, {profile?.district || "District I"}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[11px] font-semibold text-muted-foreground">
                      Classification
                    </dt>
                    <dd className="font-bold text-foreground text-xs sm:text-sm pt-0.5 truncate">
                      {profile?.majorClassification || "Youth Organization"} ({profileSubClass})
                    </dd>
                  </div>

                  {displayUrn && displayUrn !== "Not required" && (
                    <div className="space-y-1 sm:col-span-2 pt-1">
                      <dt className="text-[11px] font-semibold text-muted-foreground">
                        Unique Registration Number (URN)
                      </dt>
                      <dd>
                        <span className="font-mono text-xs font-bold text-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/60 inline-block tracking-wide">
                          {displayUrn}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Advocacy Focus Areas (Restrained Tag List) */}
                {hasAdvocacies && (
                  <>
                    <div className="h-px bg-border/40" />
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Advocacy Focus Areas
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.advocacies!.map((adv: string) => (
                          <span
                            key={adv}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted/40 text-[11px] font-medium text-foreground/85 border border-border/50 hover:bg-muted/70 transition-colors"
                          >
                            {adv}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 4. PUBLIC CHANNELS & SOCIAL PRESENCE */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>Public Channels & Contact</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <Globe className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-foreground">Official Facebook Page</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[280px] sm:max-w-[360px]">
                      {formatDisplayUrl(profile?.facebookPageUrl) || "No public social page linked"}
                    </p>
                  </div>
                </div>

                {profile?.facebookPageUrl ? (
                  <a
                    href={profile.facebookPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all duration-150 active:scale-[0.98] shrink-0"
                  >
                    <span>Visit Page</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground italic shrink-0 self-start sm:self-auto">
                    Not provided
                  </span>
                )}
              </div>
            </div>

            {/* 5. RECENT CITY-LED ACTIVITIES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span>Recent City-Led Activities</span>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Verified YPOP Records
                </span>
              </div>

              {recentEvents.length === 0 ? (
                <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 text-center text-xs text-muted-foreground italic">
                  No recent city-led YPOP activities recorded for this organization.
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/50 overflow-hidden shadow-2xs">
                  {recentEvents.map((act: any) => (
                    <div
                      key={act.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate">
                          {act.title || act.activityName}
                        </p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          <span>
                            {act.date ? formatShortPortalDate(act.date) : "Recently"}
                          </span>
                          <span>•</span>
                          <span className="truncate">{act.organizer || "PCYDO"}</span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. CIVIC FOOTER BAR */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-border/60 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 bg-muted/20">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Pasig City Youth Development Office • Y-TRACE Registry</span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-8.5 px-4 text-xs font-bold border-border/80 hover:bg-muted cursor-pointer active:scale-[0.98] transition-all"
            >
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

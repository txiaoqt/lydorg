import React, { useState } from "react";
import {
  type OrganizationProfile,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventFile,
  type YPOPEventParticipation,
  type YPOPFile,
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import { FeatureGate } from "./FeatureGate";
import { YpopSemesterList } from "./ypop/YpopSemesterList";
import { YpopSemesterWorkspace } from "./ypop/YpopSemesterWorkspace";

export interface UserPortalYPOPWorkspaceViewProps {
  initialSemesterKey?: string | null;
  ypopWorkflowEligibility?: {
    canEditParticipation?: boolean;
    profileComplete?: boolean;
    requirements?: string[];
  };
  currentProfile: OrganizationProfile | null;
  ypopPeriods?: YPOPPeriod[];
  ypopEntries?: YPOPEntry[];
  ypopCityActivities?: YPOPCityActivity[];
  ypopEventParticipations?: YPOPEventParticipation[];
  ypopEventFiles?: YPOPEventFile[];
  ypopFiles?: YPOPFile[];
  ypopOrgActivities?: YPOPOrgActivity[];
  ypopOrgActivityFiles?: YPOPOrgActivityFile[];
  activeEntry?: YPOPEntry | null;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  openFile?: (url: string, name: string) => void;
  formatDateTimeLabel?: (dateStr: string) => string;
  formatShortPortalDate: (dateStr: string) => string;
  setYpopOrgActivityModalOpen?: (open: boolean) => void;
  user?: { id?: string; email?: string } | null;
  createYPOPEntry?: (entry: YPOPEntry) => void;
  updateYPOPEntry?: (id: string, patch: Partial<YPOPEntry>) => void;
  createYPOPEventParticipation?: (participation: YPOPEventParticipation) => void;
  updateYPOPEventParticipation?: (id: string, patch: Partial<YPOPEventParticipation>) => void;
  createYPOPEventFile?: (file: YPOPEventFile) => void;
  deleteYPOPEventFile?: (id: string) => void;
  createYPOPOrgActivity?: (activity: YPOPOrgActivity) => void;
  updateYPOPOrgActivity?: (id: string, patch: Partial<YPOPOrgActivity>) => void;
  deleteYPOPOrgActivity?: (id: string) => void;
  createYPOPOrgActivityFile?: (file: YPOPOrgActivityFile) => void;
  deleteYPOPOrgActivityFile?: (id: string) => void;
}

export const UserPortalYPOPWorkspaceView: React.FC<UserPortalYPOPWorkspaceViewProps> = ({
  initialSemesterKey,
  ypopWorkflowEligibility,
  currentProfile,
  ypopPeriods: propsPeriods,
  ypopEntries: propsEntries,
  ypopCityActivities: propsCityActivities,
  ypopEventParticipations: propsEventParticipations,
  ypopEventFiles: propsEventFiles,
  ypopOrgActivities: propsOrgActivities,
  ypopOrgActivityFiles: propsOrgActivityFiles,
  activeEntry,
  navigate,
  userRouteMap,
  formatShortPortalDate,
  user,
  createYPOPEntry = () => {},
  updateYPOPEntry = () => {},
  createYPOPEventParticipation = () => {},
  updateYPOPEventParticipation = () => {},
  createYPOPEventFile = () => {},
  deleteYPOPEventFile = () => {},
  createYPOPOrgActivity = () => {},
  updateYPOPOrgActivity = () => {},
  deleteYPOPOrgActivity = () => {},
  createYPOPOrgActivityFile = () => {},
  deleteYPOPOrgActivityFile = () => {},
}) => {
  const periods = propsPeriods ?? [];
  const entries = propsEntries ?? [];
  const cityActivities = propsCityActivities ?? [];
  const participations = propsEventParticipations ?? [];
  const eventFiles = propsEventFiles ?? [];
  const orgActivities = propsOrgActivities ?? [];
  const orgActivityFiles = propsOrgActivityFiles ?? [];

  const organizationId = currentProfile?.id ?? "";
  const userId = user?.id ?? currentProfile?.userId ?? "";

  // Semester selection state
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string | null>(() => {
    if (initialSemesterKey !== undefined) {
      return initialSemesterKey;
    }
    if (typeof window !== "undefined" && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const sem = params.get("semester");
        if (sem && periods.some((p) => p.semesterKey === sem)) {
          return sem;
        }
      } catch {
        /* ignore invalid url state */
      }
    }
    return null;
  });

  const handleSelectSemester = (semesterKey: string) => {
    setSelectedSemesterKey(semesterKey);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("semester", semesterKey);
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore history state errors */
      }
    }
  };

  const handleBackToSemesters = () => {
    setSelectedSemesterKey(null);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("semester");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore history state errors */
      }
    }
  };

  const isYpopEligible = Boolean(
    ypopWorkflowEligibility ? ypopWorkflowEligibility.canEditParticipation : true
  );

  const nextYpopStepAction = !ypopWorkflowEligibility?.profileComplete
    ? "Complete Profile"
    : "View Registration Status";

  const nextYpopStepRoute = !ypopWorkflowEligibility?.profileComplete
    ? userRouteMap["organization-profile"]
    : userRouteMap["document-submission"];

  const selectedPeriod = selectedSemesterKey
    ? periods.find((p) => p.semesterKey === selectedSemesterKey) ?? null
    : null;

  const selectedEntry = selectedPeriod
    ? entries.find(
        (e) => e.organizationId === organizationId && e.semester === selectedPeriod.semesterKey
      ) ?? null
    : null;

  return (
    <FeatureGate
      canAccess={isYpopEligible}
      title="Complete registration requirements first"
      description="Your organization must complete registration before participating in YPOP incentive scoring."
      requirements={ypopWorkflowEligibility?.requirements || []}
      actionLabel={nextYpopStepAction}
      onAction={() => navigate(nextYpopStepRoute)}
      heroSection={
        <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">YPOP Workspace</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground">{currentProfile?.organizationName || "LYDO Pasig City"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Youth Participation Organization Passport (YPOP)
              </h1>
              <p className="text-sm text-muted-foreground">
                Track qualification progress, submit PPA organization activities, and monitor incentive tiers.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans max-w-[1440px] mx-auto pt-0 pb-4">
        {selectedPeriod ? (
          <YpopSemesterWorkspace
            period={selectedPeriod}
            allPeriods={periods}
            entry={selectedEntry}
            allEntries={entries}
            cityActivities={cityActivities}
            participations={participations}
            eventFiles={eventFiles}
            orgActivities={orgActivities}
            orgActivityFiles={orgActivityFiles}
            profile={currentProfile}
            organizationId={organizationId}
            userId={userId}
            canEditParticipation={isYpopEligible}
            userRouteMap={userRouteMap}
            navigate={navigate}
            formatShortPortalDate={formatShortPortalDate}
            onBack={handleBackToSemesters}
            onEntryUpdated={(saved) => {
              const exists = entries.some((e) => e.id === saved.id);
              if (exists) {
                updateYPOPEntry(saved.id, saved);
              } else {
                createYPOPEntry(saved);
              }
            }}
            onParticipationCreated={(created) => {
              createYPOPEventParticipation(created);
            }}
            onParticipationUpdated={(updated) => {
              updateYPOPEventParticipation(updated.id, updated);
            }}
            onEventFileCreated={(file) => {
              createYPOPEventFile(file);
            }}
            onEventFileDeleted={(fileId) => {
              deleteYPOPEventFile(fileId);
            }}
            onOrgActivitySaved={(saved) => {
              const exists = orgActivities.some((a) => a.id === saved.id);
              if (exists) {
                updateYPOPOrgActivity(saved.id, saved);
              } else {
                createYPOPOrgActivity(saved);
              }
            }}
            onOrgActivityDeleted={(activityId) => {
              deleteYPOPOrgActivity(activityId);
            }}
            onOrgFileCreated={(file) => {
              createYPOPOrgActivityFile(file);
            }}
            onOrgFileDeleted={(fileId) => {
              deleteYPOPOrgActivityFile(fileId);
            }}
          />
        ) : (
          <YpopSemesterList
            periods={periods}
            entries={entries}
            cityActivities={cityActivities}
            participations={participations}
            orgActivities={orgActivities}
            organizationId={organizationId}
            onSelectSemester={handleSelectSemester}
            formatShortPortalDate={formatShortPortalDate}
          />
        )}
      </div>
    </FeatureGate>
  );
};

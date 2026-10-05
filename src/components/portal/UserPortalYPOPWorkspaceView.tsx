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
import { invalidateOrganizationYpopQueries, loadOrganizationYpopSemesterData, subscribeToOrganizationStatusChangesInSupabase } from "@/lib/lydo-connect-supabase";
import { FeatureGate } from "./FeatureGate";
import { YpopSemesterList } from "./ypop/YpopSemesterList";
import { YpopSemesterWorkspace } from "./ypop/YpopSemesterWorkspace";

export interface UserPortalYPOPWorkspaceViewProps {
  initialSemesterKey?: string | null;
  loadRemoteData?: boolean;
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
  loadRemoteData = false,
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
  const [workspaceData, setWorkspaceData] = React.useState<Awaited<ReturnType<typeof loadOrganizationYpopSemesterData>> | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(false);
  const [workspaceError, setWorkspaceError] = React.useState("");
  const [workspaceRefreshVersion, setWorkspaceRefreshVersion] = React.useState(0);
  const participationMutationVersionRef = React.useRef(0);

  // Check for deep-linked activityId in URL
  const deepLinkedActivityId = React.useMemo(() => {
    if (typeof window !== "undefined" && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        return params.get("activityId");
      } catch {
        return null;
      }
    }
    return null;
  }, []);

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
        const actId = params.get("activityId");
        if (actId) {
          const matched = cityActivities.find((a) => a.id === actId);
          if (matched && periods.some((p) => p.semesterKey === matched.semesterKey)) {
            return matched.semesterKey;
          }
        }
      } catch {
        /* ignore invalid url state */
      }
    }
    return null;
  });

  // Automatically select semester if deep-linked activity is loaded asynchronously
  React.useEffect(() => {
    if (deepLinkedActivityId && !selectedSemesterKey && cityActivities.length > 0) {
      const matched = cityActivities.find((a) => a.id === deepLinkedActivityId);
      if (matched && periods.some((p) => p.semesterKey === matched.semesterKey)) {
        setSelectedSemesterKey(matched.semesterKey);
      }
    }
  }, [deepLinkedActivityId, selectedSemesterKey, cityActivities, periods]);

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

  React.useEffect(() => {
    if (!loadRemoteData || !organizationId || !selectedSemesterKey) {
      setWorkspaceData(null);
      setWorkspaceLoading(false);
      setWorkspaceError("");
      return;
    }
    let active = true;
    const mutationVersion = participationMutationVersionRef.current;
    setWorkspaceLoading(true);
    setWorkspaceError("");
    void loadOrganizationYpopSemesterData(organizationId, selectedSemesterKey)
      .then((data) => {
        if (!active || mutationVersion !== participationMutationVersionRef.current) return;
        setWorkspaceData((current) => {
          if (!current || current.period?.semesterKey !== selectedSemesterKey) return data;
          // A request started during upload may contain the intermediate draft.
          // Keep a newer saved mutation response until the server catches up.
          const currentById = new Map(current.participations.map((participation) => [participation.id, participation]));
          return {
            ...data,
            participations: data.participations.map((incoming) => {
              const saved = currentById.get(incoming.id);
              return saved && Date.parse(saved.updatedAt) > Date.parse(incoming.updatedAt) ? saved : incoming;
            }),
          };
        });
      })
      .catch((error) => {
        if (!active || (error && typeof error === "object" && "name" in error && error.name === "CancelledError")) return;
        setWorkspaceError(error instanceof Error ? error.message : "Unable to load this semester.");
      })
      .finally(() => { if (active) setWorkspaceLoading(false); });
    return () => { active = false; };
  }, [loadRemoteData, organizationId, selectedSemesterKey, workspaceRefreshVersion]);

  // A workspace refetch creates a new activities array even when its IDs did
  // not change. Keep the Realtime subscription stable across those refreshes.
  const selectedActivityIdsKey = (workspaceData?.cityActivities ?? [])
    .map((activity) => activity.id)
    .sort()
    .join(",");
  React.useEffect(() => {
    if (!loadRemoteData || !organizationId || !selectedSemesterKey) return;
    const onStatus = (status: string, error?: Error | null) => {
      if (import.meta.env.DEV && status === "SUBSCRIBED") console.debug("Organization YPOP status channel subscribed.");
      else if (import.meta.env.DEV && ["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) console.warn("Organization YPOP status channel:", status, error ?? "");
    };
    const refresh = () => setWorkspaceRefreshVersion((version) => version + 1);
    const cleanups = [
      subscribeToOrganizationStatusChangesInSupabase({
        organizationId, feature: "ypop_city_led", semesterKey: selectedSemesterKey,
        activityIds: selectedActivityIdsKey ? selectedActivityIdsKey.split(",") : [], detailId: null, onChange: refresh, onStatus,
      }),
      subscribeToOrganizationStatusChangesInSupabase({
        organizationId, feature: "ypop_org_led", semesterKey: selectedSemesterKey,
        entryId: workspaceData?.entry?.id, onChange: refresh, onStatus,
      }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [loadRemoteData, organizationId, selectedSemesterKey, selectedActivityIdsKey, workspaceData?.entry?.id]);

  const refreshWorkspaceData = async () => {
    await invalidateOrganizationYpopQueries(organizationId, selectedSemesterKey ?? undefined, workspaceData?.entry?.id);
    setWorkspaceRefreshVersion((value) => value + 1);
  };

  const selectedEntry = loadRemoteData
    ? workspaceData?.entry ?? null
    : selectedPeriod
      ? entries.find(
        (e) => e.organizationId === organizationId && e.semester === selectedPeriod.semesterKey
      ) ?? null
      : null;
  const hasCurrentWorkspaceData = workspaceData?.period?.semesterKey === selectedSemesterKey;

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
                <span className="text-xs text-muted-foreground">{currentProfile?.organizationName || "PCYDO"}</span>
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
      <div className="bg-background text-foreground transition-colors duration-200 font-sans max-w-[1440px] mx-auto pt-2 sm:pt-0 pb-4">
        {selectedPeriod ? (
          loadRemoteData && workspaceLoading && !hasCurrentWorkspaceData ? (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">Loading semester data…</div>
          ) : loadRemoteData && workspaceError && !hasCurrentWorkspaceData ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Unable to load this semester: {workspaceError}</div>
          ) : loadRemoteData && !workspaceData ? null : (
          <>
          {loadRemoteData && workspaceError ? (
            <div role="status" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              We couldn’t refresh the latest YPOP data. Your current workspace remains open.
            </div>
          ) : null}
          <YpopSemesterWorkspace
            period={loadRemoteData ? workspaceData?.period ?? selectedPeriod : selectedPeriod}
            allPeriods={periods}
            entry={selectedEntry}
            allEntries={loadRemoteData ? (selectedEntry ? [selectedEntry] : []) : entries}
            cityActivities={loadRemoteData ? workspaceData?.cityActivities ?? [] : cityActivities}
            initialActivityId={deepLinkedActivityId}
            participations={loadRemoteData ? workspaceData?.participations ?? [] : participations}
            eventFiles={loadRemoteData ? [] : eventFiles}
            orgActivities={loadRemoteData ? [] : orgActivities}
            orgActivityFiles={loadRemoteData ? [] : orgActivityFiles}
            orgActivitySummary={loadRemoteData ? workspaceData?.orgActivitySummary : undefined}
            serverPaginatedOrgActivities={loadRemoteData}
            dataRefreshKey={workspaceRefreshVersion}
            loadFilesOnOpen={loadRemoteData}
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
              if (loadRemoteData) refreshWorkspaceData();
            }}
            onParticipationCreated={(created) => {
              createYPOPEventParticipation(created);
              if (loadRemoteData) refreshWorkspaceData();
            }}
            onParticipationUpdated={(updated) => {
              participationMutationVersionRef.current += 1;
              setWorkspaceData((current) => {
                if (!current) return current;
                const exists = current.participations.some((participation) => participation.id === updated.id);
                return {
                  ...current,
                  participations: exists
                    ? current.participations.map((participation) => participation.id === updated.id ? updated : participation)
                    : [updated, ...current.participations],
                };
              });
              const exists = participations.some((p) => p.id === updated.id);
              if (exists) {
                updateYPOPEventParticipation(updated.id, updated);
              } else {
                createYPOPEventParticipation(updated);
              }
              if (loadRemoteData) refreshWorkspaceData();
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
              if (loadRemoteData) refreshWorkspaceData();
            }}
            onOrgActivityDeleted={(activityId) => {
              deleteYPOPOrgActivity(activityId);
              if (loadRemoteData) refreshWorkspaceData();
            }}
            onOrgFileCreated={(file) => {
              createYPOPOrgActivityFile(file);
            }}
            onOrgFileDeleted={(fileId) => {
              deleteYPOPOrgActivityFile(fileId);
            }}
          />
          </>
          )
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
            loadEntriesRemotely={loadRemoteData}
          />
        )}
      </div>
    </FeatureGate>
  );
};

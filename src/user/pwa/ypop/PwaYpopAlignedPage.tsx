import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadOrganizationYpopEntryById } from "@/lib/lydo-connect-supabase";
import { UserPortalYPOPWorkspaceView } from "@/components/portal/UserPortalYPOPWorkspaceView";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PWA_ROUTES } from "../pwaRoutes";

/** The website owns the city-led and organization-led submission workflow. */
export function PwaYpopAlignedPage({ data }: { data: ReturnType<typeof usePwaPortalData> }) {
  const { go } = usePwaNavigation();
  const { entryId, periodId } = useParams();
  const state = data.store.state;
  const organizationId = data.profile?.id ?? "";
  const entryQuery = useQuery({ queryKey: ["user", organizationId, "ypop-entry-pwa", entryId], queryFn: () => loadOrganizationYpopEntryById(organizationId, entryId!), enabled: Boolean(organizationId && entryId) });
  const entry = entryQuery.data ?? state.ypopEntries.find((item) => item.id === entryId && item.organizationId === organizationId);
  const period = state.ypopPeriods.find((item) => item.id === periodId || item.semesterKey === entry?.semester);
  const semester = entry?.semester ?? period?.semesterKey ?? null;
  if (entryQuery.isLoading) return <p role="status" className="pwa-card">Loading YPOP semester…</p>;
  if (entryQuery.isError) return <section className="pwa-card"><p role="alert">This YPOP semester could not be loaded.</p><button className="pwa-secondary-button" onClick={() => void entryQuery.refetch()}>Try again</button></section>;
  return (
    <div className="pwa-shared-workspace pwa-ypop-aligned">
      <UserPortalYPOPWorkspaceView
        key={semester ?? "semesters"}
        initialSemesterKey={semester ?? undefined}
        loadRemoteData
        currentProfile={data.profile}
        user={data.user}
        ypopWorkflowEligibility={{ canEditParticipation: data.ypopWorkflowEligibility.canEditParticipation, profileComplete: data.ypopWorkflowEligibility.profileComplete }}
        ypopPeriods={state.ypopPeriods}
        ypopEntries={state.ypopEntries}
        ypopCityActivities={state.ypopCityActivities}
        ypopEventParticipations={state.ypopEventParticipations}
        ypopEventFiles={state.ypopEventFiles}
        ypopOrgActivities={state.ypopOrgActivities}
        ypopOrgActivityFiles={state.ypopOrgActivityFiles}
        navigate={go}
        userRouteMap={{ "organization-profile": PWA_ROUTES.profile, "document-submission": PWA_ROUTES.documents, ypop: PWA_ROUTES.ypop }}
        formatShortPortalDate={(value) => new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        createYPOPEntry={data.store.createYPOPEntry}
        updateYPOPEntry={data.store.updateYPOPEntry}
        createYPOPEventParticipation={data.store.createYPOPEventParticipation}
        updateYPOPEventParticipation={data.store.updateYPOPEventParticipation}
        createYPOPEventFile={data.store.createYPOPEventFile}
        deleteYPOPEventFile={data.store.deleteYPOPEventFile}
        createYPOPOrgActivity={data.store.createYPOPOrgActivity}
        updateYPOPOrgActivity={data.store.updateYPOPOrgActivity}
        deleteYPOPOrgActivity={data.store.deleteYPOPOrgActivity}
        createYPOPOrgActivityFile={data.store.createYPOPOrgActivityFile}
        deleteYPOPOrgActivityFile={data.store.deleteYPOPOrgActivityFile}
      />
    </div>
  );
}

import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FileText, UserRoundCheck } from "lucide-react";
import { isOrganizationProfileComplete } from "@/lib/organization-profile-domain";
import { PwaAppShell } from "./PwaAppShell";
import { PwaMorePage } from "./PwaMorePage";
import { PwaAboutPage, PwaContactPage, PwaFaqPage, PwaLegalPage } from "./PwaInformationPages";
import PwaDashboard from "./dashboard/PwaDashboard";
import { usePwaPortalData } from "./hooks/usePwaPortalData";
import {
  PwaActivity, PwaCompliance, PwaInquiries, PwaNews, PwaNotifications,
  PwaTransparency,
} from "./PwaResourcePages";
import { PwaProfileEdit, PwaProfilePage, PwaProfilePublicPreview } from "./profile/PwaProfilePages";
import { PwaOrganizationDirectory, PwaOrganizationDirectoryProfile } from "./profile/PwaOrganizationDirectory";
import { PwaTemplateLibrary, PwaTemplatePreview } from "./templates/PwaTemplatePages";
import { PwaYpopPage } from "./ypop/PwaYpopPage";
import { PwaYpopPpaEditor, PwaYpopPpaList, PwaYpopWorkspace } from "./ypop/PwaYpopWorkspace";
import {
  PwaDocumentDetail, PwaDocumentList, PwaDocumentManager,
} from "./documents/PwaDocumentPages";
import {
  PwaBudgetDetail, PwaBudgetForm, PwaBudgetList,
} from "./budgets/PwaBudgetPages";
import {
  PwaLiquidationDetail, PwaLiquidationList, PwaLiquidationManager,
} from "./liquidations/PwaLiquidationPages";
import { getPwaPageTitle, PWA_ROUTES } from "./pwaRoutes";
import { usePwaNavigation } from "./hooks/usePwaNavigation";
import { usePwaPreferences } from "./hooks/usePwaPreferences";
import {
  PwaAccountSettings,
  PwaAppearanceSettings,
  PwaAppPreferences,
  PwaNotificationSettings,
  PwaSettingsMain,
  PwaStorageSettings,
} from "./settings/PwaSettingsPages";
import "./styles/pwa-app.css";

function PwaDocumentAccessGuard({ data, children }: {
  data: ReturnType<typeof usePwaPortalData>;
  children: ReactNode;
}) {
  const { go } = usePwaNavigation();
  if (isOrganizationProfileComplete(data.profile)) return <>{children}</>;

  return (
    <div className="pwa-stack pwa-document-profile-gate">
      <section className="pwa-card">
        <span className="pwa-record-icon"><FileText aria-hidden="true" /></span>
        <div>
          <h2>Complete your profile first</h2>
          <p>Finish and save all required organization information before accessing document submission.</p>
          <div className="pwa-profile-progress" role="progressbar" aria-label="Profile completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.profilePercent}>
            <span style={{ width: `${data.profilePercent}%` }} />
          </div>
          <small>{data.profilePercent}% complete</small>
        </div>
      </section>
      <button type="button" className="pwa-primary-button" onClick={() => go(PWA_ROUTES.profileEdit)}>
        <UserRoundCheck aria-hidden="true" /> Complete Profile
      </button>
    </div>
  );
}

export default function PwaUserPortal() {
  const data = usePwaPortalData();
  const { pathname } = useLocation();
  const title = getPwaPageTitle(pathname);
  const { go } = usePwaNavigation();
  const { preferences } = usePwaPreferences();

  useEffect(() => {
    const launchKey = "ytrace-pwa-launch-routed";
    if (window.sessionStorage.getItem(launchKey)) return;
    window.sessionStorage.setItem(launchKey, "1");
    if (pathname !== PWA_ROUTES.home || preferences.defaultLanding === "home") return;
    const target = {
      documents: PWA_ROUTES.documents,
      budget: PWA_ROUTES.budgets,
      liquidation: PWA_ROUTES.liquidations,
    }[preferences.defaultLanding];
    if (target) go(target, { replace: true });
  }, [go, pathname, preferences.defaultLanding]);

  return (
    <PwaAppShell
      title={title}
      organizationName={data.organizationName}
      profileImageUrl={data.profile?.profileImageUrl}
      unreadCount={data.unreadCount}
      dashboard={pathname === PWA_ROUTES.home}
    >
      <Routes>
        <Route index element={<PwaDashboard data={data} />} />
        <Route path="documents" element={<PwaDocumentAccessGuard data={data}><PwaDocumentList data={data} /></PwaDocumentAccessGuard>} />
        <Route path="documents/manage" element={<PwaDocumentAccessGuard data={data}><PwaDocumentManager data={data} /></PwaDocumentAccessGuard>} />
        <Route path="documents/:documentId" element={<PwaDocumentAccessGuard data={data}><PwaDocumentDetail data={data} /></PwaDocumentAccessGuard>} />
        <Route path="budgets" element={<PwaBudgetList data={data} />} />
        <Route path="budgets/new" element={<PwaBudgetForm data={data} mode="new" />} />
        <Route path="budgets/:requestId" element={<PwaBudgetDetail data={data} />} />
        <Route path="budgets/:requestId/edit" element={<PwaBudgetForm data={data} mode="edit" />} />
        <Route path="liquidations" element={<PwaLiquidationList data={data} />} />
        <Route path="liquidations/:reportId" element={<PwaLiquidationDetail data={data} />} />
        <Route path="liquidations/:reportId/manage" element={<PwaLiquidationManager data={data} />} />
        <Route path="notifications" element={<PwaNotifications data={data} />} />
        <Route path="activity" element={<PwaActivity data={data} />} />
        <Route path="profile" element={<PwaProfilePage data={data} />} />
        <Route path="profile/edit" element={<PwaProfileEdit data={data} />} />
        <Route path="profile/public" element={<PwaProfilePublicPreview data={data} />} />
        <Route path="organizations" element={<PwaOrganizationDirectory />} />
        <Route path="organizations/:organizationId" element={<PwaOrganizationDirectoryProfile />} />
        <Route path="ypop" element={<PwaYpopPage data={data} />} />
        <Route path="ypop/period/:periodId" element={<PwaYpopWorkspace data={data} />} />
        <Route path="ypop/:entryId/ppa/new" element={<PwaYpopPpaEditor data={data} />} />
        <Route path="ypop/:entryId/ppa" element={<PwaYpopPpaList data={data} />} />
        <Route path="ypop/:entryId/ppa/:activityId" element={<PwaYpopPpaEditor data={data} />} />
        <Route path="ypop/:entryId" element={<PwaYpopWorkspace data={data} />} />
        <Route path="templates" element={<PwaTemplateLibrary data={data} />} />
        <Route path="templates/:templateId" element={<PwaTemplatePreview data={data} />} />
        <Route path="news" element={<PwaNews data={data} />} />
        <Route path="news/:newsReleaseId" element={<PwaNews data={data} />} />
        <Route path="transparency" element={<PwaTransparency data={data} />} />
        <Route path="compliance" element={<PwaCompliance data={data} />} />
        <Route path="inquiries" element={<PwaInquiries data={data} />} />
        <Route path="settings" element={<PwaSettingsMain />} />
        <Route path="settings/notifications" element={<PwaNotificationSettings />} />
        <Route path="settings/appearance" element={<PwaAppearanceSettings />} />
        <Route path="settings/storage" element={<PwaStorageSettings />} />
        <Route path="settings/preferences" element={<PwaAppPreferences />} />
        <Route path="settings/account" element={<PwaAccountSettings data={data} />} />
        <Route path="about" element={<PwaAboutPage />} />
        <Route path="faqs" element={<PwaFaqPage />} />
        <Route path="contact" element={<PwaContactPage />} />
        <Route path="privacy" element={<PwaLegalPage type="privacy" />} />
        <Route path="terms" element={<PwaLegalPage type="terms" />} />
        <Route path="more" element={<PwaMorePage onSignOut={data.signOut} />} />
        <Route path="*" element={<Navigate to={PWA_ROUTES.home} replace />} />
      </Routes>
    </PwaAppShell>
  );
}

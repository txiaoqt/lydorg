export const PWA_ROUTES = {
  home: "/app",
  documents: "/app/documents",
  documentsManage: "/app/documents/manage",
  budgets: "/app/budgets",
  budgetNew: "/app/budgets/new",
  liquidations: "/app/liquidations",
  notifications: "/app/notifications",
  activity: "/app/activity",
  profile: "/app/profile",
  profileEdit: "/app/profile/edit",
  profilePublic: "/app/profile/public",
  organizations: "/app/organizations",
  ypop: "/app/ypop",
  templates: "/app/templates",
  news: "/app/news",
  transparency: "/app/transparency",
  compliance: "/app/compliance",
  inquiries: "/app/inquiries",
  settings: "/app/settings",
  settingsNotifications: "/app/settings/notifications",
  settingsAppearance: "/app/settings/appearance",
  settingsStorage: "/app/settings/storage",
  settingsPreferences: "/app/settings/preferences",
  settingsAccount: "/app/settings/account",
  about: "/app/about",
  faqs: "/app/faqs",
  contact: "/app/contact",
  privacy: "/app/privacy",
  terms: "/app/terms",
  more: "/app/more",
} as const;

export { PWA_ENTRY_ROUTE, pwaAuthRoute, pwaPublicRoute } from "./pwaAuthFlow";

export const pwaDocumentDetailRoute = (documentId: string) =>
  `${PWA_ROUTES.documents}/${encodeURIComponent(documentId)}`;

export const pwaBudgetDetailRoute = (requestId: string) =>
  `${PWA_ROUTES.budgets}/${encodeURIComponent(requestId)}`;

export const pwaBudgetEditRoute = (requestId: string) =>
  `${pwaBudgetDetailRoute(requestId)}/edit`;

export const pwaLiquidationDetailRoute = (reportId: string) =>
  `${PWA_ROUTES.liquidations}/${encodeURIComponent(reportId)}`;

export const pwaLiquidationManageRoute = (reportId: string) =>
  `${pwaLiquidationDetailRoute(reportId)}/manage`;

export const pwaNewsDetailRoute = (newsId: string) =>
  `${PWA_ROUTES.news}/${encodeURIComponent(newsId)}`;

export const pwaOrganizationRoute = (organizationId: string) =>
  `${PWA_ROUTES.organizations}/${encodeURIComponent(organizationId)}`;

export const pwaTemplateDetailRoute = (templateId: string) =>
  `${PWA_ROUTES.templates}/${encodeURIComponent(templateId)}`;

export const pwaYpopEntryRoute = (entryId: string) =>
  `${PWA_ROUTES.ypop}/${encodeURIComponent(entryId)}`;

export const pwaYpopPeriodRoute = (periodId: string) =>
  `${PWA_ROUTES.ypop}/period/${encodeURIComponent(periodId)}`;

export const pwaYpopPpaNewRoute = (entryId: string) =>
  `${pwaYpopEntryRoute(entryId)}/ppa/new`;

export const pwaYpopPpaListRoute = (entryId: string) =>
  `${pwaYpopEntryRoute(entryId)}/ppa`;

export const pwaYpopPpaEditRoute = (entryId: string, activityId: string) =>
  `${pwaYpopEntryRoute(entryId)}/ppa/${encodeURIComponent(activityId)}`;

export const isPwaRoute = (pathname: string) =>
  pathname === PWA_ROUTES.home || pathname.startsWith(`${PWA_ROUTES.home}/`);

const legacyRouteMap: Array<[string, string]> = [
  ["/dashboard", PWA_ROUTES.home],
  ["/organization-profile", PWA_ROUTES.profile],
  ["/document-submission", PWA_ROUTES.documents],
  ["/budget-request", PWA_ROUTES.budgets],
  ["/liquidation-reporting", PWA_ROUTES.liquidations],
  ["/news-releases", PWA_ROUTES.news],
  ["/public-transparency", PWA_ROUTES.transparency],
  ["/compliance-status", PWA_ROUTES.compliance],
  ["/notifications", PWA_ROUTES.notifications],
  ["/ypop", PWA_ROUTES.ypop],
  ["/templates", PWA_ROUTES.templates],
  ["/app-more", PWA_ROUTES.more],
  ["/app-inquiries", PWA_ROUTES.inquiries],
];

export function getPwaEquivalentRoute(pathname: string) {
  const newsMatch = pathname.match(/^\/news-releases\/([^/]+)$/);
  if (newsMatch) return pwaNewsDetailRoute(newsMatch[1]);
  return legacyRouteMap.find(([legacy]) => pathname === legacy)?.[1] ?? PWA_ROUTES.home;
}

export function getPwaParentRoute(pathname: string) {
  if (pathname === PWA_ROUTES.organizations) return PWA_ROUTES.more;
  if (pathname.startsWith(`${PWA_ROUTES.profile}/`)) return PWA_ROUTES.profile;
  if (pathname.startsWith(`${PWA_ROUTES.organizations}/`)) return PWA_ROUTES.organizations;
  if (pathname.startsWith(`${PWA_ROUTES.documents}/`)) return PWA_ROUTES.documents;
  if (pathname.startsWith(`${PWA_ROUTES.budgets}/`)) return PWA_ROUTES.budgets;
  if (pathname.startsWith(`${PWA_ROUTES.liquidations}/`)) return PWA_ROUTES.liquidations;
  if (pathname.startsWith(`${PWA_ROUTES.news}/`)) return PWA_ROUTES.news;
  if (pathname.startsWith(`${PWA_ROUTES.templates}/`)) return PWA_ROUTES.templates;
  if (pathname.startsWith(`${PWA_ROUTES.ypop}/`)) return PWA_ROUTES.ypop;
  if (pathname.startsWith(`${PWA_ROUTES.settings}/`)) return PWA_ROUTES.settings;
  if ([PWA_ROUTES.settings, PWA_ROUTES.about, PWA_ROUTES.faqs, PWA_ROUTES.contact, PWA_ROUTES.privacy, PWA_ROUTES.terms].includes(pathname as never)) return PWA_ROUTES.more;
  return PWA_ROUTES.home;
}

export function getPwaPageTitle(pathname: string) {
  if (pathname === PWA_ROUTES.home) return "Dashboard";
  if (pathname.startsWith(PWA_ROUTES.documentsManage)) return "Manage Documents";
  if (pathname.startsWith(PWA_ROUTES.documents)) return "Documents";
  if (pathname === PWA_ROUTES.budgetNew) return "New Budget Request";
  if (pathname.startsWith(PWA_ROUTES.budgets)) return "Budget Requests";
  if (pathname.includes("/manage") && pathname.startsWith(PWA_ROUTES.liquidations)) return "Manage Liquidation";
  if (pathname.startsWith(PWA_ROUTES.liquidations)) return "Liquidation";
  if (pathname.startsWith(PWA_ROUTES.notifications)) return "Notifications";
  if (pathname.startsWith(PWA_ROUTES.activity)) return "Activity";
  if (pathname === PWA_ROUTES.profileEdit) return "Edit Profile";
  if (pathname === PWA_ROUTES.profilePublic) return "Public Profile";
  if (pathname === PWA_ROUTES.organizations) return "Organizations";
  if (pathname.startsWith(`${PWA_ROUTES.organizations}/`)) return "Organization Profile";
  if (pathname.startsWith(PWA_ROUTES.profile)) return "Organization Profile";
  if (pathname.includes("/ppa/") && pathname.startsWith(PWA_ROUTES.ypop)) return "Log PPA";
  if (pathname.startsWith(PWA_ROUTES.ypop)) return "YPOP Incentive";
  if (pathname.startsWith(PWA_ROUTES.templates)) return "Templates";
  if (pathname.startsWith(PWA_ROUTES.news)) return "News Releases";
  if (pathname.startsWith(PWA_ROUTES.transparency)) return "Public Transparency";
  if (pathname.startsWith(PWA_ROUTES.compliance)) return "Compliance Status";
  if (pathname.startsWith(PWA_ROUTES.inquiries)) return "Inquiries";
  if (pathname === PWA_ROUTES.settingsNotifications) return "Notification Settings";
  if (pathname === PWA_ROUTES.settingsAppearance) return "Appearance & Accessibility";
  if (pathname === PWA_ROUTES.settingsStorage) return "Files & Offline Storage";
  if (pathname === PWA_ROUTES.settingsPreferences) return "App Preferences";
  if (pathname === PWA_ROUTES.settingsAccount) return "Account & Security";
  if (pathname.startsWith(PWA_ROUTES.settings)) return "Settings";
  if (pathname.startsWith(PWA_ROUTES.about)) return "About Y-TRACE";
  if (pathname.startsWith(PWA_ROUTES.faqs)) return "FAQs";
  if (pathname.startsWith(PWA_ROUTES.contact)) return "Contact LYDO / PCYDO";
  if (pathname.startsWith(PWA_ROUTES.privacy)) return "Privacy Policy";
  if (pathname.startsWith(PWA_ROUTES.terms)) return "Terms of Service";
  return "More";
}

export function getPwaRelatedRecordRoute(relatedType: string, relatedId: string) {
  if (relatedType === "budget_request" && relatedId) return pwaBudgetDetailRoute(relatedId);
  if (relatedType === "liquidation_report" && relatedId) return pwaLiquidationDetailRoute(relatedId);
  if (relatedType === "news_release" && relatedId) return pwaNewsDetailRoute(relatedId);
  if (relatedType === "document_submission" || relatedType === "document") return PWA_ROUTES.documents;
  if (relatedType === "organization_profile") return PWA_ROUTES.profile;
  if (relatedType.startsWith("ypop")) return PWA_ROUTES.ypop;
  return null;
}

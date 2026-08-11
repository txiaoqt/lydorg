import { describe, expect, it } from "vitest";
import {
  getPwaEquivalentRoute,
  getPwaPageTitle,
  getPwaParentRoute,
  getPwaRelatedRecordRoute,
  isPwaRoute,
  PWA_ROUTES,
  pwaBudgetDetailRoute,
  pwaDocumentDetailRoute,
  pwaLiquidationManageRoute,
  pwaNewsDetailRoute,
  pwaOrganizationRoute,
  pwaTemplateDetailRoute,
  pwaYpopEntryRoute,
  pwaYpopPpaNewRoute,
} from "./pwaRoutes";

describe("PWA routes", () => {
  it("keeps core operations in the /app namespace", () => {
    expect(pwaDocumentDetailRoute("doc 1")).toBe("/app/documents/doc%201");
    expect(pwaBudgetDetailRoute("budget")).toBe("/app/budgets/budget");
    expect(pwaLiquidationManageRoute("report")).toBe("/app/liquidations/report/manage");
    expect(pwaNewsDetailRoute("news")).toBe("/app/news/news");
    expect(pwaOrganizationRoute("org 1")).toBe("/app/organizations/org%201");
    expect(pwaTemplateDetailRoute("template 1")).toBe("/app/templates/template%201");
    expect(pwaYpopEntryRoute("entry 1")).toBe("/app/ypop/entry%201");
    expect(pwaYpopPpaNewRoute("entry")).toBe("/app/ypop/entry/ppa/new");
  });

  it("maps legacy installed-app routes to native PWA routes", () => {
    expect(getPwaEquivalentRoute("/dashboard")).toBe(PWA_ROUTES.home);
    expect(getPwaEquivalentRoute("/document-submission")).toBe(PWA_ROUTES.documents);
    expect(getPwaEquivalentRoute("/budget-request")).toBe(PWA_ROUTES.budgets);
    expect(getPwaEquivalentRoute("/liquidation-reporting")).toBe(PWA_ROUTES.liquidations);
    expect(getPwaEquivalentRoute("/news-releases/abc")).toBe("/app/news/abc");
  });

  it("provides PWA-only detail fallbacks", () => {
    expect(getPwaParentRoute(PWA_ROUTES.profileEdit)).toBe(PWA_ROUTES.profile);
    expect(getPwaParentRoute(PWA_ROUTES.profilePublic)).toBe(PWA_ROUTES.profile);
    expect(getPwaParentRoute("/app/organizations/org-1")).toBe(PWA_ROUTES.organizations);
    expect(getPwaParentRoute("/app/templates/template-1")).toBe(PWA_ROUTES.templates);
    expect(getPwaParentRoute("/app/ypop/entry-1/ppa/new")).toBe(PWA_ROUTES.ypop);
    expect(getPwaParentRoute("/app/documents/manage")).toBe(PWA_ROUTES.documents);
    expect(getPwaParentRoute("/app/budgets/123/edit")).toBe(PWA_ROUTES.budgets);
    expect(getPwaParentRoute("/app/liquidations/123")).toBe(PWA_ROUTES.liquidations);
    expect(getPwaParentRoute(PWA_ROUTES.settingsAppearance)).toBe(PWA_ROUTES.settings);
    expect(getPwaParentRoute(PWA_ROUTES.privacy)).toBe(PWA_ROUTES.more);
    expect(getPwaPageTitle(PWA_ROUTES.settingsStorage)).toBe("Files & Offline Storage");
  });

  it("does not classify ordinary website paths as PWA routes", () => {
    expect(isPwaRoute("/app/documents")).toBe(true);
    expect(isPwaRoute("/dashboard")).toBe(false);
    expect(isPwaRoute("/admin")).toBe(false);
  });

  it("routes notification records to native PWA details", () => {
    expect(getPwaRelatedRecordRoute("budget_request", "budget")).toBe("/app/budgets/budget");
    expect(getPwaRelatedRecordRoute("liquidation_report", "report")).toBe("/app/liquidations/report");
    expect(getPwaRelatedRecordRoute("document_submission", "submission")).toBe(PWA_ROUTES.documents);
  });
});

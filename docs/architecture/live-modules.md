# Live Modules Inventory & Architecture Reference

**Date Generated**: August 3, 2026  
**Primary Source of Truth**: `src/App.tsx`, `src/user/pwa/PwaUserPortal.tsx`, `src/user/pwa/pwaRoutes.ts`, `src/admin/AdminPortal.tsx`  
**Project**: Y-TRACE (LYDO Connect Organization Focused)

---

## Executive Summary

This document provides an exhaustive, empirical inventory of all active, reachable, and live modules, pages, and route surfaces currently wired into the Y-TRACE application.

Every module listed in this document is verified against `src/App.tsx` and its active child routing components (`UserPortalEntry`, `PwaUserPortal`, `AdminPortal`). Reusable components, hooks, context providers, commented-out routes, and unrouted legacy pages have been strictly excluded from the active module count and documented separately under [Orphan Pages](#orphan-pages).

---

## Surface Classification & Route Hierarchy

The Y-TRACE application architecture is divided into 6 primary operational surfaces:

1. **Public Website**: Unauthenticated marketing, information, compliance policies, public news, and template catalogs accessible to any visitor.
2. **Authentication**: Account creation, user/admin login gateways, email verification, OAuth callbacks, and password recovery workflows.
3. **User Portal (Web)**: Desktop web interface for registered youth organization representatives to manage profiles, submit compliance documents, request budgets, submit liquidations, monitor compliance status, and track YPOP incentive points.
4. **Admin Portal**: Restricted administrative interface for PCYDO staff to review organization registries, validate compliance documents, approve budget proposals, audit liquidations, publish news, and monitor audit activity logs.
5. **PWA (Progressive Web Application)**: Touch-optimized, standalone mobile app interface available under `/app/*` and `/pwa-start/*` for installed devices.
6. **Shared**: Cross-surface utilities such as 404 fallback routing.

---

## Complete Module Inventory

### 1. Public Website Modules

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 1 | Home Page | `/` | None | Public Website | Official public landing page for Y-TRACE Pasig City portal. | Public | None | `src/pages/Index.tsx` |
| 2 | Forms & Templates Catalog | `/public-templates` | None | Public Website | Public catalog to browse and download official PCYDO forms and compliance templates. | Public | None | `src/pages/PublicTemplates.tsx` |
| 3 | About Y-TRACE | `/about` | None | Public Website | Overview of PCYDO mandate, Y-TRACE platform capabilities, and Pasig City youth organization support. | Public | None | `src/pages/About.tsx` |
| 4 | Advocacy & Programs | `/advocacy` | None | Public Website | Public information page highlighting organizational advocacy areas and youth programs. | Public | None | `src/pages/About.tsx` |
| 5 | Frequently Asked Questions (FAQs) | `/faqs` | None | Public Website | Answers to common questions regarding YORP registration, document compliance, YPOP, and budget requests. | Public | None | `src/pages/Faqs.tsx` |
| 6 | Contact & Office Info | `/contacts` | None | Public Website | Contact details, office hours, address, and communication channels for Pasig City LYDO/PCYDO. | Public | None | `src/pages/Contacts.tsx` |
| 7 | Site Map | `/site-map` | None | Public Website | Visual directory of all public website sections, policy pages, and portal entry points. | Public | None | `src/pages/SiteMap.tsx` |
| 8 | Terms of Service | `/terms` | None | Public Website | Legal terms and conditions governing the use of Y-TRACE for registered organizations and personnel. | Public | None | `src/pages/LegalPolicy.tsx` |
| 9 | Privacy Policy | `/privacy` | None | Public Website | Comprehensive data privacy policy detailing information collection, processing, and RA 10173 compliance. | Public | None | `src/pages/LegalPolicy.tsx` |
| 10 | Public News Releases | `/news-releases` | None | Public Website | Public announcement center listing official PCYDO news, program updates, and policy notices. | Public | None | `src/pages/NewsReleases.tsx` |
| 11 | Public News Release Record | `/news-releases/:newsReleaseId` | Public News Releases | Public Website | Detailed view of an individual official news release, announcement, or policy update. | Public | None | `src/pages/NewsReleaseRecord.tsx` |

---

### 2. Authentication Modules

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 12 | User Sign In | `/signin` | None | Authentication | Authentication gateway for registered youth organization users to sign in. | Public | None | `src/pages/SignIn.tsx` |
| 13 | Admin Sign In | `/admin/signin` | None | Authentication | Dedicated login page for PCYDO administrators and staff (active when `IS_ADMIN_SURFACE` is true). | Public | None | `src/pages/SignIn.tsx` |
| 14 | Organization Sign Up | `/signup` | None | Authentication | Registration form for youth organizations requesting Y-TRACE portal access and YORP profiling. | Public | None | `src/pages/SignUp.tsx` |
| 15 | Email Verification Gate | `/verify-email` | None | Authentication | Status page instructing newly registered users to confirm their email address before access. | Public | None | `src/pages/VerifyEmail.tsx` |
| 16 | Auth Callback Handler | `/auth/callback` | None | Authentication | OAuth / Magic Link callback endpoint processing Supabase authentication redirects. | Public | None | `src/pages/AuthCallback.tsx` |
| 17 | Password Reset & Recovery | `/reset-password` | None | Authentication | Secure password recovery request and update form for account credential resets. | Public | Recovery Isolated | None | `src/pages/ResetPassword.tsx` |

---

### 3. User Portal Modules (Web)

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 18 | User Dashboard | `/dashboard` | None | User Portal | Central web portal overview showing organization status, active compliance tasks, metrics, and quick actions. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 19 | Organization Profile Management | `/organization-profile` | User Dashboard | User Portal | Profile editor for managing organization details, officers, advisers, contact info, and advocacy categories. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 20 | Document Submission & Compliance | `/document-submission` | User Dashboard | User Portal | Interface for uploading, managing, and tracking compliance documents required for registration and renewal. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 21 | Budget Request & Assistance | `/budget-request` | User Dashboard | User Portal | Application portal for youth organizations to submit project budget proposals and track approvals. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 22 | Liquidation & Financial Reporting | `/liquidation-reporting` | User Dashboard | User Portal | Portal for submitting financial liquidation reports, receipts, and expense documentation for approved budgets. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 23 | Public Transparency Disclosures | `/public-transparency` | User Dashboard | User Portal | Overview of organization transparency submissions and official public disclosure postings. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 24 | Compliance Status & Renewal | `/compliance-status` | User Dashboard | User Portal | Real-time status tracker for organization registration validity, prerequisite document completeness, and renewal clocks. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 25 | User Notifications Center | `/notifications` | User Dashboard | User Portal | Notification inbox displaying administrative remarks, document review decisions, budget updates, and system alerts. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 26 | YPOP Incentive Center | `/ypop` | User Dashboard | User Portal | Incentive points and participation portal for logging organization activities and monitoring YPOP period scores. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 27 | Resource & Template Library | `/templates` | User Dashboard | User Portal | Internal organization repository for downloading official document templates, forms, and guidelines. | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortal.tsx` |
| 28 | PWA Mobile More Entry | `/app-more` | User Dashboard | User Portal | Extended mobile navigation module (redirects to `/dashboard` on web; renders mobile navigation in PWA mode). | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortalEntry.tsx` |
| 29 | PWA Mobile Inquiries Entry | `/app-inquiries` | User Dashboard | User Portal | Direct inquiry submission module (redirects to `/dashboard` on web; renders inquiries in PWA mode). | Protected | `RequireUser`, `PolicyAgreementGate` | `src/user/UserPortalEntry.tsx` |

---

### 4. Admin Portal Modules

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 30 | Admin Portal Overview | `/admin` | None | Admin Portal | Executive dashboard displaying system-wide analytics, organization counts, budget stats, and urgent action items. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 31 | YORP Organization Registry | `/admin/yorp-registry` | Admin Overview | Admin Portal | Comprehensive database of all registered youth organizations, profiling data, URN numbers, and status controls. | Protected | `RequireAdmin` | `src/admin/pages/YorpRegistry.tsx` |
| 32 | Document Validation Review | `/admin/registrations` | Admin Overview | Admin Portal | Review queue for inspecting, approving, returning, or rejecting organization document compliance submissions. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 33 | Budget Utilization Review | `/admin/budget-utilization` | Admin Overview | Admin Portal | Administrative review interface for evaluating submitted budget proposals, approving funds, and setting release dates. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 34 | Liquidation Audit & Monitoring | `/admin/liquidation-monitoring` | Admin Overview | Admin Portal | Financial audit module for reviewing submitted liquidation reports, verifying receipts, and closing completed budgets. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 35 | Inquiries & Helpdesk Support | `/admin/inquiries` | Admin Overview | Admin Portal | Support ticket and inquiry management tool for responding to user messages, help requests, and policy questions. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 36 | News Releases Publisher | `/admin/news-releases` | Admin Overview | Admin Portal | Publishing suite for drafting, editing, scheduling, and posting official PCYDO news releases and announcements. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 37 | News Release Record Editor | `/admin/news-releases/:newsReleaseId` | News Releases | Admin Portal | Dedicated editor and detail manager for individual news release records. | Protected | `RequireAdmin` | `src/pages/NewsReleaseRecord.tsx` |
| 38 | Budget Monitoring & Transparency | `/admin/budget-monitoring` | Admin Overview | Admin Portal | Management dashboard for public financial transparency disclosures, budget summaries, and transparency posts. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 39 | Document Template Manager | `/admin/templates` | Admin Overview | Admin Portal | Administrative tool for uploading, organizing, activating, or deleting official templates and downloadable forms. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 40 | System Notifications Center | `/admin/notifications` | Admin Overview | Admin Portal | System notification center for broadcasting alerts, policy updates, and automated reminders to registered organizations. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 41 | Audit Activity Logs | `/admin/activity-logs` | Admin Overview | Admin Portal | Comprehensive security and operational audit trail recording user logins, document uploads, status changes, and admin decisions. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |
| 42 | YPOP Incentive Validation | `/admin/ypop-validation` | Admin Overview | Admin Portal | Review and scoring workspace for validating organization activities, granting YPOP points, and managing evaluation periods. | Protected | `RequireAdmin` | `src/admin/AdminPortal.tsx` |

---

### 5. PWA Standalone Modules

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 43 | PWA App Gateway | `/pwa-start` | None | PWA | Entry point and environment detection gate for installed Progressive Web Application users. | Public Entry | `PwaEntryGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 44 | PWA Help Center | `/pwa-start/help` | PWA Gateway | PWA | Mobile-optimized user guide and help documentation. | Public | `PwaPublicResourceGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 45 | PWA FAQs | `/pwa-start/faqs` | PWA Gateway | PWA | Mobile-optimized frequently asked questions for PWA users. | Public | `PwaPublicResourceGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 46 | PWA Contact | `/pwa-start/contact` | PWA Gateway | PWA | Mobile-optimized contact directory for PCYDO office assistance. | Public | `PwaPublicResourceGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 47 | PWA Privacy Policy | `/pwa-start/privacy` | PWA Gateway | PWA | Mobile-optimized privacy policy view. | Public | `PwaPublicResourceGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 48 | PWA Terms of Service | `/pwa-start/terms` | PWA Gateway | PWA | Mobile-optimized terms of service view. | Public | `PwaPublicResourceGate` | `src/user/pwa/public/PwaPublicEntry.tsx` |
| 49 | PWA Mobile Home / Dashboard | `/app` | None | PWA | Main touch-optimized mobile dashboard for installed PWA users. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/dashboard/PwaDashboard.tsx` |
| 50 | PWA Documents List | `/app/documents` | PWA Home | PWA | Mobile document submission overview and file upload list. | Protected | `PwaDocumentAccessGuard` | `src/user/pwa/documents/PwaDocumentPages.tsx` |
| 51 | PWA Document Manager | `/app/documents/manage` | PWA Documents | PWA | Mobile file upload manager for submitting compliance files. | Protected | `PwaDocumentAccessGuard` | `src/user/pwa/documents/PwaDocumentPages.tsx` |
| 52 | PWA Document Detail Viewer | `/app/documents/:documentId` | PWA Documents | PWA | Mobile viewer for inspecting document submission details and reviewer feedback. | Protected | `PwaDocumentAccessGuard` | `src/user/pwa/documents/PwaDocumentPages.tsx` |
| 53 | PWA Budget Requests List | `/app/budgets` | PWA Home | PWA | Mobile budget proposal tracker and submission list. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/budgets/PwaBudgetPages.tsx` |
| 54 | PWA Budget Form (New/Edit) | `/app/budgets/new` & `:requestId/edit` | PWA Budgets | PWA | Mobile form editor for creating or modifying budget proposals. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/budgets/PwaBudgetPages.tsx` |
| 55 | PWA Budget Request Detail | `/app/budgets/:requestId` | PWA Budgets | PWA | Mobile detailed view of budget request status and approval breakdown. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/budgets/PwaBudgetPages.tsx` |
| 56 | PWA Liquidation Reports List | `/app/liquidations` | PWA Home | PWA | Mobile list of submitted financial liquidation reports. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/liquidations/PwaLiquidationPages.tsx` |
| 57 | PWA Liquidation Detail | `/app/liquidations/:reportId` | PWA Liquidations | PWA | Mobile viewer for checking liquidation report details and audit remarks. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/liquidations/PwaLiquidationPages.tsx` |
| 58 | PWA Liquidation Manager | `/app/liquidations/:reportId/manage` | PWA Liquidations | PWA | Mobile manager for uploading receipts and financial proof files. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/liquidations/PwaLiquidationPages.tsx` |
| 59 | PWA Notifications Feed | `/app/notifications` | PWA Home | PWA | Touch-optimized notification feed for mobile devices. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 60 | PWA Activity Audit Log | `/app/activity` | PWA Home | PWA | Mobile security and activity timeline for the authenticated organization. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 61 | PWA Profile Overview | `/app/profile` | PWA Home | PWA | Mobile view of organization profile information and verification status. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/profile/PwaProfilePages.tsx` |
| 62 | PWA Profile Editor | `/app/profile/edit` | PWA Profile | PWA | Mobile profile editor for updating organization details, officers, and contact info. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/profile/PwaProfilePages.tsx` |
| 63 | PWA Public Profile Preview | `/app/profile/public` | PWA Profile | PWA | Mobile preview of how the organization's public directory profile appears. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/profile/PwaProfilePages.tsx` |
| 64 | PWA Organization Directory | `/app/organizations` | PWA Home | PWA | Searchable mobile directory of verified youth organizations in Pasig City. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/profile/PwaOrganizationDirectory.tsx` |
| 65 | PWA Org Profile Detail | `/app/organizations/:organizationId` | PWA Directory | PWA | Mobile view of a specific organization's public profile and advocacy info. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/profile/PwaOrganizationDirectory.tsx` |
| 66 | PWA YPOP Incentive Center | `/app/ypop` | PWA Home | PWA | Mobile YPOP incentive portal for tracking points and activity periods. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/ypop/PwaYpopPage.tsx` |
| 67 | PWA YPOP Workspace | `/app/ypop/:entryId` & `period/:periodId` | PWA YPOP | PWA | Mobile workspace for inspecting active period submissions and activity scoring. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/ypop/PwaYpopWorkspace.tsx` |
| 68 | PWA YPOP PPA Editor | `/app/ypop/:entryId/ppa/new` & `:activityId` | PWA YPOP | PWA | Mobile form for logging new organizational PPAs or editing existing submissions. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/ypop/PwaYpopWorkspace.tsx` |
| 69 | PWA YPOP PPA List | `/app/ypop/:entryId/ppa` | PWA YPOP | PWA | Mobile list of all logged PPAs for a specific YPOP submission period. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/ypop/PwaYpopWorkspace.tsx` |
| 70 | PWA Template Library | `/app/templates` | PWA Home | PWA | Mobile resource repository for downloading official forms and templates. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/templates/PwaTemplatePages.tsx` |
| 71 | PWA Template Preview | `/app/templates/:templateId` | PWA Templates | PWA | Mobile preview of an individual template file before download. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/templates/PwaTemplatePages.tsx` |
| 72 | PWA News Releases Feed | `/app/news` & `/app/news/:newsReleaseId` | PWA Home | PWA | Mobile news feed displaying official PCYDO announcements and updates. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 73 | PWA Public Transparency Feed | `/app/transparency` | PWA Home | PWA | Mobile view of public financial transparency posts and city disclosures. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 74 | PWA Compliance Status View | `/app/compliance` | PWA Home | PWA | Mobile tracker for organization registration validity and renewal status. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 75 | PWA Inquiries Helpdesk | `/app/inquiries` | PWA Home | PWA | Mobile inquiry submission tool for contacting PCYDO support. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaResourcePages.tsx` |
| 76 | PWA Settings Main Menu | `/app/settings` | PWA Home | PWA | Mobile settings overview menu. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 77 | PWA Notification Settings | `/app/settings/notifications` | PWA Settings | PWA | Mobile preferences for notification alerts and email updates. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 78 | PWA Appearance Settings | `/app/settings/appearance` | PWA Settings | PWA | Customization menu for app color themes (Pasig Blue), dark/light mode, and font size scaling. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 79 | PWA Storage Settings | `/app/settings/storage` | PWA Settings | PWA | Mobile storage manager for inspecting cached assets, offline files, and clearing local data. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 80 | PWA App Preferences | `/app/settings/preferences` | PWA Settings | PWA | Configuration for default landing screen and mobile interface preferences. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 81 | PWA Account & Security | `/app/settings/account` | PWA Settings | PWA | Security settings for password reset triggers and account session management. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/settings/PwaSettingsPages.tsx` |
| 82 | PWA About Page | `/app/about` | PWA Home | PWA | Touch-optimized About information page for mobile devices. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaInformationPages.tsx` |
| 83 | PWA FAQs Page | `/app/faqs` | PWA Home | PWA | Touch-optimized FAQs page for mobile devices. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaInformationPages.tsx` |
| 84 | PWA Contact Page | `/app/contact` | PWA Home | PWA | Touch-optimized contact page for mobile devices. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaInformationPages.tsx` |
| 85 | PWA Privacy Policy Page | `/app/privacy` | PWA Home | PWA | Touch-optimized privacy policy view. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaInformationPages.tsx` |
| 86 | PWA Terms of Service Page | `/app/terms` | PWA Home | PWA | Touch-optimized terms of service view. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaInformationPages.tsx` |
| 87 | PWA Mobile More Menu | `/app/more` | PWA Home | PWA | Extended drawer navigation menu providing access to secondary mobile features and sign-out. | Protected | `RequireUser` -> `PwaUserPortal` | `src/user/pwa/PwaMorePage.tsx` |

---

### 6. Shared Modules

| # | Module Name | Route | Parent Module | Surface | Purpose | Status | Route Guard | Source File |
|---|---|---|---|---|---|---|---|---|
| 88 | 404 Not Found Page | `*` | None | Shared | Fallback error page rendered when a requested route does not match any active endpoint. | Public | `NotFoundRoute` | `src/pages/NotFound.tsx` |

---

## Statistics Summary

```
=====================================================
            Y-TRACE MODULE INVENTORY STATS
=====================================================
  Public Website Modules:      11
  Authentication Modules:       6
  User Portal Modules (Web):   12
  Admin Portal Modules:        13
  PWA Mobile Modules:          45
  Shared Modules:               1
-----------------------------------------------------
  TOTAL LIVE MODULES:          88
=====================================================
  Orphan Pages Identified:     15
=====================================================
```

---

## Orphan Pages

An **Orphan Page** is a source file existing in the repository under `src/pages/` or `src/admin/pages/` that is **NOT** imported or wired into `src/App.tsx` routing. These files represent legacy code, unrouted prototypes, or deprecated page variations.

| File Path | Original Purpose | Reason for Orphan Classification |
|---|---|---|
| `src/pages/BarangayMap.tsx` | Standalone interactive map of Pasig City barangays. | Not imported in `App.tsx`; barangay data integrated into registration forms. |
| `src/pages/FinancialDisclosure.tsx` | Public financial disclosure page. | Not imported in `App.tsx`; replaced by `/public-transparency`. |
| `src/pages/Organizations.tsx` | Legacy public directory of organizations. | Not imported in `App.tsx`; replaced by `YorpRegistry.tsx` & PWA directory. |
| `src/pages/Profile.tsx` | Legacy user profile component. | Not imported in `App.tsx`; replaced by `/organization-profile` in `UserPortal.tsx`. |
| `src/pages/TransparencyBoard.tsx` | Legacy transparency board page. | Not imported in `App.tsx`; replaced by `/public-transparency`. |
| `src/pages/TransparencyReports.tsx` | Legacy financial reporting page. | Not imported in `App.tsx`; replaced by `/public-transparency`. |
| `src/pages/YouthDesk.tsx` | Legacy youth desk portal page. | Not imported in `App.tsx`; merged into `Faqs.tsx` and `Contacts.tsx`. |
| `src/admin/pages/Barangays.tsx` | Standalone admin barangay manager. | Not directly routed in `App.tsx`; integrated into `AdminPortal.tsx`. |
| `src/admin/pages/Documents.tsx` | Standalone admin document manager. | Not directly routed in `App.tsx`; integrated into `AdminPortal` registrations section. |
| `src/admin/pages/FinancialDss.tsx` | Financial decision support page. | Not directly routed in `App.tsx`; replaced by `AdminPortal` budget utilization section. |
| `src/admin/pages/Organizations.tsx` | Standalone admin organization manager. | Not directly routed in `App.tsx`; replaced by `YorpRegistry.tsx`. |
| `src/admin/pages/Roles.tsx` | Standalone admin user role manager. | Not directly routed in `App.tsx`; integrated into `YorpRegistry.tsx`. |
| `src/admin/pages/TransparencyBoardAdmin.tsx` | Standalone admin transparency board. | Not directly routed in `App.tsx`; integrated into `AdminPortal` budget monitoring. |
| `src/admin/pages/Users.tsx` | Standalone admin user account manager. | Not directly routed in `App.tsx`; integrated into `YorpRegistry.tsx`. |
| `src/admin/pages/YouthDesk.tsx` | Standalone admin youth desk manager. | Not directly routed in `App.tsx`; integrated into `AdminPortal` inquiries. |

---

## Notes for Future Maintenance

1. **Routing Single Source of Truth**: `src/App.tsx` remains the authoritative entry point for top-level routes. Any new page added to `src/pages/` or `src/admin/pages/` must be explicitly wired into `App.tsx` to become active.
2. **PWA Route Sync**: Mobile PWA sub-routes under `/app/*` are declared in `src/user/pwa/pwaRoutes.ts` and rendered within `src/user/pwa/PwaUserPortal.tsx`.
3. **Orphan Cleanup**: Unused files in `src/pages` and `src/admin/pages` should be periodically audited against this inventory file before deletion or refactoring.

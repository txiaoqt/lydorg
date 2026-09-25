"""
Generator for Section 17: Desktop Cross-Surface & Integration Regression Black-Box Test Cases.
Document: 17_YTRACE_Desktop_Cross_Surface_Regression_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_17_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: End-to-End Cross-Portal Lifecycles (User <-> Admin <-> Public)
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="End-to-End Cross-Portal Lifecycles (User <-> Admin <-> Public)",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify end-to-end registration lifecycle from user submission to automatic URN verification and active portal state",
                preconditions="New organization account created with pending profile; Admin account logged in on separate workstation.",
                steps=[
                    "Organization user completes profile (Head of Organization, Centers of Youth Participation) and uploads required registration PDFs.",
                    "User submits registration packet (receives registration reference code).",
                    "Admin navigates to Admin Portal > Registration Compliance tab.",
                    "Admin opens the submitted organization's review drawer.",
                    "Admin reviews and approves each required compliance document individually.",
                    "Observe automatic verification trigger upon approving the final required document.",
                    "Organization user refreshes User Portal dashboard.",
                ],
                test_data="Organization: 'Katipunan Youth Advocates', Barangay: San Nicolas, Term: 3 Years.",
                expected_result="Upon approval of the final required document, the system AUTOMATICALLY verifies the organization without requiring a separate manual button. A deterministic Unique Registration Number (URN) format 'BB-YY-NNN' (e.g., 'SN-26-001') is generated. User Portal dashboard immediately reflects status 'Accredited' with green badge, displays the official URN in the banner, and unlocks YPOP and Budget Request features.",
                pass_fail_criteria="Pass: Automatic verification generates deterministic URN 'BB-YY-NNN' and updates user dashboard immediately.\nFail: Requires obsolete manual button or URN format is non-deterministic.",
            ),
            TestCase(
                id="TC002",
                description="Verify document compliance revision lifecycle with admin feedback remarks and user file replacement",
                preconditions="Accredited organization with 1 compliance document marked 'Needs Revision' by Admin with specific feedback.",
                steps=[
                    "Admin opens organization in Registration Compliance Review, sets Barangay Certification to 'Needs Revision', and enters remarks: 'Barangay seal is blurred; please upload clear re-scan'.",
                    "Admin saves review.",
                    "Organization user navigates to User Portal > Document Compliance tab.",
                    "Verify display of 'Needs Revision' status badge and exact admin remarks.",
                    "User clicks 'Replace File' and uploads clear replacement PDF.",
                    "User submits updated document.",
                    "Admin re-opens organization compliance drawer.",
                ],
                test_data="Document: Barangay Certification PDF (1.8 MB), Admin Remark: 'Barangay seal is blurred; please upload clear re-scan'.",
                expected_result="User Portal displays exact admin remarks with amber alert. File upload replaces previous attachment and transitions status to 'Resubmitted / Pending Review'. Admin drawer reflects the new replacement file with updated timestamp.",
                pass_fail_criteria="Pass: Revision feedback is visible to user, replacement file uploads correctly, and admin sees updated file.\nFail: Remarks are missing, replacement fails, or status does not transition.",
            ),
            TestCase(
                id="TC003",
                description="Verify continuous accreditation term extension via renewal submitted during active window (URN permanently preserved)",
                preconditions="Organization with URN 'SN-23-004' expires on October 31, 2026; renewal packet submitted on October 15, 2026.",
                steps=[
                    "Admin opens Renewals queue and reviews organization's renewal submission.",
                    "Admin approves renewal packet and issues certification extension.",
                    "Organization user navigates to User Portal > Profile / Certificate tab.",
                    "Verify accreditation validity date range and URN.",
                ],
                test_data="Expiration Anchor: Oct 31, 2026; Submission: Oct 15, 2026; Term: 3 Years.",
                expected_result="Renewal extends accreditation continuously from previous expiration date (Oct 31, 2026 to Oct 31, 2029). The official URN 'SN-23-004' is PERMANENTLY preserved (no new URN issued).",
                pass_fail_criteria="Pass: Expiration date is anchored continuously to previous term end date and URN is permanently preserved.\nFail: URN is overwritten or date resets to current approval date.",
            ),
            TestCase(
                id="TC004",
                description="Verify gap renewal handling for lapsed accreditation submitted within 180-day late window (no grace period)",
                preconditions="Organization URN expired on June 30, 2026; renewal packet submitted on September 15, 2026 (77 days lapsed, within 180-day cutoff).",
                steps=[
                    "Admin reviews and approves the late renewal submission in Admin Portal.",
                    "Admin confirms issuance of updated certificate.",
                    "Organization user views certificate details on User Portal.",
                ],
                test_data="Expired: June 30, 2026; Approved: Sept 16, 2026.",
                expected_result="Because the accreditation had expired, privileges were suspended until approval. System calculates fresh 3-year term starting from current approval date (Sept 16, 2026 to Sept 16, 2029) while preserving the original historical URN.",
                pass_fail_criteria="Pass: Lapsed renewal establishes fresh 3-year term from approval date without changing official URN.\nFail: System applies retroactive anchor or issues a brand new URN.",
            ),
            TestCase(
                id="TC005",
                description="Verify PPA direct submission and transient duplicate draft prevention regression",
                preconditions="Accredited organization on User Portal > YPOP page with clean draft table.",
                steps=[
                    "User clicks 'Create New PPA' modal.",
                    "User inputs PPA Title, objectives, beneficiary count, and budget breakdown.",
                    "User uploads activity proposal PDF.",
                    "User clicks 'Submit for Review' directly without clicking 'Save as Draft'.",
                    "Observe immediate table updates.",
                    "Refresh the browser page.",
                ],
                test_data="Title: 'Community Eco-Clean Drive 2026', Beneficiaries: 120.",
                expected_result="PPA is submitted directly to 'Pending Review' table. No duplicate entry appears in 'Draft PPAs' table either before or after page refresh.",
                pass_fail_criteria="Pass: PPA appears solely in Pending Review queue without ghost/transient draft entries.\nFail: Transient duplicate draft row is created or persists.",
            ),
            TestCase(
                id="TC006",
                description="Verify PPA admin evaluation, score awarding, and user YPOP leaderboard reflection",
                preconditions="PPA submitted in Pending Review queue; Admin logged into Admin Portal > YPOP Validation.",
                steps=[
                    "Admin opens submitted PPA review drawer in YPOP Validation.",
                    "Admin reviews project details and verifies activity proposal attachment.",
                    "Admin enters score (e.g. 85 points) and selects 'Validated / Approved' with commendation remarks.",
                    "Admin clicks 'Submit Evaluation'.",
                    "Organization user navigates to User Portal > YPOP tab and refreshes.",
                ],
                test_data="PPA: 'Youth Entrepreneurship Workshop', Score: 85, Status: Validated.",
                expected_result="PPA status in Admin portal updates to 'Validated'. User Portal YPOP view reflects 85 points added to total organization standing, displays 'Approved' status badge, and shows updated leaderboard position.",
                pass_fail_criteria="Pass: Score awards sync accurately from admin review to user YPOP profile.\nFail: Score is missing, status remains pending, or points do not accumulate.",
            ),
            TestCase(
                id="TC007",
                description="Verify PPA needs revision and resubmission cycle across user and admin portals",
                preconditions="Submitted PPA under admin review.",
                steps=[
                    "Admin marks PPA as 'Needs Revision' with remarks: 'Provide detailed itemized transport budget in Annex B'.",
                    "Organization user views PPA list in User Portal > YPOP.",
                    "User verifies amber 'Needs Revision' badge and reads admin remarks.",
                    "User clicks 'Edit PPA', updates description, and uploads revised Annex B PDF.",
                    "User clicks 'Resubmit PPA'.",
                    "Admin navigates back to YPOP Validation queue.",
                ],
                test_data="PPA ID: PPA-2026-014, Revision note: 'Provide detailed itemized transport budget in Annex B'.",
                expected_result="User sees admin revision remarks clearly. Resubmission transitions PPA status to 'Pending Review' and updates Admin queue with revised proposal and timestamp.",
                pass_fail_criteria="Pass: Full revision loop operates smoothly across user and admin surfaces.\nFail: User cannot edit/resubmit or admin remarks are hidden.",
            ),
            TestCase(
                id="TC008",
                description="Verify end-to-end financial pipeline: request creation, partial variance approval with mouse wheel protection, and disbursement release",
                preconditions="Accredited organization; Admin with financial review authority; FY Budget set to ₱5,000,000.",
                steps=[
                    "User creates Budget Request for ₱100,000 with title 'Annual Leadership Camp'.",
                    "User uploads project proposal PDF and submits.",
                    "Admin opens Budget Requests queue in Admin Portal.",
                    "Admin opens request drawer, enters Approved Amount: ₱80,000, and verifies scrolling mouse wheel over amount input does NOT alter value.",
                    "Admin clicks 'Approve'.",
                    "Organization user views Budget Requests tab in User Portal.",
                    "Admin opens approved request and clicks 'Mark as Released' with voucher number 'DV-2026-088'.",
                    "Organization user refreshes User Portal > Budget Requests.",
                    "Admin inspects Admin Portal > Budget Monitoring overview.",
                ],
                test_data="Requested: ₱100,000, Approved: ₱80,000, Voucher: 'DV-2026-088'.",
                expected_result="Mouse wheel does not change numeric input. User portal displays Requested: ₱100,000 and Approved: ₱80,000 clearly differentiated. Upon release, user status transitions to 'Budget Released'. Admin Budget Monitoring reflects ₱80,000 in both Approved and Released metric cards.",
                pass_fail_criteria="Pass: Financial figures remain consistent across user request, admin variance approval, and disbursement monitoring.\nFail: Approved amount overwrites requested amount or metrics fail to update.",
            ),
            TestCase(
                id="TC009",
                description="Verify budget approval deficit handling in budget monitoring overview when exceeding annual allocation",
                preconditions="Annual FY Budget is ₱1,000,000 with ₱950,000 already approved (₱50,000 headroom remaining).",
                steps=[
                    "Organization submits Budget Request for ₱100,000.",
                    "Admin opens Budget Request drawer and enters Approved Amount: ₱100,000.",
                    "Admin clicks 'Approve'.",
                    "Observe system response.",
                    "Admin navigates to Admin Portal > Budget Monitoring > Overview tab.",
                ],
                test_data="Available: ₱50,000, Request: ₱100,000, Approved: ₱100,000.",
                expected_result="System does NOT hard-block approval. Request is successfully approved. In Budget Monitoring Overview, Approved Total reflects ₱1,050,000 and Remaining Headroom displays -₱50,000 with a prominent red 'Deficit' badge.",
                pass_fail_criteria="Pass: Approval succeeds and Budget Monitoring accurately visualizes the financial deficit.\nFail: System throws unhandled exception or corrupts headroom calculation.",
            ),
            TestCase(
                id="TC010",
                description="Verify automatic liquidation generation upon budget release",
                preconditions="Budget request approved by Admin.",
                steps=[
                    "Admin opens approved Budget Request and executes 'Mark as Released'.",
                    "Organization user navigates to User Portal > Liquidation tab.",
                    "Inspect liquidation reports table.",
                ],
                test_data="Released Request: 'Annual Leadership Camp' (₱80,000).",
                expected_result="System automatically generates a new liquidation report entry tied to the released budget request with status 'Pending Activity Completion' and target amount ₱80,000.",
                pass_fail_criteria="Pass: Liquidation record is automatically spawned upon disbursement release.\nFail: No liquidation record is created, requiring manual admin intervention.",
            ),
            TestCase(
                id="TC011",
                description="Verify liquidation revision cycle: admin feedback remarks, user receipt replacement, and final liquidated approval",
                preconditions="User has submitted liquidation report with official receipt scans; Admin in Liquidation Monitoring.",
                steps=[
                    "Admin reviews liquidation drawer, flags receipt scan as 'Needs Revision', and adds remark: 'Official receipt #4012 is unreadable; upload high-resolution scan'.",
                    "Admin saves review.",
                    "Organization user navigates to User Portal > Liquidation.",
                    "User observes amber 'Needs Revision' status and exact admin feedback.",
                    "User uploads replacement receipt PDF and clicks 'Resubmit Liquidation'.",
                    "Admin re-opens liquidation drawer, inspects replacement scan, and selects 'Mark as Liquidated'.",
                    "User and Admin portals refresh.",
                ],
                test_data="Receipt Scan PDF (2.4 MB), Feedback: 'Official receipt #4012 is unreadable; upload high-resolution scan'.",
                expected_result="Revision feedback displays accurately to user. Replacement file successfully uploads. Admin validates replacement and marks 'Liquidated'. User status updates to 'Liquidated' with green badge.",
                pass_fail_criteria="Pass: Liquidation revision and final approval cycle completes without data loss.\nFail: User cannot replace receipt or status fails to transition.",
            ),
            TestCase(
                id="TC012",
                description="Verify forms and templates archival isolation between admin management and public/user catalogs",
                preconditions="Active template 'Youth Council Resolution Guide.docx' published; Admin logged in.",
                steps=[
                    "Admin navigates to Admin Portal > Forms & Templates.",
                    "Admin finds 'Youth Council Resolution Guide.docx' and clicks 'Archive'.",
                    "Admin verifies template moves from 'Active' tab to 'Archived' tab (isActive = false).",
                    "Organization user opens User Portal > Templates catalog.",
                    "Anonymous citizen opens Public Information Portal > /public-templates.",
                    "Admin switches back to Admin Portal > Archived tab and clicks 'Restore'.",
                    "User and public portals refresh.",
                ],
                test_data="Template: 'Youth Council Resolution Guide.docx'.",
                expected_result="Archiving template immediately hides it from User Portal and Public /public-templates catalog. Template remains accessible in Admin 'Archived' tab. Restoring template instantly makes it visible in both User and Public catalogs.",
                pass_fail_criteria="Pass: Archived templates are strictly isolated from user/public catalogs and restored seamlessly.\nFail: Archived template remains downloadable by public/user.",
            ),
            TestCase(
                id="TC013",
                description="Verify forms and templates permanent deletion with historical submissions preserved",
                preconditions="A template has historical user document submissions attached to it.",
                steps=[
                    "Admin clicks 'Permanent Delete' on the template in Admin Portal.",
                    "Confirm deletion in safeguard modal.",
                    "Verify row vanishes immediately from the table without refresh.",
                    "Navigate to Registration Compliance and inspect historical compliance document submissions.",
                    "Confirm historical files remain accessible for download and all review remarks remain intact.",
                ],
                test_data="Template with linked submission records.",
                expected_result="Template is permanently removed from the active catalog. Historical submitted files, review statuses, and remarks remain fully accessible across compliance views. Remaining Admin template actions continue functioning smoothly.",
                pass_fail_criteria="Pass: Template permanently deletes while preserving historical user submissions and review data.\nFail: Deletion fails, or historical user files and remarks are lost.",
            ),
            TestCase(
                id="TC014",
                description="Verify news release publishing lifecycle and instant public/user cross-surface reflection",
                preconditions="Admin logged into Admin Portal > News Releases.",
                steps=[
                    "Admin creates article with Title '2026 Youth Innovation Grant Launch', content, category 'Grants', and banner image.",
                    "Admin sets status to 'Draft' and saves.",
                    "Check User News tab (/portal-news-releases) and Public News page (/news-releases).",
                    "Admin edits article and changes status to 'Published'.",
                    "Check User News tab and Public News page.",
                    "Admin changes status to 'Hidden'.",
                    "Check User News tab and Public News page.",
                ],
                test_data="News Article: '2026 Youth Innovation Grant Launch', Category: 'Grants'.",
                expected_result="Draft and Hidden articles are invisible to User Portal and Public /news-releases page. Once Published, article immediately appears in feeds with banner, title, and metadata. When Hidden, it is removed from public view.",
                pass_fail_criteria="Pass: Article visibility transitions sync across public and user portals according to status.\nFail: Draft or Hidden articles leak to public or user portals.",
            ),
            TestCase(
                id="TC015",
                description="Verify public inquiry submission to admin resolution and closed tab filtering fix",
                preconditions="Citizen on Public Contacts page (/contacts); Admin in Admin Portal > Inquiries.",
                steps=[
                    "Citizen fills out public inquiry form: Name 'Maria Santos', Email 'maria.santos@gmail.com', Category 'Accreditation Questions', Message 'Inquiring about 2026 renewal dates'.",
                    "Citizen submits form and receives reference code INQ-2026-XXXX.",
                    "Admin opens the newly received inquiry drawer in Admin Portal.",
                    "Admin updates status to 'Responded' then 'Closed'.",
                    "Admin navigates to 'Closed' status tab.",
                ],
                test_data="Public inquiry ticket.",
                expected_result="Inquiry appears in Admin Portal with 'Open' badge. Status transitions to 'Responded' and 'Closed' succeed. In 'Closed' tab, strictly closed tickets are listed (open and responded tickets are excluded).",
                pass_fail_criteria="Pass: Inquiry routes to admin, closes cleanly, and appears strictly under Closed tab.\nFail: Closed tab fails or shows open inquiries.",
            ),
            TestCase(
                id="TC016",
                description="Verify Google OAuth onboarding draft persistence, authorization safety, and immediate 100% dashboard completion",
                preconditions="New user signs in via Google OAuth without prior organization profile.",
                steps=[
                    "Complete Google OAuth sign-in.",
                    "Enter Organization Name, Classification, District, Barangay, and Head of Organization in onboarding wizard.",
                    "Switch tabs or refresh before final submission (verify draft persistence).",
                    "Submit profile and verify save without authorization errors.",
                    "Observe dashboard profile completion percentage widget.",
                ],
                test_data="Google OAuth user account.",
                expected_result="Onboarding wizard preserves draft data across tab switches and remounts. Profile saves cleanly without authorization errors. Dashboard immediately updates to 100% completion widget upon saving profile.",
                pass_fail_criteria="Pass: Google OAuth onboarding saves cleanly and dashboard reflects 100% completion immediately.\nFail: Save error occurs or dashboard shows 0%.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Multi-Organization Data & Resource Isolation Matrix
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Multi-Organization Data & Resource Isolation Matrix",
        test_cases=[
            TestCase(
                id="TC017",
                description="Verify strict data isolation between organizations for PPA drafts and budget proposals",
                preconditions="Organization A ('Youth Movement') and Organization B ('Student Alliance') both have active portal accounts.",
                steps=[
                    "Organization A logs in and creates a draft PPA ('Tree Planting Camp') and a draft budget request (₱50,000).",
                    "Organization A logs out.",
                    "Organization B logs in from the same or different browser.",
                    "Organization B navigates to User Portal > YPOP > Draft PPAs and Budget Requests > Drafts.",
                ],
                test_data="Org A: 'Youth Movement', Org B: 'Student Alliance'.",
                expected_result="Organization B's draft lists are completely empty (or contain only Org B's own records). Organization B cannot view, edit, or delete Organization A's drafts under any circumstance.",
                pass_fail_criteria="Pass: Draft records are strictly isolated by organization tenant ID.\nFail: Cross-organization draft data leaks or is editable.",
            ),
            TestCase(
                id="TC018",
                description="Verify compliance documents and uploaded financial files isolation between organizations",
                preconditions="Organization A has submitted sensitive compliance PDFs (Constitution, Member Roster) and official budget vouchers.",
                steps=[
                    "Organization B logs in and navigates to Document Compliance and Budget Requests.",
                    "Inspect all visible tables and download links.",
                    "Attempt to construct or paste file storage URL of Organization A's document in Organization B's browser session.",
                ],
                test_data="Target: Org A sensitive document attachment URL.",
                expected_result="Organization B cannot view, preview, download, edit, or replace Organization A's private documents or financial attachments through the Y-TRACE website.",
                pass_fail_criteria="Pass: Documents and file download URLs are strictly protected and isolated.\nFail: Organization B can access Org A's private legal/financial files.",
            ),
            TestCase(
                id="TC019",
                description="Verify notification feed isolation between distinct organizations",
                preconditions="Admin sends 'Needs Revision' notification regarding Budget Request specifically to Organization A.",
                steps=[
                    "Organization A logs in and observes notification bell with unread badge count (1).",
                    "Organization B logs in simultaneously in separate browser session.",
                    "Inspect Organization B's notification bell and dropdown list.",
                ],
                test_data="Target Notification: 'Budget Request BR-2026-004 requires revision'.",
                expected_result="Notification appears exclusively in Organization A's feed. Organization B's notification bell has 0 unread alerts and tray contains no references to Organization A's activities.",
                pass_fail_criteria="Pass: Notifications are delivered strictly to recipient organization.\nFail: Notification is broadcast or visible to unintended organizations.",
            ),
            TestCase(
                id="TC020",
                description="Verify liquidation report and receipt proof isolation across organizations",
                preconditions="Organization A has an active liquidation report with uploaded receipt scans.",
                steps=[
                    "Organization B logs into User Portal > Liquidation.",
                    "Inspect all liquidation history tables and drawer views.",
                ],
                test_data="Org A Liquidation: ₱80,000 disbursement report.",
                expected_result="Organization B cannot see Organization A's liquidation records, receipt attachments, or admin liquidation remarks. Only Org B's own liquidation items are rendered.",
                pass_fail_criteria="Pass: Liquidation records are strictly partitioned.\nFail: Organization B can view Org A's liquidation receipts.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Strict Role-Based Access Control (RBAC) Perimeter Security
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Strict Role-Based Access Control (RBAC) Perimeter Security",
        test_cases=[
            TestCase(
                id="TC021",
                description="Verify public anonymous visitor is blocked from accessing authenticated User Portal routes",
                preconditions="Browser session is unauthenticated (visitor not logged in).",
                steps=[
                    "Type the following routes directly into browser address bar:",
                    "1. http://localhost:5173/dashboard",
                    "2. http://localhost:5173/organization-profile",
                    "3. http://localhost:5173/document-submission",
                    "4. http://localhost:5173/budget-request",
                    "5. http://localhost:5173/ypop",
                    "Observe where the system redirects and what message or page is displayed.",
                ],
                test_data="Target routes: /dashboard, /organization-profile, /document-submission, /budget-request, /ypop.",
                expected_result="The system prevents unauthenticated access, suppresses user portal views, and redirects browser to /signin with an authentication prompt.",
                pass_fail_criteria="Pass: All user portal routes strictly require sign in.\nFail: User portal shell or organization data renders to unauthenticated visitor.",
            ),
            TestCase(
                id="TC022",
                description="Verify public anonymous visitor is blocked from accessing PCYDO Admin Portal routes",
                preconditions="Browser session is unauthenticated.",
                steps=[
                    "Type the following admin routes directly into browser address bar:",
                    "1. http://localhost:5173/admin",
                    "2. http://localhost:5173/admin/registrations",
                    "3. http://localhost:5173/admin/budget-monitoring",
                    "4. http://localhost:5173/admin/administrators",
                    "Observe where the system redirects and what message or page is displayed.",
                ],
                test_data="Target routes: /admin/*.",
                expected_result="The system blocks unauthenticated access, suppresses admin views, and redirects browser to /admin/signin (or /signin).",
                pass_fail_criteria="Pass: Admin routes strictly require administrator sign in.\nFail: Admin interface or municipal data leaks to unauthenticated user.",
            ),
            TestCase(
                id="TC023",
                description="Verify organization user is blocked from accessing PCYDO Admin Portal routes",
                preconditions="Tester is authenticated as standard Organization User in active portal session.",
                steps=[
                    "In the active organization session, enter URL: http://localhost:5173/admin.",
                    "Enter URL: http://localhost:5173/admin/budget-monitoring.",
                    "Enter URL: http://localhost:5173/admin/administrators.",
                    "Observe where the system redirects and what message or page is displayed.",
                ],
                test_data="Authenticated Role: 'organization_user', Target: /admin/*.",
                expected_result="System verifies user role, rejects administrative access, displays an 'Access Denied / Unauthorized' message or toast, and redirects back to /dashboard.",
                pass_fail_criteria="Pass: Organization role cannot access admin portal routes.\nFail: Admin dashboard loads or displays administrative controls.",
            ),
            TestCase(
                id="TC024",
                description="Verify standard Admin role is blocked from Super Admin administrator management controls",
                preconditions="Authenticated as standard PCYDO Admin (Role: 'unit_admin' / non-Super Admin).",
                steps=[
                    "Admin navigates to Admin Portal > Administrators tab or URL /admin/administrators.",
                    "Inspect visibility of 'Invite Administrator', 'Edit Role', and 'Deactivate Admin' buttons.",
                    "Attempt to trigger invite or modification actions.",
                ],
                test_data="Role: Standard Admin (Reviewer).",
                expected_result="Super Admin controls (Invite Admin, Edit Permissions, Deactivate Admin) are hidden or disabled with clear tooltip. Non-super administrators cannot access or trigger administrator account management actions.",
                pass_fail_criteria="Pass: Admin role hierarchy enforces strict Super Admin privileges.\nFail: Standard admin can invite or modify administrator accounts.",
            ),
            TestCase(
                id="TC025",
                description="Direct access to protected pages still requires the user to sign in",
                preconditions="Unauthenticated browser session.",
                steps=[
                    "Attempt route variations: /dashboard/../admin, /admin/../dashboard, /dashboard?redirect=/admin.",
                    "Try opening protected pages directly using modified URLs: /dashboard?auth=true.",
                    "Observe where the system redirects and what message or page is displayed.",
                ],
                test_data="Manipulated URLs.",
                expected_result="Direct access to protected pages still requires the user to sign in. Protected pages remain inaccessible through modified URLs, and the user is redirected to the appropriate sign-in or access-denied screen.",
                pass_fail_criteria="Pass: Protected pages remain inaccessible via modified URLs and redirect cleanly to sign-in or access-denied.\nFail: Protected routes render for unauthenticated user.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: State Persistence Across Browser Navigation & Refresh
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="State Persistence Across Browser Navigation & Refresh",
        test_cases=[
            TestCase(
                id="TC026",
                description="Verify organization profile edit state and browser leave warning on page refresh",
                preconditions="Organization user editing organization profile in User Portal.",
                steps=[
                    "User updates Mission/Vision statement and adds new officer name in form fields.",
                    "Without clicking 'Save Changes', user presses F5 or browser reload button.",
                    "Observe browser response.",
                ],
                test_data="Unsaved profile edits.",
                expected_result="Browser triggers 'Leave site? Changes you made may not be saved' confirmation dialog, preventing accidental data loss.",
                pass_fail_criteria="Pass: Unsaved changes warning prevents accidental loss of form entries.\nFail: Page reloads silently, wiping user edits without warning.",
            ),
            TestCase(
                id="TC027",
                description="Verify compliance review tab, active filters, and search state persistence across admin refresh",
                preconditions="Admin in Admin Portal > Registration Compliance tab with filter 'Pending Review' and search query 'District 2'.",
                steps=[
                    "Verify filtered list displays matching records.",
                    "Press browser refresh (F5).",
                    "Observe active tab, filter selections, and search input value upon page reload.",
                ],
                test_data="Tab: Registration Compliance, Filter: 'Pending Review', Search: 'District 2'.",
                expected_result="After refreshing the page, the selected tab, filters, and search text remain as expected.",
                pass_fail_criteria="Pass: Admin navigation state, filters, and search persist across browser refresh.\nFail: Page resets to default dashboard tab, losing active filter state.",
            ),
            TestCase(
                id="TC028",
                description="Verify budget request drawer state and session integrity across page refresh",
                preconditions="Admin viewing Budget Request detail drawer for request #BR-2026-0042.",
                steps=[
                    "With drawer open, press browser refresh (Ctrl+F5).",
                    "Observe page behavior upon reload.",
                ],
                test_data="Drawer: Budget Request #BR-2026-0042.",
                expected_result="Admin session remains active. Page reloads cleanly without Javascript errors, displaying the budget requests table with request #BR-2026-0042 readily accessible.",
                pass_fail_criteria="Pass: Refresh maintains session and stable view state.\nFail: Page crashes, logs user out, or displays white screen.",
            ),
            TestCase(
                id="TC029",
                description="Verify YPOP semester period selection persistence across internal portal navigation",
                preconditions="Admin in Admin Portal > YPOP Validation.",
                steps=[
                    "Admin selects specific evaluation period: '2026 - 1st Semester'.",
                    "Admin clicks on 'Budget Monitoring' tab in sidebar.",
                    "Admin performs review in Budget Monitoring.",
                    "Admin clicks back on 'YPOP Validation' tab in sidebar.",
                    "Inspect active period dropdown selection.",
                ],
                test_data="Period: '2026 - 1st Semester'.",
                expected_result="YPOP Validation remembers previously selected period ('2026 - 1st Semester') without resetting to current default period.",
                pass_fail_criteria="Pass: Period selection persists during intra-portal navigation.\nFail: Selection resets to default on every tab change.",
            ),
            TestCase(
                id="TC030",
                description="Verify notification read status synchronization across multi-tab sessions and page refresh",
                preconditions="User has 3 unread notifications; Portal open in Tab 1 and Tab 2.",
                steps=[
                    "In Tab 1, user opens notification menu and clicks 'Mark All as Read'.",
                    "Verify Tab 1 badge count changes from 3 to 0.",
                    "Switch to Tab 2 and refresh Tab 2.",
                    "Refresh Tab 1.",
                ],
                test_data="Unread Count: 3 -> 0.",
                expected_result="Both Tab 1 and Tab 2 display 0 unread notifications. State persists permanently across refreshes and is not lost on session reload.",
                pass_fail_criteria="Pass: Notification read state updates across multi-tab sessions and survives refresh.\nFail: Unread count reverts to 3 upon page refresh.",
            ),
            TestCase(
                id="TC031",
                description="Verify budget monitoring overview tab and fiscal year filter persistence",
                preconditions="Admin in Admin Portal > Budget Monitoring > Overview tab.",
                steps=[
                    "Admin switches Fiscal Year dropdown from current year to 'FY 2025'.",
                    "Verify charts and KPI metric cards update to reflect 2025 historical data.",
                    "Admin refreshes page.",
                ],
                test_data="Fiscal Year: 'FY 2025'.",
                expected_result="Page reloads and preserves 'FY 2025' selection in the application view, displaying 2025 data rather than reverting to current year.",
                pass_fail_criteria="Pass: Fiscal year selection persists across refresh.\nFail: Selection resets to current year without preserving admin context.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Cross-Surface Security, System Alerts & Standardized Exports
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Cross-Surface Security, System Alerts & Standardized Exports",
        test_cases=[
            TestCase(
                id="TC032",
                description="Verify automated cross-surface liquidation overdue warning to user and admin",
                preconditions="Disbursed budget request where activity completed >30 days ago with no liquidation submission.",
                steps=[
                    "Organization user logs into User Portal > Liquidation.",
                    "Admin logs into Admin Portal > Liquidation Monitoring.",
                    "Observe visual indicators on both surfaces.",
                ],
                test_data="Completed Activity Date: 35 days ago, Status: Overdue.",
                expected_result="User Portal displays prominent red 'Overdue' warning alert. Admin Portal flags record with red 'Overdue' badge and includes it in the 'Overdue' summary card count.",
                pass_fail_criteria="Pass: Overdue state is automatically computed and visually flagged across both portals.\nFail: Overdue records appear as normal pending items without warnings.",
            ),
            TestCase(
                id="TC033",
                description="Verify public budget snapshot synchronization with admin snapshot configuration",
                preconditions="Admin in Admin Portal > Budget Monitoring > Public Preview / Configuration tab.",
                steps=[
                    "Admin adds new funding source: 'Youth Tech Innovation Fund', Amount: ₱500,000.",
                    "Admin toggles 'Enable Public Transparency View' to Active.",
                    "Admin clicks 'Save Public Snapshot Configuration'.",
                    "Citizen opens Public Budget Transparency page (/budget-transparency) in anonymous browser session.",
                    "Inspect funding sources table and total budget chart.",
                ],
                test_data="Source: 'Youth Tech Innovation Fund', Amount: ₱500,000.",
                expected_result="Public /budget-transparency page instantly reflects the new funding source and updated municipal budget totals in charts and figures.",
                pass_fail_criteria="Pass: Public budget transparency page reflects admin configuration updates accurately.\nFail: Public page displays stale data or fails to reflect new funding sources.",
            ),
            TestCase(
                id="TC034",
                description="Verify password reset security and cross-browser session invalidation",
                preconditions="Organization user logged into active session on Browser A.",
                steps=[
                    "On Browser B, user requests password reset for the account.",
                    "User completes password reset via email link and updates password to 'NewSecretPass123!'.",
                    "User returns to Browser A and attempts to perform an authenticated action (e.g. submit PPA or save profile).",
                    "Observe system response on Browser A.",
                ],
                test_data="Account: test.org@example.com, New Password: 'NewSecretPass123!'.",
                expected_result="Browser A can no longer perform authenticated actions and requires the user to sign in again. System displays 'Session Expired' notification and redirects to /signin.",
                pass_fail_criteria="Pass: Password reset requires all other browser sessions to sign in again.\nFail: Old browser session remains active and can continue executing authenticated transactions.",
            ),
            TestCase(
                id="TC035",
                description="Verify admin account deactivation and immediate session revocation",
                preconditions="Super Admin in Admin Portal; Target Admin logged into active session on separate machine.",
                steps=[
                    "Super Admin navigates to Administrators management view.",
                    "Super Admin deactivates Target Admin's account.",
                    "Target Admin on separate machine attempts to approve a registration or switch tabs.",
                    "Observe response.",
                ],
                test_data="Target Admin: admin.reviewer@lydo.gov.ph (Deactivated).",
                expected_result="System revokes administrative session immediately upon the next user interaction or page action. Target Admin is redirected to /admin/signin with notice 'Your account has been deactivated'.",
                pass_fail_criteria="Pass: Deactivated admin session is immediately invalidated.\nFail: Deactivated admin can continue approving records or accessing data.",
            ),
            TestCase(
                id="TC036",
                description="Verify standardized Admin Export Dialogs (PDF paper sizes/orientation, Excel, CSV) across all administrative modules",
                preconditions="Admin is logged in and visits YORP Registry, Budget Utilization, Liquidation Monitoring, Budget Monitoring, Forms & Templates, and Activity Logs.",
                steps=[
                    "Click 'Export' button on each admin module.",
                    "Verify standard export modal appears with consistent UI.",
                    "Verify PDF paper sizes (A4, Short, Long, Legal, A3, Tabloid), orientation toggles (Portrait, Landscape), Excel (.xlsx), and CSV options.",
                    "Trigger sample exports on each module.",
                ],
                test_data="Export modals across all 6 administrative modules.",
                expected_result="Every admin module provides the standardized export modal dialog. PDF, Excel, and CSV files download cleanly with accurate module-specific column layouts and metadata headers.",
                pass_fail_criteria="Pass: Standardized export dialog operates uniformly across all admin modules.\nFail: Export dialog is missing, broken, or inconsistent across modules.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Cross-Surface Admin Desktop-Only Gate & Mobile Responsive Execution
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Cross-Surface Admin Desktop-Only Gate & Mobile Responsive Execution",
        test_cases=[
            TestCase(
                id="TC037",
                description="Verify Cross-Surface Workflows on Desktop Multi-Window Setup (>= 1024px)",
                preconditions="Tester arranges two browser windows side-by-side on 1920x1080 screen (Left: User Portal, Right: Admin Portal).",
                steps=[
                    "In Left window (User Portal), submit a new Budget Request for ₱50,000.",
                    "In Right window (Admin Portal), observe budget queue update.",
                    "In Right window, open budget drawer, enter Approved Amount ₱45,000, and click 'Approve'.",
                    "In Left window, verify real-time status update to 'Approved' with Approved Amount displayed.",
                ],
                test_data="Viewport: >= 1024px (Dual Split-Screen Desktop).",
                expected_result="Both windows operate simultaneously without layout clipping or session crosstalk. Approved amount and status synchronize accurately across user and admin surfaces.",
                pass_fail_criteria="Pass: Cross-surface multi-window desktop testing operates with immediate visual feedback.\nFail: Sessions conflict or UI elements collapse.",
            ),
            TestCase(
                id="TC038",
                description="Verify Organization Portal & Public Portal Responsive Workflows on Tablet & Mobile Viewports (< 1024px)",
                preconditions="Tester executes organization user and public visitor workflows on Tablet (768x1024) and Mobile (390x844).",
                steps=[
                    "On mobile/tablet, navigate through public website (Home, About, FAQs, Contacts, Public Templates).",
                    "Sign in as Organization user on mobile/tablet.",
                    "Navigate through Organization Dashboard, Profile, Document Submission, Budget Requests, Liquidation, and YPOP.",
                    "Submit replacement compliance document and check notifications.",
                ],
                test_data="Viewports: 768x1024, 390x844.",
                expected_result="All public and organization portal views adapt smoothly into responsive mobile cards, touch drawers, and thumb-friendly controls with zero horizontal overflow.",
                pass_fail_criteria="Pass: Public and Organization portals are 100% functional and responsive on mobile/tablet.\nFail: Layout overflows horizontally or controls are inaccessible.",
            ),
            TestCase(
                id="TC039",
                description="Verify Admin Desktop-Only Gate across ALL administrative routes on viewports < 1024px",
                preconditions="Tester configures browser viewport to < 1024px (e.g., 768x1024 tablet portrait or 390x844 mobile phone).",
                steps=[
                    "Navigate to each administrative route on mobile/tablet viewport:",
                    "1. /admin/dashboard",
                    "2. /admin/users (YORP Registry)",
                    "3. /admin/documents (Registration Compliance)",
                    "4. /admin/organization-renewals",
                    "5. /admin/ypop-activities",
                    "6. /admin/budget-utilization",
                    "7. /admin/liquidation-monitoring",
                    "8. /admin/budget-monitoring",
                    "9. /admin/templates",
                    "10. /admin/news",
                    "11. /admin/inquiries",
                    "12. /admin/activity-logs",
                    "Observe display on each route.",
                ],
                test_data="All admin routes on viewport < 1024px.",
                expected_result="Every administrative route displays the clear, informational Admin Desktop-Only Gate warning screen ('Desktop Experience Required'). No admin tables or complex drawers leak on mobile, preserving data security and desktop workflow integrity.",
                pass_fail_criteria="Pass: 100% of admin routes enforce desktop-only gate on viewports < 1024px.\nFail: Any admin route renders cramped/broken view without gating.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_17_groups()
    output_filename = "17_YTRACE_Desktop_Cross_Surface_Regression_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="17",
        section_title="Desktop Cross-Surface & Integration Regression Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

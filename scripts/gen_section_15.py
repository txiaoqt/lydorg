"""
Generator for Section 15: Inquiries, Notifications, & Audit Logs Black-Box Test Cases.
Document: 15_YTRACE_Inquiries_Notifications_Audit_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_15_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Public & Authenticated Inquiry Submission
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Public & Authenticated Inquiry Submission",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify public inquiry contact form layout and fields",
                preconditions="Public citizen navigates to Contacts page (/contacts).",
                steps=[
                    "Navigate to Contacts view (/contacts).",
                    "Inspect the inquiry form inputs.",
                    "Verify fields: Full Name, Email Address, Contact Number, Inquiry Category, Subject, and Message.",
                ],
                test_data="N/A",
                expected_result="The contact form renders with all required input fields, category selector, and submit action.",
                pass_fail_criteria="Pass: Contact form renders cleanly with all required inputs.\nFail: Form fails to load or is missing fields.",
            ),
            TestCase(
                id="TC002",
                description="Verify client validation on empty public inquiry submission",
                preconditions="Public contact form is open.",
                steps=[
                    "Leave Full Name, Email Address, Subject, and Message blank.",
                    "Click 'Submit Inquiry'.",
                ],
                test_data="Blank form fields.",
                expected_result="Submission is blocked. Validation errors highlight Name, Email, Subject, and Message as mandatory fields.",
                pass_fail_criteria="Pass: Empty submission is prevented with clear validation alerts.\nFail: Empty form submits without validation.",
            ),
            TestCase(
                id="TC003",
                description="Verify email format validation in public inquiry",
                preconditions="Public contact form is open.",
                steps=[
                    "Enter Name: 'Maria Santos'.",
                    "Enter Email: 'notanemail'.",
                    "Enter Subject: 'Question on YORP accreditation'.",
                    "Enter Message: 'Inquiring about requirements.'",
                    "Click 'Submit Inquiry'.",
                ],
                test_data="Email: 'notanemail'.",
                expected_result="System blocks submission and displays: 'Please enter a valid email address (e.g., name@example.com).'",
                pass_fail_criteria="Pass: Invalid email format is rejected.\nFail: Malformed email is accepted.",
            ),
            TestCase(
                id="TC004",
                description="Verify successful submission of public inquiry and tracking code generation",
                preconditions="Public contact form is open.",
                steps=[
                    "Enter Name: 'Juan Dela Cruz'.",
                    "Enter Email: 'juan.delacruz@example.com'.",
                    "Enter Contact Number: '09171234567'.",
                    "Select Category: 'Accreditation Inquiry'.",
                    "Enter Subject: 'Renewal eligibility guidelines'.",
                    "Enter Message: 'Good day. We would like to clarify if our organization is eligible for early renewal this month.'",
                    "Click 'Submit Inquiry'.",
                ],
                test_data="Valid inquiry inputs.",
                expected_result="Submission succeeds. A confirmation modal or banner displays: 'Thank you for reaching out. Your inquiry reference code is INQ-2026-XXXX. A copy has been dispatched to your email.'",
                pass_fail_criteria="Pass: Public inquiry submits cleanly and returns a tracking reference code.\nFail: Submission fails or generates no reference code.",
            ),
            TestCase(
                id="TC005",
                description="Verify opening Authenticated Inquiry modal in Organization Portal",
                preconditions="Organization user is logged in.",
                steps=[
                    "In Organization Portal, click 'Help & Inquiries' or '+ Submit Inquiry'.",
                    "Inspect the pre-populated modal fields.",
                ],
                test_data="Authenticated organization account.",
                expected_result="Modal opens with Organization Name, URN, and account email automatically pre-populated in read-only format. User only needs to enter Category, Subject, and Message.",
                pass_fail_criteria="Pass: Authenticated organization details are pre-filled.\nFail: Details must be retyped manually.",
            ),
            TestCase(
                id="TC006",
                description="Verify submission of Authenticated Organization Inquiry",
                preconditions="Authenticated inquiry modal is open.",
                steps=[
                    "Select Category: 'Budget Request Assistance'.",
                    "Enter Subject: 'Clarification on line item rental ceiling'.",
                    "Enter Message: 'Inquiring if venue rental can exceed 30% of total grant request.'",
                    "Click 'Submit Inquiry'.",
                ],
                test_data="Authenticated inquiry details.",
                expected_result="Inquiry submits and links directly to the organization's profile ID. Toast confirms 'Inquiry submitted successfully.'",
                pass_fail_criteria="Pass: Authenticated inquiry is submitted and linked to organization.\nFail: Submission fails.",
            ),
            TestCase(
                id="TC007",
                description="Verify User Portal Inquiries list displays submitted tickets and status",
                preconditions="Organization has submitted an inquiry.",
                steps=[
                    "Navigate to Organization Portal -> Inquiries tab.",
                    "Inspect the table of submitted inquiries.",
                    "Verify columns: Reference Code, Subject, Category, Submitted Date, and Status ('Open').",
                ],
                test_data="Submitted inquiry ticket.",
                expected_result="Ticket is listed with tracking code, blue 'Open' status pill, and submission timestamp.",
                pass_fail_criteria="Pass: User portal lists submitted inquiries with accurate status.\nFail: Inquiries list is empty or inaccurate.",
            ),
            TestCase(
                id="TC008",
                description="Verify Message length boundary: minimum characters requirement",
                preconditions="Inquiry form is open.",
                steps=[
                    "Enter Message: 'Hi' (2 characters).",
                    "Attempt submission.",
                ],
                test_data="Message: 'Hi'.",
                expected_result="System displays validation error: 'Message must be at least 10 characters long to provide sufficient detail.'",
                pass_fail_criteria="Pass: Abbreviated messages below minimum character limit are blocked.\nFail: 2-character message submits.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Admin Inquiry Queue, Drawer, Status Transitions & Closed Filter Fix
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Admin Inquiry Queue, Drawer, Status Transitions & Closed Filter Fix",
        test_cases=[
            TestCase(
                id="TC009",
                description="Verify Admin Portal Inquiries queue listing and columns",
                preconditions="Inquiries have been submitted to the system.",
                steps=[
                    "Sign in as Administrator and navigate to Admin Portal -> Inquiries.",
                    "Inspect the inquiries table.",
                    "Verify columns: Reference Code, Sender / Organization, Subject, Category, Date Received, and Status.",
                ],
                test_data="Admin inquiries table.",
                expected_result="Table lists all inquiries with formatted reference chips, sender metadata, category chips, and status pills.",
                pass_fail_criteria="Pass: Inquiries queue renders complete records and columns.\nFail: Queue is blank or columns truncated.",
            ),
            TestCase(
                id="TC010",
                description="CRITICAL UI FILTER FIX: Verify 'Closed' status tab displays strictly closed inquiries (status = 'closed')",
                preconditions="Inquiries exist in Open, Responded (reviewed), and Closed states.",
                steps=[
                    "Navigate to Admin Portal -> Inquiries.",
                    "Click tab 'Closed'.",
                    "Inspect all displayed inquiry rows.",
                    "Verify that ONLY tickets with status 'closed' are listed.",
                    "Verify that 'Open' and 'Responded' tickets are completely excluded.",
                    "Type a search keyword while on 'Closed' tab.",
                ],
                test_data="Closed status tab and keyword search.",
                expected_result="The 'Closed' tab strictly displays closed inquiries (`status = 'closed'`). Search filtering under the Closed tab functions accurately without resurrecting active or responded tickets.",
                pass_fail_criteria="Pass: Closed tab isolates closed tickets cleanly with working search.\nFail: Active/responded tickets leak or closed tickets disappear.",
            ),
            TestCase(
                id="TC011",
                description="Verify status tab filtering across All Status, Open, and Responded tabs",
                preconditions="Inquiries exist across all status states.",
                steps=[
                    "Click tab 'Open'.",
                    "Click tab 'Responded'.",
                    "Click tab 'All Status'.",
                ],
                test_data="Status filter tabs.",
                expected_result="Table isolates matching rows immediately for each tab. 'All Status' restores complete ticket list.",
                pass_fail_criteria="Pass: Status tabs filter inquiry records accurately.\nFail: Tab filtering fails or displays mismatched statuses.",
            ),
            TestCase(
                id="TC012",
                description="Verify search filtering by Reference Code, Sender Name, and Subject",
                preconditions="Admin is on Inquiries page.",
                steps=[
                    "Type reference code 'INQ-2026' into search input.",
                    "Type sender name into search input.",
                    "Clear search input.",
                ],
                test_data="Search queries.",
                expected_result="Search filter updates rows dynamically to matching tickets.",
                pass_fail_criteria="Pass: Search filters inquiries accurately.\nFail: Search fails.",
            ),
            TestCase(
                id="TC013",
                description="Verify opening Admin Inquiry Detail Drawer",
                preconditions="Admin clicks on an inquiry row.",
                steps=[
                    "Click row or 'View' action on inquiry.",
                    "Observe drawer opening from right.",
                    "Inspect drawer sections: Reference Code & Status, Sender Information, Subject & Category, Message Body, and Status Actions.",
                ],
                test_data="Inquiry ID.",
                expected_result="InquiryDetailDrawer slides open displaying sender details, organization badge, full message text, and action buttons.",
                pass_fail_criteria="Pass: Detail drawer renders complete inquiry contents.\nFail: Drawer fails to open.",
            ),
            TestCase(
                id="TC014",
                description="Verify 'Copy Email' action in Inquiry Detail Drawer",
                preconditions="Inquiry drawer is open.",
                steps=[
                    "Click 'Copy Email' button next to the sender email address.",
                    "Observe clipboard toast notification.",
                ],
                test_data="Sender email: 'juan.delacruz@example.com'.",
                expected_result="Toast confirms 'Copied: juan.delacruz@example.com copied to clipboard.' Email text is copied to system clipboard.",
                pass_fail_criteria="Pass: Copy email action copies address and provides toast confirmation.\nFail: Copy action fails.",
            ),
            TestCase(
                id="TC015",
                description="Verify Admin status transition: Mark as Responded",
                preconditions="Inquiry is in 'Open' status.",
                steps=[
                    "In drawer, click 'Mark as Responded' / 'Responded' button.",
                    "Observe status badge and table row update.",
                ],
                test_data="Status change to 'reviewed' (Responded).",
                expected_result="Status pill updates to green 'Responded'. In inquiries table, row updates to 'Responded'.",
                pass_fail_criteria="Pass: Inquiry status advances to Responded.\nFail: Status fails to update.",
            ),
            TestCase(
                id="TC016",
                description="Verify Admin status transition: Close Inquiry Ticket",
                preconditions="Inquiry is in 'Responded' status.",
                steps=[
                    "In drawer, click 'Close Ticket' / 'Closed'.",
                    "Confirm closing action.",
                ],
                test_data="Status change to 'closed'.",
                expected_result="Status pill updates to neutral 'Closed'. Ticket is archived from active open queue.",
                pass_fail_criteria="Pass: Ticket closes successfully.\nFail: Ticket remains open.",
            ),
            TestCase(
                id="TC017",
                description="Verify 'Reply via Email' action launches email client",
                preconditions="Inquiry drawer is open.",
                steps=[
                    "Click 'Reply via Email' button.",
                    "Inspect browser mailto trigger or reply dialog.",
                ],
                test_data="Reply action.",
                expected_result="System opens email client (mailto:) pre-populated with sender email, Subject 'Re: [Original Subject] [Reference Code]', and greeting template.",
                pass_fail_criteria="Pass: Reply action pre-populates email draft correctly.\nFail: Reply action fails to trigger.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: In-App Notifications System & Real-Time Navigation
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="In-App Notifications System & Real-Time Navigation",
        test_cases=[
            TestCase(
                id="TC018",
                description="Verify Notification Bell icon and unread counter badge display",
                preconditions="User has 3 unread notifications.",
                steps=[
                    "Log in to Organization Portal or Admin Portal.",
                    "Observe notification bell icon in top navigation header.",
                    "Inspect unread count badge.",
                ],
                test_data="3 unread notifications.",
                expected_result="Bell icon displays a badge showing '3'.",
                pass_fail_criteria="Pass: Unread badge reflects count accurately.\nFail: Badge is absent or count incorrect.",
            ),
            TestCase(
                id="TC019",
                description="Verify opening Notifications Popover list",
                preconditions="User clicks notification bell icon.",
                steps=[
                    "Click notification bell.",
                    "Inspect popover panel.",
                    "Verify notification items layout: Title, Description, Timestamp, and unread dot indicator.",
                ],
                test_data="Notifications popover.",
                expected_result="Popover opens displaying recent notifications ordered chronologically with newest first.",
                pass_fail_criteria="Pass: Popover renders notification items cleanly.\nFail: Popover fails to open.",
            ),
            TestCase(
                id="TC020",
                description="Verify marking individual notification as read upon click",
                preconditions="Popover is open with an unread notification item.",
                steps=[
                    "Click an unread notification item.",
                    "Observe visual state and badge counter.",
                ],
                test_data="Target unread notification.",
                expected_result="The unread dot on the notification item disappears. The unread badge counter in header decrements by 1.",
                pass_fail_criteria="Pass: Notification marks as read and counter updates.\nFail: Unread indicator persists.",
            ),
            TestCase(
                id="TC021",
                description="Verify 'Mark All as Read' action in notifications popover",
                preconditions="User has multiple unread notifications.",
                steps=[
                    "Open notifications popover.",
                    "Click 'Mark all as read'.",
                    "Inspect badge counter.",
                ],
                test_data="Mark all as read action.",
                expected_result="All notification items lose their unread indicators. Header unread badge disappears.",
                pass_fail_criteria="Pass: All notifications mark as read simultaneously.\nFail: Badge remains active.",
            ),
            TestCase(
                id="TC022",
                description="CRITICAL DEEP ROUTING: Budget Request Approved notification navigates to Budget Request drawer",
                preconditions="User receives notification: 'Your Budget Request [Title] was Approved'.",
                steps=[
                    "Open notifications popover.",
                    "Click the budget approval notification item.",
                    "Observe navigation destination.",
                ],
                test_data="Budget approval notification.",
                expected_result="System navigates directly to /budget-request and automatically opens the specific budget request drawer.",
                pass_fail_criteria="Pass: Clicking notification opens target budget request drawer.\nFail: Link fails or opens wrong page.",
            ),
            TestCase(
                id="TC023",
                description="CRITICAL DEEP ROUTING: Budget Needs Revision notification navigates to drawer feedback",
                preconditions="Admin flags budget request for revision.",
                steps=[
                    "User receives notification: 'Budget Request [Title] Needs Revision'.",
                    "Click notification item in popover.",
                    "Observe opened view.",
                ],
                test_data="Needs revision notification.",
                expected_result="System opens Budget Request drawer displaying the amber 'Admin Revision Feedback' banner with exact admin remarks.",
                pass_fail_criteria="Pass: Notification opens drawer showing admin revision feedback.\nFail: Navigation fails.",
            ),
            TestCase(
                id="TC024",
                description="CRITICAL DEEP ROUTING: Liquidation Overdue alert navigates to Liquidation upload drawer",
                preconditions="An activity liquidation has become overdue.",
                steps=[
                    "User clicks notification: 'Liquidation for [Activity] is OVERDUE'.",
                    "Observe navigation destination.",
                ],
                test_data="Overdue notification.",
                expected_result="System opens /liquidation-reporting and presents the overdue liquidation record drawer with file upload controls.",
                pass_fail_criteria="Pass: Notification directs user to liquidation submission view.\nFail: Link broken.",
            ),
            TestCase(
                id="TC025",
                description="CRITICAL DEEP ROUTING: Renewal Window Open alert navigates to Renewal Workspace",
                preconditions="Accreditation enters 90-day renewal eligibility window.",
                steps=[
                    "User clicks notification: 'Accreditation Renewal Window is Open'.",
                    "Observe destination.",
                ],
                test_data="Renewal notification.",
                expected_result="System navigates user directly to /organization-renewal workspace.",
                pass_fail_criteria="Pass: Notification opens renewal workspace.\nFail: Navigation fails.",
            ),
            TestCase(
                id="TC026",
                description="CRITICAL DEEP ROUTING: Compliance Document Feedback notification navigates to Document Submission",
                preconditions="Admin flags compliance document during registration review.",
                steps=[
                    "User clicks notification: 'Document [Doc Name] requires revision'.",
                    "Observe view.",
                ],
                test_data="Compliance revision notification.",
                expected_result="System opens /document-submission showing flagged document slot and replacement button.",
                pass_fail_criteria="Pass: Notification opens document submission view.\nFail: Navigation fails.",
            ),
            TestCase(
                id="TC027",
                description="Verify Administrative Announcement notification item",
                preconditions="LYDO administration posts an official announcement.",
                steps=[
                    "User inspects notifications popover.",
                    "Verify announcement item text, icon, and timestamp.",
                ],
                test_data="Announcement notification.",
                expected_result="Announcement displays with megaphone/speaker icon and distinct header tag.",
                pass_fail_criteria="Pass: Announcement notification renders cleanly.\nFail: Announcement fails to show.",
            ),
            TestCase(
                id="TC028",
                description="Verify Zero-Data state when user has no notifications",
                preconditions="User has zero notifications on record.",
                steps=[
                    "Click notification bell.",
                    "Inspect popover content.",
                ],
                test_data="Empty notifications.",
                expected_result="Popover displays: 'No notifications yet. You are all caught up.'",
                pass_fail_criteria="Pass: Empty notification state renders clear friendly message.\nFail: Popover renders blank.",
            ),
            TestCase(
                id="TC029",
                description="Verify notification persistence across page reloads",
                preconditions="User has notifications in read and unread states.",
                steps=[
                    "Perform browser hard reload (Ctrl + F5).",
                    "Inspect notification bell and popover.",
                ],
                test_data="Reload page.",
                expected_result="Notification list and read/unread states persist accurately without resetting.",
                pass_fail_criteria="Pass: Notification state persists across sessions.\nFail: Notifications disappear or reset.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Administrative Audit Trail, Description Column & Standardized Export
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Administrative Audit Trail, Description Column & Standardized Export",
        test_cases=[
            TestCase(
                id="TC030",
                description="Verify Admin Activity / Audit Logs table rendering and column layout (Description column)",
                preconditions="Administrator navigates to Admin Portal -> Activity Logs.",
                steps=[
                    "Open Activity Logs page.",
                    "Inspect table column headers.",
                    "Verify column layout: Timestamp, Administrator / User, Category Pill, Action Code, and Description.",
                ],
                test_data="Audit logs table.",
                expected_result="Table displays the expected records and current column layout, with the 'Description' column correctly showing activity notes (no obsolete 'Details' column).",
                pass_fail_criteria="Pass: Table displays the expected records and current column layout.\nFail: Table fails to load or column layout is outdated.",
            ),
            TestCase(
                id="TC031",
                description="Verify category pill filtering in Activity Logs (Organization, Budget, Liquidation, News, Document)",
                preconditions="Logs exist across various administrative actions.",
                steps=[
                    "Click 'Budget' category tab.",
                    "Click 'Liquidation' category tab.",
                    "Click 'Organization' category tab.",
                    "Click 'All' category tab.",
                ],
                test_data="Category filter pills.",
                expected_result="Table filters instantly to display only log entries matching the selected functional module.",
                pass_fail_criteria="Pass: Category filters isolate module logs accurately.\nFail: Filtering fails or displays wrong logs.",
            ),
            TestCase(
                id="TC032",
                description="Verify Date Range filtering in Activity Logs (All Time, 7 Days, 30 Days, 90 Days)",
                preconditions="Logs span multiple months.",
                steps=[
                    "Click Date Filter dropdown.",
                    "Select 'Last 7 days'.",
                    "Select 'Last 30 days'.",
                    "Select 'All time'.",
                ],
                test_data="Date range filter.",
                expected_result="Table updates dynamically to display only events that occurred within the selected time window.",
                pass_fail_criteria="Pass: Date range filter isolates time boundaries accurately.\nFail: Filtering produces out-of-range logs.",
            ),
            TestCase(
                id="TC033",
                description="Verify search in Activity Logs by Admin User, Organization, or Action",
                preconditions="Admin is on Activity Logs page.",
                steps=[
                    "Type 'approved' into search input.",
                    "Type an administrator's email or name.",
                    "Clear search input.",
                ],
                test_data="Search queries.",
                expected_result="Table filters matching log entries across user names, emails, and action descriptions.",
                pass_fail_criteria="Pass: Search filters audit records accurately.\nFail: Search fails.",
            ),
            TestCase(
                id="TC034",
                description="Verify audit log pagination controls",
                preconditions="More than 10 log entries exist (page size = 10).",
                steps=[
                    "Observe page 1 items.",
                    "Click next page chevron ('>').",
                    "Verify page 2 items.",
                    "Click previous page chevron ('<').",
                ],
                test_data="Page size: 10.",
                expected_result="Pagination advances and rewinds through audit log pages cleanly with page counter updating.",
                pass_fail_criteria="Pass: Pagination functions smoothly without error.\nFail: Pagination buttons do not work.",
            ),
            TestCase(
                id="TC035",
                description="Verify detail integrity: Admin user attribution and action change details",
                preconditions="An administrator executed a budget request approval.",
                steps=[
                    "Locate the 'budget_request.approved' log row.",
                    "Inspect Administrator column and Description column.",
                ],
                test_data="Budget approval log row.",
                expected_result="Row clearly attributes the action to the acting administrator's display name and email, specifies the target organization name, approved amount (e.g. ₱80,000.00), and exact timestamp.",
                pass_fail_criteria="Pass: Audit entry captures complete actor attribution and action change details.\nFail: Actor is anonymous or details are missing.",
            ),
            TestCase(
                id="TC036",
                description="Verify standardized Admin Export Dialog for Activity Logs (PDF, Excel, CSV with paper sizes & orientation)",
                preconditions="Admin is on Activity Logs page.",
                steps=[
                    "Click 'Export Logs' button.",
                    "Verify export modal opens with format options: PDF, Excel (.xlsx), CSV.",
                    "For PDF, verify paper size selector (A4, Short 8.5x11, Long 8.5x13, Legal, A3, Tabloid) and orientation toggle (Portrait, Landscape).",
                    "Confirm export, open the downloaded file, and inspect the exported column layout: Log ID, Date, Time, Action, Category, Description, Affected Record, Actor, Organization.",
                ],
                test_data="Export modal options.",
                expected_result="Standardized export dialog opens cleanly. Generating export produces complete audit trail matching current filters with the expected 9 columns (no obsolete IP Address column).",
                pass_fail_criteria="Pass: Standardized export dialog generates accurate PDF/Excel/CSV files.\nFail: Export errors out or generates empty file.",
            ),
            TestCase(
                id="TC037",
                description="Verify immutability: Audit log rows cannot be edited or deleted from the UI",
                preconditions="Admin views Activity Logs page.",
                steps=[
                    "Inspect table rows for Edit or Delete action buttons.",
                ],
                test_data="Audit logs table inspection.",
                expected_result="No Edit, Modify, or Delete buttons exist in the Activity Logs module. System audit logs are strictly append-only and immutable.",
                pass_fail_criteria="Pass: Audit logs provide no UI mechanism for alteration or deletion.\nFail: Edit or delete controls are present.",
            ),
            TestCase(
                id="TC038",
                description="Verify role-based access control: Non-admins cannot access Activity Logs",
                preconditions="Organization user attempts to access /admin/activity-logs.",
                steps=[
                    "Paste URL /admin/activity-logs into browser while logged in as an organization user.",
                ],
                test_data="Unauthorized URL access.",
                expected_result="Access is blocked. User is redirected to organization portal with unauthorized error.",
                pass_fail_criteria="Pass: System blocks unauthorized access to audit logs.\nFail: Organization user can view admin audit trail.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Inquiries, Notifications & Admin Desktop Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Inquiries, Notifications & Admin Desktop Gate",
        test_cases=[
            TestCase(
                id="TC039",
                description="Verify Inquiries, Notifications, and Audit Logs on Desktop Viewport (>= 1024px)",
                preconditions="Tester opens Desktop browser at >= 1024px resolution.",
                steps=[
                    "Log in as Admin and navigate to /admin/inquiries and /admin/notifications.",
                    "Verify inquiry drawer width, message thread readability, and side-by-side internal notes panel.",
                    "Click notification bell in header and verify popover menu with unread badge counter.",
                    "Navigate to /admin/activity-logs and inspect wide multi-column audit table with action filter sidebar.",
                ],
                test_data="Viewport: >= 1024px (Desktop Full HD).",
                expected_result="Desktop inquiries drawer opens with generous spacing. Notification menu displays formatted alerts with direct action links. Audit table renders all metadata columns without horizontal clipping.",
                pass_fail_criteria="Pass: Desktop views render inquiries, notifications, and logs cleanly with all tools available.\nFail: Popover menu is misplaced or audit columns collide.",
            ),
            TestCase(
                id="TC040",
                description="Verify Organization Inquiries and Notifications on Tablet & Mobile Viewports (< 1024px)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet) and 390x844 (Mobile).",
                steps=[
                    "Navigate to /app-inquiries as organization user.",
                    "Verify inquiry form inputs, category selector, and submit button are touch-friendly.",
                    "Tap notification bell on header and test navigation links in notification popover.",
                ],
                test_data="Viewports: 768x1024, 390x844.",
                expected_result="Organization inquiry form and notifications tray adapt smoothly into responsive mobile layouts with zero horizontal overflow and comfortable tap targets.",
                pass_fail_criteria="Pass: Organization inquiries and notifications are fully responsive on mobile/tablet.\nFail: Layout overflows or notification menu breaks.",
            ),
            TestCase(
                id="TC041",
                description="Verify Admin Desktop-Only Gate on /admin/inquiries and /admin/activity-logs on viewports < 1024px",
                preconditions="Tester opens Admin Inquiries or Activity Logs on viewport width < 1024px.",
                steps=[
                    "Navigate to /admin/inquiries and /admin/activity-logs on mobile/tablet viewports.",
                    "Observe screen content.",
                ],
                test_data="Viewport width: < 1024px.",
                expected_result="Admin Desktop-Only Gate warning screen is displayed ('Desktop Experience Required'). The administrative inquiry and audit review tools are safely gated from narrow devices.",
                pass_fail_criteria="Pass: Admin views display desktop-only warning gate on viewports < 1024px.\nFail: Cramped admin interfaces render without gating.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_15_groups()
    output_filename = "15_YTRACE_Inquiries_Notifications_Audit_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="15",
        section_title="Inquiries, Notifications, & Audit Logs Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

"""
Generator for Section 09: Budget Request Review & Release Pipeline Black-Box Test Cases.
Document: 09_YTRACE_Budget_Request_Review_Release_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_09_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Administrative Queue, Inspection & Review Controls
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Administrative Queue, Inspection & Review Controls",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify Admin Budget Requests queue listing and columns",
                preconditions="An organization user has submitted a budget request.",
                steps=[
                    "Sign in as Administrator and navigate to Admin Portal -> Budget Requests.",
                    "Locate the submitted request in the table.",
                    "Verify table columns: Reference Code, Organization, Activity Title, District & Barangay, Requested / Approved / Released Amounts, Status, and Actions.",
                ],
                test_data="Target budget request reference code.",
                expected_result="Request is listed with correct organization name, URN reference code, status pill 'Pending Review', and requested amount.",
                pass_fail_criteria="Pass: Request appears in queue with all required columns populated.\nFail: Request missing or columns truncated.",
            ),
            TestCase(
                id="TC002",
                description="Verify status tab filtering in Budget Requests table",
                preconditions="Requests exist across various lifecycle states.",
                steps=[
                    "Click tab 'Pending Review'.",
                    "Click tab 'Needs Revision'.",
                    "Click tab 'Onsite Required'.",
                    "Click tab 'Hardcopy Submitted'.",
                    "Click tab 'Released'.",
                    "Click tab 'All Status'.",
                ],
                test_data="Status tabs: Pending Review, Needs Revision, Onsite Required, Hardcopy Submitted, Released, All Status.",
                expected_result="Table filters instantly to display only rows matching the active status tab. 'All Status' restores complete list.",
                pass_fail_criteria="Pass: Tab filters isolate matching status states accurately.\nFail: Tab filters show mismatched statuses.",
            ),
            TestCase(
                id="TC003",
                description="Verify search and district/barangay filters in Budget Requests table",
                preconditions="Admin is on Budget Requests page with multiple organization entries.",
                steps=[
                    "Type organization name or activity title into search bar.",
                    "Select District 1 from district dropdown.",
                    "Select specific Barangay from dependent dropdown.",
                    "Clear search and reset filters.",
                ],
                test_data="Search: 'Youth Summit', District: 1, Barangay: San Nicolas.",
                expected_result="Table filters dynamically to matching records. Dependent barangay dropdown only lists barangays within District 1.",
                pass_fail_criteria="Pass: Search and geographic filters function without errors.\nFail: Filtering fails or shows inconsistent items.",
            ),
            TestCase(
                id="TC004",
                description="Verify opening Admin Budget Request Review Drawer",
                preconditions="Admin locates pending request row.",
                steps=[
                    "Click 'Review' (Eye icon) action button on the table row.",
                    "Observe drawer opening from the right side.",
                    "Inspect drawer layout: Organization snapshot, Activity Title, Target Date, Venue, Itemized Expenses table, and Proposal Document.",
                ],
                test_data="Budget Request ID.",
                expected_result="Review drawer slides open displaying complete request details, uploaded proposal file link, and review action controls.",
                pass_fail_criteria="Pass: Review drawer renders complete request information.\nFail: Drawer fails to open or renders blank.",
            ),
            TestCase(
                id="TC005",
                description="Verify preview and download of submitted Proposal PDF in Admin Drawer",
                preconditions="Admin review drawer is open.",
                steps=[
                    "Locate Proposal Document section in drawer.",
                    "Click 'View Document' / 'Preview'.",
                    "Click 'Download' button.",
                ],
                test_data="Submitted PDF proposal.",
                expected_result="Document preview modal opens and renders PDF pages accurately. Download action saves original PDF file to local machine.",
                pass_fail_criteria="Pass: Proposal can be previewed and downloaded cleanly.\nFail: Preview or download fails.",
            ),
            TestCase(
                id="TC006",
                description="Verify Admin Rejection workflow with mandatory justification remarks",
                preconditions="Admin review drawer is open for an ineligible budget request.",
                steps=[
                    "Select 'Reject' decision button.",
                    "Attempt to submit without entering remarks.",
                    "Enter mandatory remarks: 'Activity does not align with municipal youth priorities.'",
                    "Confirm rejection.",
                ],
                test_data="Rejection remarks: 'Activity does not align with municipal youth priorities.'",
                expected_result="Empty remarks submission is prevented. Confirming with remarks updates request status to 'Rejected' (red badge). Request is locked from further edits.",
                pass_fail_criteria="Pass: Rejection requires remarks and locks request in Rejected state.\nFail: Rejection succeeds without remarks or allows edits.",
            ),
            TestCase(
                id="TC007",
                description="Verify User Portal reflection of Rejected Budget Request",
                preconditions="Admin has rejected a budget request.",
                steps=[
                    "Log in as Organization user and open Budget Request workspace.",
                    "Locate the rejected request and open details drawer.",
                    "Observe status badge and admin rejection feedback.",
                ],
                test_data="Rejected request ID.",
                expected_result="Status displays red 'Rejected'. An alert box clearly presents the administrator's rejection remarks. No revision or resubmission actions are permitted.",
                pass_fail_criteria="Pass: User sees rejected badge and admin remarks in read-only state.\nFail: Remarks missing or user can resubmit.",
            ),
            TestCase(
                id="TC008",
                description="Verify Audit Log recording of review action",
                preconditions="Admin has performed a review decision on a budget request.",
                steps=[
                    "Navigate to Admin Portal -> Activity / Audit Logs.",
                    "Search for the request tracking code or organization name.",
                    "Inspect latest log entry.",
                ],
                test_data="Tracking code of reviewed request.",
                expected_result="An audit log entry is recorded showing Admin User, Action Type (e.g. 'budget_request.rejected' or 'budget_request.approved'), Timestamp, and action description.",
                pass_fail_criteria="Pass: Audit log records administrative action accurately.\nFail: Action not logged.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Explicit Approved Amount, Variance & Approval Workflow
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Explicit Approved Amount, Variance & Approval Workflow",
        test_cases=[
            TestCase(
                id="TC009",
                description="CRITICAL REGRESSION: Admin enters explicit Approved Amount equal to Requested Amount",
                preconditions="Request is under review with Requested Amount: ₱100,000.00.",
                steps=[
                    "In Admin review drawer, select 'Approve' / 'Approve for Onsite'.",
                    "Inspect the 'Approved Amount' input field in the approval dialog.",
                    "Verify field defaults to requested amount (₱100,000.00).",
                    "Confirm approval without changing amount.",
                ],
                test_data="Requested: ₱100,000.00, Approved: ₱100,000.00.",
                expected_result="Request status updates to 'Onsite Required'. In the table, Requested Amount displays ₱100,000 and Approved Amount displays ₱100,000. No variance indicator is displayed.",
                pass_fail_criteria="Pass: Approved Amount is stored as ₱100,000.00 with zero variance.\nFail: Approved amount is blank or miscalculated.",
            ),
            TestCase(
                id="TC010",
                description="CRITICAL REGRESSION: Admin enters explicit Approved Amount LESS than Requested Amount (Downward Variance)",
                preconditions="Request is under review with Requested Amount: ₱100,000.00.",
                steps=[
                    "In Admin review drawer, click 'Approve for Onsite'.",
                    "Change Approved Amount field to: 80000 (₱80,000.00).",
                    "Enter approval notes: 'Reduced funding for sound system rental.'",
                    "Confirm approval.",
                ],
                test_data="Requested: ₱100,000.00, Approved: ₱80,000.00.",
                expected_result="Request transitions to 'Onsite Required'. The Amount cell in the table displays:\n- Requested: ₱100,000\n- Approved: ₱80,000 with red downward arrow (↓ ₱20,000) indicating negative variance.",
                pass_fail_criteria="Pass: Distinct approved amount and red downward variance (↓ ₱20,000) display correctly.\nFail: Variance indicator missing or amounts overwritten.",
            ),
            TestCase(
                id="TC011",
                description="CRITICAL REGRESSION: Admin enters explicit Approved Amount GREATER than Requested Amount (Upward Variance)",
                preconditions="Request is under review with Requested Amount: ₱50,000.00.",
                steps=[
                    "In Admin review drawer, click 'Approve for Onsite'.",
                    "Change Approved Amount to: 65000 (₱65,000.00).",
                    "Enter approval notes: 'Additional subsidy granted for transportation.'",
                    "Confirm approval.",
                ],
                test_data="Requested: ₱50,000.00, Approved: ₱65,000.00.",
                expected_result="Request transitions to 'Onsite Required'. The Amount cell displays:\n- Requested: ₱50,000\n- Approved: ₱65,000 with green upward arrow (↑ ₱15,000) indicating positive variance.",
                pass_fail_criteria="Pass: Green upward arrow (↑ ₱15,000) reflects increased approved allocation.\nFail: Upward variance not indicated.",
            ),
            TestCase(
                id="TC012",
                description="Verify Approved Amount validation: zero and negative rejection",
                preconditions="Approval dialog is open.",
                steps=[
                    "Enter Approved Amount: 0.",
                    "Attempt to confirm.",
                    "Enter Approved Amount: -10000.",
                    "Attempt to confirm.",
                ],
                test_data="Approved Amount: 0, -10000.",
                expected_result="System blocks approval with validation error: 'Approved amount must be greater than zero.' Form does not submit.",
                pass_fail_criteria="Pass: Zero or negative approved amount is strictly rejected.\nFail: Zero or negative approval succeeds.",
            ),
            TestCase(
                id="TC013",
                description="Verify Approved Amount exceeding annual budget is permitted and creates Deficit in Budget Monitoring",
                preconditions="Remaining budget headroom is ₱50,000.00. An urgent budget request is under review for ₱150,000.00.",
                steps=[
                    "In Admin review drawer, approve request with Approved Amount: ₱150,000.00.",
                    "Confirm approval.",
                    "Navigate to Admin Portal -> Budget Monitoring.",
                    "Inspect Remaining Headroom card.",
                ],
                test_data="Approved Amount: ₱150,000.00 (Exceeds available headroom by ₱100,000.00).",
                expected_result="Approval executes successfully without blocking. Request advances to 'Onsite Required'. In Budget Monitoring, Remaining Headroom switches to red Deficit badge (-₱100,000.00) alerting the administration of overcommitment.",
                pass_fail_criteria="Pass: Approval succeeds and financial deficit is accurately reflected in Budget Monitoring.\nFail: Approval is incorrectly blocked or deficit fails to show in monitoring.",
            ),
            TestCase(
                id="TC014",
                description="CRITICAL REGRESSION: User Portal reflection of distinct Requested and Approved Amounts",
                preconditions="Admin approved request with Requested: ₱100,000.00 and Approved: ₱80,000.00.",
                steps=[
                    "Sign in as Organization user and open Budget Request workspace.",
                    "Locate approved request card and open details drawer.",
                    "Observe financial summary section.",
                ],
                test_data="Request with ₱100,000 requested and ₱80,000 approved.",
                expected_result="Drawer distinctly displays:\n- Requested Amount: ₱100,000.00\n- Approved Amount: ₱80,000.00\nStatus badge shows 'Onsite Required' / 'Approved for Onsite'.",
                pass_fail_criteria="Pass: User clearly sees both original requested and granted approved amounts.\nFail: Approved amount is missing or replaces requested amount.",
            ),
            TestCase(
                id="TC015",
                description="Verify In-App Notification dispatched to organization upon approval",
                preconditions="Admin approves budget request.",
                steps=[
                    "Log in as organization officer.",
                    "Click notification bell icon in top navigation header.",
                    "Inspect latest notification item.",
                ],
                test_data="Approved budget request notification.",
                expected_result="Notification item reads: 'Your Budget Request [Activity Title] has been approved for ₱80,000.00. Please prepare hardcopy documents for onsite submission.' Clicking item navigates to request drawer.",
                pass_fail_criteria="Pass: Notification reflects approved amount and next steps.\nFail: Notification missing or incorrect.",
            ),
            TestCase(
                id="TC016",
                description="Verify approval status and approved amount persistence across refresh",
                preconditions="Request is approved with Approved Amount: ₱80,000.00.",
                steps=[
                    "In Admin Portal, verify table row reflects 'Onsite Required' and ₱80,000.",
                    "Execute hard page refresh (Ctrl + F5).",
                    "Inspect table row again.",
                ],
                test_data="Approved request.",
                expected_result="Status remains 'Onsite Required' and approved amount remains exactly ₱80,000.00 with downward variance indicator intact.",
                pass_fail_criteria="Pass: State and amounts persist through page reloads.\nFail: State resets or approved amount is lost.",
            ),
            TestCase(
                id="TC017",
                description="CRITICAL UI INTERACTION: Approved Amount input mouse-wheel scroll prevention",
                preconditions="Admin review drawer is open with approval dialog displayed.",
                steps=[
                    "Focus or hover cursor directly over the Approved Amount numeric input field.",
                    "Scroll mouse wheel up and down vigorously.",
                    "Observe whether numeric value changes and whether drawer/page scrolls.",
                ],
                test_data="Initial Approved Amount: 122130.99.",
                expected_result="Numeric input value remains completely unchanged (122130.99). Wheel event is not captured by numeric stepper; drawer/page scrolls vertically as standard viewport behavior.",
                pass_fail_criteria="Pass: Mouse wheel does NOT change numeric input value; page scrolls naturally.\nFail: Mouse wheel increments or decrements the currency amount.",
            ),
            TestCase(
                id="TC018",
                description="CRITICAL STATE PRESERVATION: Review drawer dirty form state preservation without background polling resets",
                preconditions="Admin opens budget review drawer and enters uncommitted edits.",
                steps=[
                    "In review drawer, enter custom Approved Amount: 122130.99.",
                    "Select decision option 'Approve for Onsite'.",
                    "Type partial review notes: 'Awaiting updated quotation.'",
                    "Wait 30-60 seconds without clicking confirm (allowing background app cycles).",
                    "Observe drawer form fields.",
                ],
                test_data="Unsaved custom amount: 122130.99, notes: 'Awaiting updated quotation.'",
                expected_result="All entered values, selected decision, and notes remain perfectly intact. No periodic polling or background query destroys, resets, or reverts uncommitted admin inputs.",
                pass_fail_criteria="Pass: Form inputs persist without periodic reset or state loss.\nFail: Inputs reset to default or drawer clears unexpectedly.",
            ),
            TestCase(
                id="TC019",
                description="Verify submitted approved amount accurately displays exact entered decimal figure",
                preconditions="Admin review drawer is open for a submitted budget request.",
                steps=[
                    "In review drawer, enter Approved Amount: 122130.99.",
                    "Select approval decision and click 'Confirm Approval'.",
                    "Confirm submission succeeds with success notification.",
                    "Inspect the approved amount displayed in the Admin budget table, review summary, and User Portal budget view.",
                ],
                test_data="Approved Amount: 122130.99.",
                expected_result="The submission succeeds smoothly. The approved amount displayed across Admin review tables, detail summaries, and User-facing portal surfaces matches exactly ₱122,130.99 without truncation or decimal distortion.",
                pass_fail_criteria="Pass: Displayed approved amount matches entered decimal figure exactly (₱122,130.99).\nFail: Amount is truncated, rounded, or distorted.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Needs Revision, Admin Feedback & User Proposal Replacement
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Needs Revision, Admin Feedback & User Proposal Replacement",
        test_cases=[
            TestCase(
                id="TC020",
                description="Verify Admin 'Needs Revision' decision enforces mandatory feedback remarks",
                preconditions="Admin is reviewing a budget request with an incomplete proposal.",
                steps=[
                    "In Admin review drawer, click 'Needs Revision'.",
                    "Leave remarks input empty.",
                    "Attempt to click 'Confirm Needs Revision'.",
                ],
                test_data="Empty remarks.",
                expected_result="System blocks submission. Alert indicates: 'Please provide detailed remarks explaining what revisions are required.'",
                pass_fail_criteria="Pass: Revision remarks are mandatory for admin.\nFail: Request transitions to Needs Revision with empty remarks.",
            ),
            TestCase(
                id="TC021",
                description="Verify Admin submits 'Needs Revision' with detailed revision remarks",
                preconditions="Admin review drawer is open.",
                steps=[
                    "Click 'Needs Revision'.",
                    "Enter Remarks: 'Please attach official signed venue quotation and revise itemized meal costs.'",
                    "Click 'Confirm Needs Revision'.",
                ],
                test_data="Remarks: 'Please attach official signed venue quotation and revise itemized meal costs.'",
                expected_result="Request status updates to 'Needs Revision' (amber status pill). Admin remarks are saved to record. A notification is queued for the organization.",
                pass_fail_criteria="Pass: Status updates to Needs Revision and remarks are recorded.\nFail: Action fails or remarks are dropped.",
            ),
            TestCase(
                id="TC022",
                description="CRITICAL REGRESSION: User opens Budget Request drawer and views exact Admin Revision Remarks",
                preconditions="Admin has submitted Needs Revision remarks for the request.",
                steps=[
                    "Log in as Organization user and navigate to Budget Request workspace.",
                    "Locate request showing amber 'Needs Revision' badge.",
                    "Click to open the request details drawer.",
                    "Inspect the alert banner at the top of the drawer.",
                ],
                test_data="Request in 'Needs Revision' state.",
                expected_result="An amber warning alert box is prominently displayed at the top of the drawer with title 'Admin Revision Feedback' containing the EXACT administrator remarks: 'Please attach official signed venue quotation and revise itemized meal costs.'",
                pass_fail_criteria="Pass: User sees exact admin revision remarks in the drawer alert box.\nFail: Remarks are hidden or drawer fails to show feedback.",
            ),
            TestCase(
                id="TC023",
                description="CRITICAL REGRESSION: User can upload revised proposal document replacing the previous file",
                preconditions="User is in the Budget Request details drawer for an item in 'Needs Revision' status.",
                steps=[
                    "Locate Proposal Document section in drawer.",
                    "Verify 'Upload Revised Proposal' / 'Replace File' action button is present and active.",
                    "Click 'Upload Revised Proposal'.",
                    "Select revised PDF file 'Revised_Youth_Summit_Proposal_v2.pdf' (size: 2.8 MB).",
                    "Confirm upload.",
                ],
                test_data="Replacement file: 'Revised_Youth_Summit_Proposal_v2.pdf'.",
                expected_result="File uploads successfully. The document card updates immediately to show 'Revised_Youth_Summit_Proposal_v2.pdf' (2.8 MB). The old file is superseded, and the budget request remains linked to the same record ID.",
                pass_fail_criteria="Pass: Revised proposal uploads cleanly, replaces previous file, and maintains record ID.\nFail: Replacement fails or creates duplicate budget request.",
            ),
            TestCase(
                id="TC024",
                description="Verify user can update itemized expenses during revision",
                preconditions="User is revising budget request.",
                steps=[
                    "Click 'Edit Request Details'.",
                    "Adjust line item meal costs in the expense table to match admin feedback.",
                    "Update total requested amount if necessary.",
                    "Save modifications.",
                ],
                test_data="Updated expense line items.",
                expected_result="Line items and requested amount update successfully within the existing request record.",
                pass_fail_criteria="Pass: User can adjust itemized expenses while under revision.\nFail: Expense editing is locked during revision.",
            ),
            TestCase(
                id="TC025",
                description="CRITICAL REGRESSION: User resubmission transitions request back to 'Pending Review'",
                preconditions="User has uploaded revised proposal document and made necessary adjustments.",
                steps=[
                    "Click 'Resubmit Request' button in drawer.",
                    "Confirm resubmission in confirmation dialog.",
                    "Inspect request status badge.",
                ],
                test_data="Resubmission confirmation.",
                expected_result="Request status transitions from 'Needs Revision' to 'Pending Review' (or 'Resubmitted'). Controls are locked again. Success toast confirms 'Budget request resubmitted for administrative review.'",
                pass_fail_criteria="Pass: Status returns cleanly to Pending Review upon resubmission.\nFail: Status remains Needs Revision or fails to resubmit.",
            ),
            TestCase(
                id="TC026",
                description="Verify Admin review queue reflection of resubmitted request",
                preconditions="Organization user has resubmitted the revised request.",
                steps=[
                    "Sign in as Administrator and open Budget Requests table.",
                    "Locate the resubmitted request.",
                    "Open review drawer.",
                    "Verify current attached proposal document.",
                ],
                test_data="Resubmitted request tracking code.",
                expected_result="Request appears under 'Pending Review' tab. Review drawer renders the NEW 'Revised_Youth_Summit_Proposal_v2.pdf' file. Revision history shows previous feedback and resubmission timestamp.",
                pass_fail_criteria="Pass: Admin sees updated proposal file and review history.\nFail: Admin sees old file or missing history.",
            ),
            TestCase(
                id="TC027",
                description="Verify revision loop: Admin can approve resubmitted request with explicit Approved Amount",
                preconditions="Admin reviews the resubmitted proposal and finds it fully compliant.",
                steps=[
                    "Click 'Approve for Onsite'.",
                    "Enter Approved Amount: ₱95,000.00.",
                    "Confirm approval.",
                ],
                test_data="Approved Amount: ₱95,000.00.",
                expected_result="Request successfully transitions to 'Onsite Required' with Approved Amount stored as ₱95,000.00.",
                pass_fail_criteria="Pass: Resubmitted request is approved and advances in workflow.\nFail: Approval fails on resubmitted request.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Onsite Hardcopy, Budget Release, Auto-Liquidation & Bulk Deletion
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Onsite Hardcopy, Budget Release, Auto-Liquidation & Bulk Deletion",
        test_cases=[
            TestCase(
                id="TC028",
                description="Verify transition from 'Onsite Required' to 'Hardcopy Submitted'",
                preconditions="Organization officers have submitted physical signed documents at the LYDO office. Request is in 'Onsite Required'.",
                steps=[
                    "In Admin review drawer, locate Onsite Verification section.",
                    "Click 'Mark Hardcopy Received' / 'Hardcopy Submitted'.",
                    "Enter verification notes and received date.",
                    "Confirm transition.",
                ],
                test_data="Received date: Today.",
                expected_result="Request status updates to 'Hardcopy Submitted' (blue pill). Table row updates immediately. Organization is notified that hardcopies are accepted.",
                pass_fail_criteria="Pass: Status transitions to Hardcopy Submitted.\nFail: Transition fails.",
            ),
            TestCase(
                id="TC029",
                description="Verify Admin 'Release Budget' execution",
                preconditions="Request is in 'Hardcopy Submitted' status.",
                steps=[
                    "In Admin review drawer, click 'Release Budget'.",
                    "Verify confirmation modal displays Approved Amount: ₱95,000.00.",
                    "Enter Disbursement Voucher (DV) / Check Reference Number: 'DV-2026-0891'.",
                    "Click 'Confirm Budget Release'.",
                ],
                test_data="DV Reference: 'DV-2026-0891', Amount: ₱95,000.00.",
                expected_result="Status transitions to 'Budget Released'. Released Amount is recorded as ₱95,000.00. Table status updates to purple 'Budget Released' badge.",
                pass_fail_criteria="Pass: Budget release executes and records disbursement voucher details.\nFail: Release action errors or status does not update.",
            ),
            TestCase(
                id="TC030",
                description="CRITICAL CROSS-MODULE: Budget Release automatically generates linked Liquidation report",
                preconditions="Admin has just completed Budget Release in TC029.",
                steps=[
                    "Navigate to Admin Portal -> Liquidation Review queue.",
                    "Locate the organization entry for this activity.",
                    "Log in as the Organization user and navigate to Liquidation workspace.",
                ],
                test_data="Released budget request activity.",
                expected_result="A corresponding Liquidation report record is AUTOMATICALLY generated and linked to this budget request. Status begins at 'Pending Activity Completion' with target liquidation amount equal to Released Amount (₱95,000.00). User did NOT need to click 'Create Liquidation'.",
                pass_fail_criteria="Pass: Linked liquidation report is auto-created with accurate released amount.\nFail: No liquidation record is created.",
            ),
            TestCase(
                id="TC031",
                description="Verify Budget Monitoring calculation reflects Approved and Released amounts",
                preconditions="Budget release has occurred.",
                steps=[
                    "Navigate to Admin Portal -> Budget Monitoring.",
                    "Inspect Total Released budget counter and remaining headroom.",
                ],
                test_data="Released amount: ₱95,000.00.",
                expected_result="Total Released counter increments by ₱95,000.00. Available headroom decrements by ₱95,000.00 accurately.",
                pass_fail_criteria="Pass: Budget monitoring aggregates reflect released funds.\nFail: Financial metrics do not update.",
            ),
            TestCase(
                id="TC032",
                description="Verify multiple selection of budget request rows in Admin table",
                preconditions="Admin is on Budget Requests table with multiple requests listed.",
                steps=[
                    "Click checkbox on Row 1.",
                    "Click checkbox on Row 2.",
                    "Click header 'Select All' checkbox.",
                    "Observe selection counter bar.",
                ],
                test_data="Table checkboxes.",
                expected_result="Checked rows highlight. Floating action bar appears at the top displaying 'Selected: X items' with bulk action buttons ('Delete', 'Deselect All').",
                pass_fail_criteria="Pass: Multi-row selection works smoothly with selection counter.\nFail: Checkbox selection fails or does not show bulk bar.",
            ),
            TestCase(
                id="TC033",
                description="Verify Bulk Deletion of Draft/Cancelled requests with confirmation safeguard",
                preconditions="Multiple draft or cancelled requests are selected in the table.",
                steps=[
                    "Select 2 draft requests.",
                    "Click 'Delete Selected' in the bulk action bar.",
                    "Observe confirmation dialog warning.",
                    "Click 'Confirm Delete'.",
                ],
                test_data="2 draft requests.",
                expected_result="Confirmation dialog displays: 'Are you sure you want to delete 2 selected requests? This action cannot be undone.' Confirming removes the selected records. Table updates immediately.",
                pass_fail_criteria="Pass: Selected drafts are bulk deleted after confirmation.\nFail: Deletion executes without confirmation or fails to remove items.",
            ),
            TestCase(
                id="TC034",
                description="Verify deletion safeguard: Released and Active budget requests CANNOT be deleted",
                preconditions="Admin attempts to select a request in 'Budget Released' status for deletion.",
                steps=[
                    "Attempt to check the deletion box on a 'Budget Released' row or trigger delete.",
                    "Observe safeguard response.",
                ],
                test_data="Request with status: 'budget_released'.",
                expected_result="The checkbox is disabled or deletion is blocked: 'Requests with released funds or active liquidations cannot be deleted to preserve financial audit integrity.'",
                pass_fail_criteria="Pass: Released requests are protected against deletion.\nFail: Released request can be deleted.",
            ),
            TestCase(
                id="TC035",
                description="Verify standardized Admin Export Dialog for Budget Requests (PDF, Excel, CSV with paper sizes & orientation)",
                preconditions="Admin is on Budget Requests table.",
                steps=[
                    "Click 'Export' button in table toolbar.",
                    "Verify export modal opens with format options: PDF, Excel (.xlsx), CSV.",
                    "For PDF, verify paper size selector (A4, Short 8.5x11, Long 8.5x13, Legal, A3, Tabloid) and orientation toggle (Portrait, Landscape).",
                    "Select format and confirm export.",
                ],
                test_data="Export modal options.",
                expected_result="Standardized export dialog opens cleanly. Selecting format, paper size, and orientation triggers clean download of formatted budget request reports.",
                pass_fail_criteria="Pass: Standardized export dialog generates accurate PDF/Excel/CSV files.\nFail: Export dialog fails to open or produces corrupted files.",
            ),
            TestCase(
                id="TC036",
                description="Verify state machine enforcement against invalid transition shortcuts",
                preconditions="Request is in 'Pending Review' status.",
                steps=[
                    "Inspect available action buttons in review drawer.",
                    "Verify that 'Release Budget' button is disabled or not present.",
                ],
                test_data="Pending Review request.",
                expected_result="System strictly enforces lifecycle order: Budget cannot be released directly from 'Pending Review'. It must first be Approved and have Hardcopies Submitted.",
                pass_fail_criteria="Pass: Lifecycle steps are strictly sequential.\nFail: Admin can jump directly from Pending Review to Released.",
            ),
            TestCase(
                id="TC037",
                description="Verify persistent review state across browser refresh for Admin",
                preconditions="Request is in 'Onsite Required' with Approved Amount: ₱80,000.00.",
                steps=[
                    "Refresh Admin Portal page (Ctrl + F5).",
                    "Search and re-open the request in review drawer.",
                ],
                test_data="Request ID.",
                expected_result="All details, Approved Amount (₱80,000), status 'Onsite Required', and action buttons remain intact.",
                pass_fail_criteria="Pass: Admin drawer reflects persistent state after refresh.\nFail: Data resets or reverts.",
            ),
            TestCase(
                id="TC038",
                description="Verify non-admin users cannot access protected administrative review pages",
                preconditions="Organization user attempts to access /admin/budget-utilization.",
                steps=[
                    "Directly navigate to URL /admin/budget-utilization.",
                    "Observe access control behavior.",
                ],
                test_data="Unauthorized URL access.",
                expected_result="Access is denied. User is redirected to organization dashboard or shown an Access Denied notification.",
                pass_fail_criteria="Pass: Admin budget review page is restricted to administrators.\nFail: Non-admin can access review table.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Budget Review Queue & Admin Desktop-Only Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Budget Review Queue & Admin Desktop-Only Gate",
        test_cases=[
            TestCase(
                id="TC039",
                description="Verify Budget Request Review Table and Drawer on Desktop Viewport (1920x1080 and >= 1024px)",
                preconditions="Admin opens Desktop browser at >= 1024px resolution (e.g., 1920x1080, 1440x900).",
                steps=[
                    "Sign in as Admin and navigate to /admin/budget-utilization.",
                    "Verify full administrative layout: wide data table, status tabs, search and filter toolbar, multi-select checkboxes, and export trigger.",
                    "Open budget review drawer and verify side-by-side financial comparison, itemized expenses, and decision actions.",
                ],
                test_data="Viewport: >= 1024px (Desktop Full HD / Standard).",
                expected_result="Admin budget review table and drawer render completely with optimal column distribution, generous spacing, and full action capabilities. Zero blocking gates are displayed.",
                pass_fail_criteria="Pass: Desktop review workspace operates smoothly with all administrative tools available.\nFail: Desktop view is clipped or blocked.",
            ),
            TestCase(
                id="TC040",
                description="Verify Admin Desktop-Only Gate on Tablet Viewport (< 1024px, e.g., 768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait, width < 1024px).",
                steps=[
                    "Navigate to /admin/budget-utilization on tablet viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport: 768x1024 (width < 1024px).",
                expected_result="Admin Desktop-Only Gate warning screen is displayed ('Desktop Experience Required'). The administrative table and review drawer are blocked from rendering on narrow viewports to preserve data integrity.",
                pass_fail_criteria="Pass: Gate correctly blocks admin review interface on viewport < 1024px.\nFail: Admin interface renders or breaks without gating.",
            ),
            TestCase(
                id="TC041",
                description="Verify Admin Desktop-Only Gate on Mobile Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /admin/budget-utilization on mobile phone viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport: 390x844 (width < 1024px).",
                expected_result="Admin Desktop-Only Gate screen is displayed with clear informational text indicating that LYDO administrative management requires a desktop workstation (>= 1024px).",
                pass_fail_criteria="Pass: Mobile phone viewport displays desktop-only warning gate.\nFail: Mobile phone renders cramped admin table or breaks.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_09_groups()
    output_filename = "09_YTRACE_Budget_Request_Review_Release_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="09",
        section_title="Budget Request Review & Release Pipeline Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

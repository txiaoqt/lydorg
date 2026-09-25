"""
Generator for Section 10: Liquidation Reporting & Review Black-Box Test Cases.
Document: 10_YTRACE_Liquidation_Reporting_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_10_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Automatic Liquidation Generation & Activity Completion Waiting State
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Automatic Liquidation Generation & Activity Completion Waiting State",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify automatic generation of Liquidation record upon Budget Release",
                preconditions="Administrator releases budget for an approved project activity.",
                steps=[
                    "Admin confirms Budget Release in Budget Requests pipeline.",
                    "Sign in as the Organization user and navigate to Liquidation workspace (/liquidation-reporting).",
                    "Inspect the liquidation reports list.",
                ],
                test_data="Released budget request with Released Amount: ₱80,000.00.",
                expected_result="A Liquidation report record is automatically present in the list without the user having to create or initialize it manually. Target liquidation amount displays ₱80,000.00.",
                pass_fail_criteria="Pass: Liquidation record is auto-generated upon budget release.\nFail: No liquidation report appears.",
            ),
            TestCase(
                id="TC002",
                description="Verify initial 'Pending Activity Completion' status when activity date is in the future",
                preconditions="Budget is released for an activity scheduled for next month.",
                steps=[
                    "In Organization Portal -> Liquidation, open the auto-generated liquidation record.",
                    "Inspect the status badge and informational guidance banner.",
                ],
                test_data="Activity date: 30 days in future.",
                expected_result="Status badge displays 'Pending Activity Completion'. A guidance banner states: 'Liquidation documents can be submitted once the project activity is completed on [Activity Date].'",
                pass_fail_criteria="Pass: Record indicates Pending Activity Completion with clear explanatory text.\nFail: Status is incorrect or prompts premature submission.",
            ),
            TestCase(
                id="TC003",
                description="Verify document submission dropzone availability when activity date arrives",
                preconditions="Activity target date has arrived or passed.",
                steps=[
                    "Navigate to Liquidation workspace.",
                    "Open the liquidation report for the concluded activity.",
                    "Verify file upload slots for required liquidation documents.",
                ],
                test_data="Activity date: Today or in past.",
                expected_result="Document submission slots become active. The organization user can now upload Official Receipts, Photo Documentation, and Terminal Accomplishment Report.",
                pass_fail_criteria="Pass: File submission unlocks upon activity conclusion date.\nFail: Upload slots remain locked.",
            ),
            TestCase(
                id="TC004",
                description="Verify Admin Liquidation Monitoring queue displays 'Pending Activity Completion' and summary metric cards",
                preconditions="Budget released with future activity date.",
                steps=[
                    "Sign in as Administrator and navigate to Admin Portal -> Liquidation Monitoring.",
                    "Inspect summary metric cards at the top of the page.",
                    "Verify summary cards present: 'Pending Review' and 'Overdue' (no 'Submitted' card).",
                    "Inspect the liquidation table rows and columns.",
                    "Verify table has NO row selection checkboxes (Reference ID is first visible column).",
                ],
                test_data="Auto-generated liquidation report.",
                expected_result="Summary cards display 'Pending Review' and 'Overdue'. Table row displays Reference ID as first column, Organization Name, Activity Title, Released Amount, and status pill 'Pending Activity Completion'.",
                pass_fail_criteria="Pass: Summary cards and column layout match current specification without obsolete checkbox column.\nFail: Incorrect summary cards or obsolete select checkboxes rendered.",
            ),
            TestCase(
                id="TC005",
                description="Verify Admin review drawer in 'Pending Activity Completion' renders informational state only",
                preconditions="Admin clicks 'Review' on a liquidation record with 0 files uploaded and status 'Pending Activity Completion'.",
                steps=[
                    "Click 'Review' button on the table row.",
                    "Inspect the opened review drawer content.",
                    "Verify that decision buttons ('Approve Liquidation', 'Mark Overdue') are absent.",
                ],
                test_data="Pending Activity Completion report.",
                expected_result="Drawer renders purely informational card: 'The organization has not yet submitted its liquidation report. Liquidation documents can be submitted once the project activity is completed.' No approval dropdown or decision buttons are rendered.",
                pass_fail_criteria="Pass: Informational card renders without premature decision buttons.\nFail: Decision buttons appear before files are submitted.",
            ),
            TestCase(
                id="TC006",
                description="Verify liquidation submission deadline countdown display",
                preconditions="Activity has concluded. Standard 30-day post-activity liquidation window is active.",
                steps=[
                    "In Organization Liquidation drawer, observe the submission deadline date and remaining days counter.",
                ],
                test_data="Activity concluded 5 days ago; 25 days remaining before deadline.",
                expected_result="Drawer displays: 'Submission Deadline: [Date] (25 days remaining)'.",
                pass_fail_criteria="Pass: Deadline countdown is clearly visible to the organization.\nFail: Deadline missing.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: User Liquidation File Submission, Receipt Uploads & Deadlines
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="User Liquidation File Submission, Receipt Uploads & Deadlines",
        test_cases=[
            TestCase(
                id="TC007",
                description="Verify required liquidation document checklist display",
                preconditions="Organization user opens active liquidation workspace after activity completion.",
                steps=[
                    "Open liquidation details drawer.",
                    "Inspect the document requirements checklist: Official Receipts & Sales Invoices, Photo Documentation & Attendance, Summary of Expenses, Terminal Accomplishment Report.",
                ],
                test_data="Liquidation checklist.",
                expected_result="All mandatory liquidation document slots are listed with 'Not Submitted' status badges and upload buttons.",
                pass_fail_criteria="Pass: All required liquidation checklist items are rendered.\nFail: Checklist items missing.",
            ),
            TestCase(
                id="TC008",
                description="Verify successful upload of Official Receipts PDF (<25MB)",
                preconditions="Liquidation drawer is open.",
                steps=[
                    "Click 'Upload File' for 'Official Receipts & Sales Invoices'.",
                    "Select valid PDF 'Scanned_Official_Receipts.pdf' (size: 4.2 MB).",
                    "Observe upload progress and slot status.",
                ],
                test_data="File: 'Scanned_Official_Receipts.pdf', size: 4.2 MB.",
                expected_result="File uploads successfully. Slot displays filename, formatted size ('4.2 MB'), upload date, and 'Uploaded' badge. Preview and Replace options appear.",
                pass_fail_criteria="Pass: Receipts PDF uploads cleanly and displays file details.\nFail: Upload fails or errors out.",
            ),
            TestCase(
                id="TC009",
                description="Verify rejection of non-PDF uploads in liquidation slots",
                preconditions="Liquidation drawer is open.",
                steps=[
                    "Attempt to upload image file 'receipt.jpg' or Word file 'summary.docx'.",
                    "Observe validation alert.",
                ],
                test_data="File: 'receipt.jpg'.",
                expected_result="Upload is blocked. System displays: 'Only PDF documents are accepted for liquidation submissions.'",
                pass_fail_criteria="Pass: Non-PDF uploads are rejected.\nFail: Non-PDF files are accepted.",
            ),
            TestCase(
                id="TC010",
                description="Verify rejection of oversized file (>25MB) in liquidation upload",
                preconditions="Liquidation drawer is open.",
                steps=[
                    "Select a PDF file exceeding 25MB (e.g. 28 MB photo log).",
                    "Observe validation response.",
                ],
                test_data="File size: 28 MB.",
                expected_result="System rejects upload immediately with message: 'File size must not exceed 25MB.'",
                pass_fail_criteria="Pass: Files exceeding 25MB are blocked.\nFail: Oversized file uploads.",
            ),
            TestCase(
                id="TC011",
                description="Verify rejection of empty 0-byte PDF file",
                preconditions="Liquidation drawer is open.",
                steps=[
                    "Select 0-byte file 'empty_receipts.pdf'.",
                    "Observe validation response.",
                ],
                test_data="File size: 0 bytes.",
                expected_result="System displays: 'The selected PDF is empty.' Upload is aborted.",
                pass_fail_criteria="Pass: 0-byte file is rejected.\nFail: 0-byte file uploads.",
            ),
            TestCase(
                id="TC012",
                description="Verify preview modal for uploaded liquidation documents",
                preconditions="Receipts PDF has been uploaded.",
                steps=[
                    "Click 'Preview' (Eye icon) on the uploaded document card.",
                    "Verify document viewer renders PDF pages.",
                    "Close modal.",
                ],
                test_data="Uploaded PDF.",
                expected_result="PDF preview modal opens inline displaying scanned receipts clearly. Closing returns to drawer.",
                pass_fail_criteria="Pass: Preview works without errors.\nFail: Preview crashes or corrupts view.",
            ),
            TestCase(
                id="TC013",
                description="Verify submission completeness gate: all required liquidation files must be uploaded",
                preconditions="User has uploaded receipts but has not uploaded the Terminal Accomplishment Report.",
                steps=[
                    "Observe the 'Submit Liquidation Report' button.",
                    "Attempt to click submit.",
                ],
                test_data="Partial uploads (1 of 3 required files).",
                expected_result="'Submit Liquidation Report' button is disabled with notice indicating all required documents must be uploaded.",
                pass_fail_criteria="Pass: Incomplete liquidation packet cannot be submitted.\nFail: Partial submission is allowed.",
            ),
            TestCase(
                id="TC014",
                description="Verify formal submission of complete liquidation packet transitions status to 'Submitted' / 'Pending Review'",
                preconditions="All required liquidation PDF documents are uploaded.",
                steps=[
                    "Click 'Submit Liquidation Report'.",
                    "Confirm submission in confirmation dialog.",
                    "Observe status update.",
                ],
                test_data="Complete liquidation packet.",
                expected_result="Report submits successfully. Status transitions from 'Pending Activity Completion' to 'Submitted' (Pending Review). Editing is locked pending evaluation.",
                pass_fail_criteria="Pass: Status transitions to Submitted and locks editing.\nFail: Status fails to update.",
            ),
            TestCase(
                id="TC015",
                description="Verify submission persistence across browser reload",
                preconditions="User has submitted liquidation packet.",
                steps=[
                    "Refresh page (Ctrl + F5).",
                    "Re-open liquidation drawer.",
                ],
                test_data="Submitted liquidation report.",
                expected_result="Status remains 'Submitted', all uploaded files and timestamps remain intact.",
                pass_fail_criteria="Pass: Submitted state persists across reloads.\nFail: Files or status disappear.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Administrative File-by-File Review, Revisions & Onsite Workflow
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Administrative File-by-File Review, Revisions & Onsite Workflow",
        test_cases=[
            TestCase(
                id="TC016",
                description="Verify Admin Liquidation Monitoring queue reflects 'Pending Review' upon user submission",
                preconditions="Organization has submitted liquidation packet.",
                steps=[
                    "Sign in as Administrator and open Admin Portal -> Liquidation Monitoring.",
                    "Locate organization report entry.",
                    "Verify status pill updates to blue 'Pending Review'.",
                ],
                test_data="Submitted liquidation report.",
                expected_result="Table row reflects blue 'Pending Review' pill, submission timestamp, and uploaded document count.",
                pass_fail_criteria="Pass: Admin queue updates to Pending Review.\nFail: Queue remains in previous status.",
            ),
            TestCase(
                id="TC017",
                description="Verify opening Admin Liquidation Review Drawer renders single Review Decision panel",
                preconditions="Admin locates submitted liquidation report.",
                steps=[
                    "Click 'Review' action button on table row.",
                    "Observe drawer layout.",
                    "Verify Review Decision panel is present with 'Confirm Document Decision' action.",
                ],
                test_data="Liquidation Report ID.",
                expected_result="Review drawer slides open displaying submitted files with checkboxes, file preview links, and a single unified Review Decision panel.",
                pass_fail_criteria="Pass: Unified Review Decision panel renders cleanly.\nFail: Drawer renders obsolete fragmented buttons.",
            ),
            TestCase(
                id="TC018",
                description="Verify multi-file safety: Approving 1 of 2 files keeps parent report in Pending Review",
                preconditions="Liquidation packet contains File A ('Receipts.pdf') and File B ('Accomplishment_Report.pdf').",
                steps=[
                    "Select checkbox for File A only.",
                    "In decision panel, select 'Approve Document'.",
                    "Click 'Confirm Document Decision' -> 'Submit Review'.",
                    "Inspect parent liquidation report status.",
                ],
                test_data="File A approved; File B pending.",
                expected_result="File A status updates to 'Approved'. Parent liquidation report remains in 'Pending Review' (submitted) because File B is not yet approved.",
                pass_fail_criteria="Pass: Parent report stays in Pending Review when some files remain unapproved.\nFail: Parent report advances prematurely.",
            ),
            TestCase(
                id="TC019",
                description="Verify document rejection workflow with mandatory admin remarks",
                preconditions="Admin review drawer is open.",
                steps=[
                    "Select File A.",
                    "Select 'Needs Revision' in decision panel.",
                    "Leave remarks blank and attempt confirmation.",
                    "Enter remarks: 'Receipt #1042 is illegible; please provide clearer scan.'",
                    "Confirm decision.",
                ],
                test_data="Mandatory remarks: 'Receipt #1042 is illegible; please provide clearer scan.'",
                expected_result="Empty remarks confirmation is blocked. Saving with remarks sets File A status to 'Needs Revision' and saves feedback remarks to record.",
                pass_fail_criteria="Pass: Mandatory remarks enforced on revision decision.\nFail: Revision proceeds without remarks.",
            ),
            TestCase(
                id="TC020",
                description="Verify parent report transitions to 'Needs Revision' when at least 1 document requires revision",
                preconditions="Admin has set File A to 'Needs Revision' and saved review.",
                steps=[
                    "Inspect parent liquidation report status in table and drawer header.",
                ],
                test_data="Liquidation report with flagged document.",
                expected_result="Parent report status updates to amber 'Needs Revision'. Organization is notified with admin feedback.",
                pass_fail_criteria="Pass: Report updates to Needs Revision.\nFail: Status remains pending.",
            ),
            TestCase(
                id="TC021",
                description="Verify user replacement of rejected liquidation document",
                preconditions="Organization user opens liquidation drawer in 'Needs Revision' status.",
                steps=[
                    "Inspect flagged document slot showing amber badge and admin remarks.",
                    "Click 'Replace File'.",
                    "Select revised PDF 'Clear_Receipts_v2.pdf'.",
                    "Click 'Resubmit Liquidation Packet'.",
                ],
                test_data="Replacement file: 'Clear_Receipts_v2.pdf'.",
                expected_result="Replacement file uploads. Packet resubmission transitions status back to 'Pending Review'.",
                pass_fail_criteria="Pass: User replaces file and resubmits cleanly.\nFail: Replacement fails.",
            ),
            TestCase(
                id="TC022",
                description="Verify all documents approved transitions report to 'Onsite Required'",
                preconditions="Admin reviews resubmitted file and approves all documents in liquidation packet.",
                steps=[
                    "Select all document checkboxes.",
                    "Choose 'Approve Document' and confirm.",
                    "Submit complete review.",
                ],
                test_data="All liquidation files approved.",
                expected_result="Report status transitions to 'Onsite Required'. Guidance prompts organization to submit physical receipts at LYDO office.",
                pass_fail_criteria="Pass: Status advances to Onsite Required upon full document approval.\nFail: Transition fails.",
            ),
            TestCase(
                id="TC023",
                description="Verify Admin 'Mark Hardcopy Received' advances liquidation to 'Liquidated / Completed'",
                preconditions="Organization has presented physical receipts at the LYDO office. Report is in 'Onsite Required'.",
                steps=[
                    "In Admin review drawer, locate Onsite Physical Verification section.",
                    "Click 'Mark Hardcopy Received' / 'Confirm Onsite Verification'.",
                    "Enter verification notes: 'Physical receipts verified against digital uploads.'",
                    "Confirm action.",
                ],
                test_data="Onsite confirmation notes.",
                expected_result="Liquidation status transitions to green 'Liquidated' (Completed). Completion timestamp and admin actor are recorded. Organization receives final clearance notification.",
                pass_fail_criteria="Pass: Status transitions to Liquidated.\nFail: Transition fails or errors out.",
            ),
            TestCase(
                id="TC024",
                description="Verify User Portal reflects 'Liquidated' status and download of liquidation clearance",
                preconditions="Liquidation is marked as 'Liquidated'.",
                steps=[
                    "Log in as Organization user and open Liquidation workspace.",
                    "Inspect completed report card.",
                    "Click 'Download Clearance Summary' / 'View Summary'.",
                ],
                test_data="Completed liquidation.",
                expected_result="Report reflects green 'Liquidated' badge. User can download clearance summary confirming financial compliance.",
                pass_fail_criteria="Pass: User sees Liquidated status and summary.\nFail: Status missing or download broken.",
            ),
            TestCase(
                id="TC025",
                description="Verify Audit Log recording of liquidation approval and physical verification",
                preconditions="Admin completed liquidation verification.",
                steps=[
                    "Navigate to Admin Portal -> Activity Logs.",
                    "Filter by Category: 'Liquidation'.",
                    "Inspect latest log entry.",
                ],
                test_data="Liquidation activity logs.",
                expected_result="Log entry displays Action: 'liquidation.approved' / 'liquidation.completed', Administrator name, Organization, and Timestamp.",
                pass_fail_criteria="Pass: Liquidation actions are recorded in immutable audit trail.\nFail: Log entry missing.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Financial Accounting, Overdue Calculations & Standardized Export
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Financial Accounting, Overdue Calculations & Standardized Export",
        test_cases=[
            TestCase(
                id="TC026",
                description="Verify Budget Monitoring calculation reflects finalized liquidation amount",
                preconditions="Liquidation is finalized for ₱80,000.00.",
                steps=[
                    "Navigate to Admin Portal -> Budget Monitoring.",
                    "Inspect Total Liquidated metric card.",
                    "Inspect organization budget breakdown row.",
                ],
                test_data="Liquidated amount: ₱80,000.00.",
                expected_result="Total Liquidated counter increments by ₱80,000.00. Organization row reflects Total Liquidated = ₱80,000.00 and status 'Completed'.",
                pass_fail_criteria="Pass: Budget monitoring aggregates include newly liquidated amount.\nFail: Metric counters do not update.",
            ),
            TestCase(
                id="TC027",
                description="Verify Public Budget Transparency reflects liquidated funds",
                preconditions="Liquidation is finalized.",
                steps=[
                    "Navigate to Public Budget Transparency portal (/budget-transparency).",
                    "Inspect Financial Execution KPI cards.",
                ],
                test_data="Public transparency view.",
                expected_result="The 'Liquidated Funds' counter and execution percentage reflect the finalized liquidation without exposing private organization vouchers.",
                pass_fail_criteria="Pass: Public portal reflects accurate liquidated total.\nFail: Public portal shows discrepancy.",
            ),
            TestCase(
                id="TC028",
                description="Verify Automatic Overdue status transition when submission deadline lapses",
                preconditions="An activity completed more than 30 days ago. The organization has NOT submitted its liquidation report.",
                steps=[
                    "Navigate to Admin Portal -> Liquidation Monitoring.",
                    "Locate the lapsed activity report.",
                    "Inspect status pill.",
                ],
                test_data="Activity concluded >30 days ago; 0 files submitted.",
                expected_result="Status pill displays red 'Overdue'. System highlights the entry as past due.",
                pass_fail_criteria="Pass: Lapsed liquidation is automatically derived and displayed as Overdue.\nFail: Lapsed report remains in normal status.",
            ),
            TestCase(
                id="TC029",
                description="Verify User Portal warning for Overdue Liquidation",
                preconditions="Liquidation has lapsed into Overdue status.",
                steps=[
                    "Log in as the delinquent Organization user.",
                    "Inspect top dashboard warning banner and Liquidation workspace.",
                ],
                test_data="Overdue liquidation report.",
                expected_result="A prominent red alert banner warns: 'Liquidation for [Activity Title] is OVERDUE. Further budget requests and incentive disbursements are suspended until liquidation is submitted.'",
                pass_fail_criteria="Pass: Overdue warning banner alerts organization.\nFail: Overdue warning is absent.",
            ),
            TestCase(
                id="TC030",
                description="Verify Overdue Organization cannot submit new Budget Requests",
                preconditions="Organization has an Overdue Liquidation report on file.",
                steps=[
                    "Navigate to /budget-request.",
                    "Click '+ New Budget Request'.",
                ],
                test_data="Organization with overdue liquidation.",
                expected_result="New budget request creation is blocked with message: 'Cannot submit new budget requests while an existing activity liquidation is overdue.'",
                pass_fail_criteria="Pass: Overdue liquidations block subsequent budget requests.\nFail: User can request more funds while overdue.",
            ),
            TestCase(
                id="TC031",
                description="Verify filtering in Liquidation Reports table by Status, District, and Barangay",
                preconditions="Multiple liquidation reports exist across statuses (Pending Review, Needs Revision, Onsite Required, Liquidated, Overdue).",
                steps=[
                    "Click tab 'Pending Review'.",
                    "Click tab 'Liquidated'.",
                    "Click tab 'All Status'.",
                    "Filter by District 1 and Barangay San Nicolas.",
                ],
                test_data="Filters: Status tabs, District, Barangay.",
                expected_result="Table filters dynamically to matching rows. Dependent barangay dropdown only displays barangays in selected district.",
                pass_fail_criteria="Pass: Table filtering functions accurately.\nFail: Filtering produces incorrect rows.",
            ),
            TestCase(
                id="TC032",
                description="Verify standardized Admin Export Dialog for Liquidation Monitoring (PDF, Excel, CSV with paper sizes & orientation)",
                preconditions="Admin is on Liquidation Monitoring page.",
                steps=[
                    "Click 'Export' button in table toolbar.",
                    "Verify export modal opens with format options: PDF, Excel (.xlsx), CSV.",
                    "For PDF, verify paper size selector (A4, Short 8.5x11, Long 8.5x13, Legal, A3, Tabloid) and orientation toggle (Portrait, Landscape).",
                    "Confirm export generation.",
                ],
                test_data="Export modal options.",
                expected_result="Standardized export dialog opens cleanly. Selecting format, paper size, and orientation triggers clean download of formatted liquidation reports.",
                pass_fail_criteria="Pass: Standardized export dialog generates accurate PDF/Excel/CSV files.\nFail: Export dialog fails to open or produces corrupted files.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Liquidation Workspace & Admin Desktop-Only Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Liquidation Workspace & Admin Desktop-Only Gate",
        test_cases=[
            TestCase(
                id="TC033",
                description="Verify Liquidation Workspace on Desktop Viewport (>= 1024px)",
                preconditions="Tester opens Desktop browser at >= 1024px resolution (e.g., 1920x1080).",
                steps=[
                    "Navigate to /liquidation-reporting as organization user with active liquidation.",
                    "Verify side-by-side disbursement summary, receipt upload slot cards, and full PDF preview modal.",
                    "Sign in as Admin and open /admin/liquidation-monitoring.",
                    "Verify admin liquidation monitoring table, summary metric cards ('Pending Review', 'Overdue'), and review drawer.",
                ],
                test_data="Viewport: >= 1024px (Desktop Full HD).",
                expected_result="Desktop liquidation layout renders financial figures and receipt slots with generous margins. Admin monitoring workspace renders complete table and side-over review drawer with zero gating restrictions.",
                pass_fail_criteria="Pass: Desktop liquidation views render cleanly with optimal spacing and full controls.\nFail: Layout elements overlap or view is blocked.",
            ),
            TestCase(
                id="TC034",
                description="Verify Organization Liquidation Workspace on Tablet & Phone Viewports (< 1024px)",
                preconditions="Organization user accesses /liquidation-reporting on Tablet (768x1024) and Mobile Phone (390x844).",
                steps=[
                    "Navigate to /liquidation-reporting on mobile/tablet viewports.",
                    "Inspect disbursement summary card, checklist upload slots, and replace file actions.",
                    "Upload sample PDF receipt and confirm submission.",
                ],
                test_data="Viewports: 768x1024, 390x844.",
                expected_result="Organization liquidation workspace adapts smoothly into stacked mobile cards with touch-friendly tap targets and zero horizontal overflow. File uploads and submissions work seamlessly on mobile.",
                pass_fail_criteria="Pass: Organization mobile liquidation workspace is fully functional and responsive.\nFail: Layout overflows horizontally or file inputs fail.",
            ),
            TestCase(
                id="TC035",
                description="Verify Admin Desktop-Only Gate on /admin/liquidation-monitoring on viewports < 1024px",
                preconditions="Tester configures browser viewport to < 1024px (e.g., 768x1024 tablet portrait or 390x844 phone).",
                steps=[
                    "Navigate to /admin/liquidation-monitoring on mobile/tablet viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport width: < 1024px.",
                expected_result="Admin Desktop-Only Gate warning screen is displayed ('Desktop Experience Required'). The administrative liquidation table and drawer are safely gated on narrow devices.",
                pass_fail_criteria="Pass: Admin liquidation route correctly displays desktop-only warning gate.\nFail: Unusable cramped admin table renders or errors out.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_10_groups()
    output_filename = "10_YTRACE_Liquidation_Reporting_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="10",
        section_title="Liquidation Reporting & Review Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

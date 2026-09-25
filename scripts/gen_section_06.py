"""
Generator for Section 06: YORP Accreditation Renewal Workflow Black-Box Test Cases.
Document: 06_YTRACE_YORP_Renewal_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_06_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Accreditation Expiry, Renewal Window & No-Grace Enforcement
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Accreditation Expiry, Renewal Window & No-Grace Enforcement",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify renewal countdown chip display when accreditation is active (>90 days before expiry)",
                preconditions="Organization user is logged in with an active accreditation ending more than 90 days from the current date.",
                steps=[
                    "Navigate to Organization Portal Dashboard.",
                    "Observe the accreditation status chip in the top summary banner.",
                    "Note the displayed days remaining and action button availability.",
                ],
                test_data="Accreditation end date: >90 days in future (e.g. 180 days remaining).",
                expected_result="The countdown chip displays 'Active' with the number of days remaining. The 'Renew Accreditation' button remains disabled or hidden, indicating the renewal window is not yet open.",
                pass_fail_criteria="Pass: The chip displays active validity and prevents renewal application initiation outside the eligible window.\nFail: Renewal button is active prematurely.",
            ),
            TestCase(
                id="TC002",
                description="Verify countdown chip and renewal initiation activation at early renewal window (<=90 days before expiry)",
                preconditions="Organization user is logged in with an active accreditation ending in 90 days or fewer.",
                steps=[
                    "Navigate to Organization Portal Dashboard.",
                    "Observe the accreditation status chip and banner.",
                    "Verify the presence and interactive state of the 'Renew Accreditation' action button.",
                ],
                test_data="Accreditation end date: 60 days in future.",
                expected_result="The countdown chip displays 'Expiring Soon' with an amber warning badge. The 'Renew Accreditation' button becomes active and clickable.",
                pass_fail_criteria="Pass: The renewal window opens automatically 90 days prior to accreditation expiration.\nFail: Renewal button remains locked.",
            ),
            TestCase(
                id="TC003",
                description="Verify expiration status and 180-day late renewal window without grace period privileges",
                preconditions="Organization user is logged in with an accreditation that expired within the past 180 days.",
                steps=[
                    "Navigate to Organization Portal Dashboard.",
                    "Observe the accreditation status chip, warning banner, and feature access.",
                    "Attempt to create a new Budget Request or submit YPOP point activity.",
                    "Verify availability of the 'Renew Accreditation' button.",
                ],
                test_data="Accreditation end date: 15 days in past (within 180-day window).",
                expected_result="Status displays 'Expired' in a red danger badge. Warning banner informs the user that accreditation has lapsed but remains eligible for renewal within 180 days. Crucially, NO grace period exists: budget request creation and YPOP point-earning privileges remain strictly paused until renewal approval. 'Renew Accreditation' button remains accessible.",
                pass_fail_criteria="Pass: Status is Expired, privileges are paused (no grace period), and renewal is accessible within 180 days.\nFail: System grants active grace privileges after expiration.",
            ),
            TestCase(
                id="TC004",
                description="Verify renewal cutoff enforcement when accreditation is expired beyond 180 days",
                preconditions="Organization user is logged in with an accreditation expired more than 180 days ago.",
                steps=[
                    "Navigate to Organization Portal Dashboard.",
                    "Check the accreditation status banner and renewal actions.",
                    "Attempt to initiate a renewal.",
                ],
                test_data="Accreditation end date: 200 days in past.",
                expected_result="The system displays 'Accreditation Expired - Renewal Cutoff Exceeded'. The renewal option is strictly disabled, and the organization is required to undergo fresh accreditation registration.",
                pass_fail_criteria="Pass: Renewals beyond the 180-day cutoff are strictly locked requiring fresh registration.\nFail: User can initiate renewal after cutoff.",
            ),
            TestCase(
                id="TC005",
                description="Verify initiation of renewal application creates a new renewal cycle draft",
                preconditions="Organization is eligible for renewal (within 90-day pre-expiry or 180-day post-expiry window).",
                steps=[
                    "Click 'Renew Accreditation' on the dashboard banner.",
                    "Observe navigation to the Renewal Workspace.",
                    "Verify initial renewal record creation.",
                ],
                test_data="Authenticated organization leader clicking 'Renew Accreditation'.",
                expected_result="A new renewal cycle record is initialized in Draft status. The user is redirected to the Renewal Workspace (/organization-renewal) showing the current cycle number and document checklist.",
                pass_fail_criteria="Pass: The renewal draft initializes cleanly without duplicate draft records.\nFail: Renewal fails to initialize or generates multiple drafts.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Renewal Workspace & Document Uploads
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Renewal Workspace & Document Uploads",
        test_cases=[
            TestCase(
                id="TC006",
                description="Verify Renewal Workspace initial display and required document checklist loading",
                preconditions="User is in the Renewal Workspace for an initialized renewal draft.",
                steps=[
                    "Inspect the Renewal Workspace header, organization details, and cycle info.",
                    "Verify the list of required renewal document types fetched from the template configuration.",
                    "Check completion progress indicator.",
                ],
                test_data="Renewal draft with dynamic required templates.",
                expected_result="All mandatory renewal document types are displayed with 'Missing' status badges. The completion progress bar displays 0%. 'Submit Renewal' button is disabled.",
                pass_fail_criteria="Pass: All configured renewal requirements are listed with initial missing status.\nFail: Document checklist is incomplete or missing.",
            ),
            TestCase(
                id="TC007",
                description="Verify 'Submit Renewal' button completeness gate enforcement",
                preconditions="User has uploaded some but not all required renewal documents.",
                steps=[
                    "In Renewal Workspace, upload files for 2 of 4 required documents.",
                    "Observe the completion percentage and the 'Submit Renewal' button.",
                    "Attempt to click 'Submit Renewal'.",
                ],
                test_data="2 uploaded PDFs, 2 missing required documents.",
                expected_result="Progress bar indicates partial completion (e.g. 50%). 'Submit Renewal' button remains disabled with tooltip or alert indicating all required documents must be uploaded.",
                pass_fail_criteria="Pass: Partial submissions are strictly blocked by the UI completeness gate.\nFail: Partial submission is permitted.",
            ),
            TestCase(
                id="TC008",
                description="Verify successful upload of a valid PDF document (<25MB)",
                preconditions="Renewal Workspace is open with missing document slots.",
                steps=[
                    "Click 'Upload File' for 'Accomplishment Report'.",
                    "Select a valid PDF document (size: 3.5 MB, header '%PDF-1.4').",
                    "Confirm upload progress and card state update.",
                ],
                test_data="File: '2025_Accomplishment_Report.pdf', size: 3.5 MB.",
                expected_result="Upload completes successfully. Status badge changes from 'Missing' to 'Uploaded'. Document filename, formatted size ('3.5 MB'), and upload date are displayed. View and Replace options appear.",
                pass_fail_criteria="Pass: Valid PDF uploads smoothly and updates the document card.\nFail: Upload errors out or fails to display file metadata.",
            ),
            TestCase(
                id="TC009",
                description="Verify upload rejection of non-PDF file format",
                preconditions="User attempts to upload a non-PDF file for a renewal requirement.",
                steps=[
                    "Click 'Upload File' on a document requirement card.",
                    "Select a Word document ('report.docx') or image ('receipt.png').",
                    "Observe client validation response.",
                ],
                test_data="File: 'Accomplishments.docx'.",
                expected_result="Upload is immediately blocked. A validation toast or inline alert displays: 'Only PDF files can be uploaded for this renewal submission.' No file is stored.",
                pass_fail_criteria="Pass: Non-PDF files are rejected with the exact validation message.\nFail: Non-PDF file is accepted.",
            ),
            TestCase(
                id="TC010",
                description="Verify upload rejection of empty 0-byte PDF file",
                preconditions="User attempts to upload a 0-byte file with a .pdf extension.",
                steps=[
                    "Click 'Upload File'.",
                    "Select an empty 0-byte file named 'empty_cbl.pdf'.",
                    "Observe client validation response.",
                ],
                test_data="File: 'empty_cbl.pdf', size: 0 bytes.",
                expected_result="Upload is blocked. A toast or alert displays: 'The selected PDF is empty.' The document slot remains 'Missing'.",
                pass_fail_criteria="Pass: Empty files are rejected before transmission.\nFail: 0-byte file upload succeeds.",
            ),
            TestCase(
                id="TC011",
                description="Verify upload rejection of oversized PDF (>25MB)",
                preconditions="User attempts to upload a PDF file larger than the 25MB boundary.",
                steps=[
                    "Click 'Upload File'.",
                    "Select a valid PDF with size 26.2 MB.",
                    "Observe client validation response.",
                ],
                test_data="File: 'large_archive.pdf', size: 26.2 MB.",
                expected_result="Upload is blocked. System displays: 'File size must not exceed 25MB.' Slot remains in its previous state.",
                pass_fail_criteria="Pass: Files exceeding 25MB are strictly rejected.\nFail: Oversized file is uploaded.",
            ),
            TestCase(
                id="TC012",
                description="Verify upload rejection of spoofed or corrupted PDF (invalid signature header)",
                preconditions="User attempts to upload a file renamed to .pdf but lacking standard %PDF- magic bytes.",
                steps=[
                    "Click 'Upload File'.",
                    "Select a plain text or corrupted binary file renamed to 'report.pdf'.",
                    "Observe file signature inspection response.",
                ],
                test_data="File: 'fake_report.pdf' (containing plain text 'Hello World' without %PDF- header).",
                expected_result="Client-side signature check detects invalid magic bytes and displays: 'This file does not appear to be a valid PDF.' Upload is aborted.",
                pass_fail_criteria="Pass: Spoofed or malformed PDF headers are rejected.\nFail: Invalid binary is accepted.",
            ),
            TestCase(
                id="TC013",
                description="Verify document preview modal for uploaded renewal document",
                preconditions="At least one valid PDF document has been uploaded in the Renewal Workspace.",
                steps=[
                    "Click 'Preview' (Eye icon) on the uploaded document card.",
                    "Observe modal viewer behavior.",
                    "Close modal by clicking Close / X.",
                ],
                test_data="Uploaded file '2025_Accomplishment_Report.pdf'.",
                expected_result="Document preview modal opens displaying the PDF pages inline. File title is displayed in modal header. Closing modal returns smoothly to the workspace.",
                pass_fail_criteria="Pass: Preview opens correctly without page errors or state loss.\nFail: Preview modal fails or crashes view.",
            ),
            TestCase(
                id="TC014",
                description="Verify document replacement during Draft state",
                preconditions="User has uploaded a document in draft renewal state and wants to update it.",
                steps=[
                    "Click 'Replace' on the uploaded document card.",
                    "Select a new valid PDF 'Updated_Report_v2.pdf'.",
                    "Confirm upload.",
                ],
                test_data="New file: 'Updated_Report_v2.pdf', size: 4.1 MB.",
                expected_result="Old file is superseded. Document card updates immediately with the new filename 'Updated_Report_v2.pdf' and size '4.1 MB'. Total uploaded count remains accurate.",
                pass_fail_criteria="Pass: File replacement in draft state executes cleanly without duplicate records.\nFail: Old file persists or creates duplicate items.",
            ),
            TestCase(
                id="TC015",
                description="Verify search and status filtering in Renewal Workspace document list",
                preconditions="User has multiple document requirements in various states (e.g. Uploaded, Missing).",
                steps=[
                    "Type 'Financial' into the document search bar.",
                    "Verify filtered list.",
                    "Clear search and select status filter 'Missing'.",
                    "Select status filter 'All'.",
                ],
                test_data="Search term: 'Financial'; Filters: 'Missing', 'All'.",
                expected_result="Search filters cards matching the document title. Status filter 'Missing' isolates unfulfilled requirements. Selecting 'All' restores full checklist.",
                pass_fail_criteria="Pass: Search and filter controls function smoothly and accurately.\nFail: Filtering produces incorrect or missing items.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Packet Submission & Resubmission Workflow
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Packet Submission & Resubmission Workflow",
        test_cases=[
            TestCase(
                id="TC016",
                description="Verify Renewal submission confirmation dialog displays when all requirements are met",
                preconditions="All mandatory renewal documents are uploaded (100% complete).",
                steps=[
                    "Observe that 'Submit Renewal' button is now enabled.",
                    "Click 'Submit Renewal'.",
                    "Inspect the confirmation dialog content.",
                ],
                test_data="All required documents uploaded.",
                expected_result="Confirmation alert dialog opens with title 'Submit Renewal Application' explaining that documents will be locked for review upon submission. 'Confirm Submit' and 'Cancel' buttons are presented.",
                pass_fail_criteria="Pass: Submission confirmation modal appears with clear explanatory copy.\nFail: Submission occurs without confirmation prompt.",
            ),
            TestCase(
                id="TC017",
                description="Verify cancellation of renewal submission modal",
                preconditions="Submission confirmation dialog is open.",
                steps=[
                    "Click 'Cancel' or click outside the dialog.",
                    "Observe dialog state and workspace status.",
                ],
                test_data="Click 'Cancel' button.",
                expected_result="Dialog closes immediately. Renewal remains in Draft status. No data or file changes occur.",
                pass_fail_criteria="Pass: Cancellation preserves draft state intact.\nFail: Premature submission occurs.",
            ),
            TestCase(
                id="TC018",
                description="Verify successful renewal packet submission transitions status to 'Submitted'",
                preconditions="Submission confirmation dialog is open for a 100% complete packet.",
                steps=[
                    "Click 'Confirm Submit' in the dialog.",
                    "Wait for submission processing.",
                    "Observe feedback toast and UI updates.",
                ],
                test_data="Complete renewal packet submission.",
                expected_result="System submits the packet. Toast confirms 'Renewal application submitted successfully.' Workspace status badge updates to 'Submitted'. File upload and replace controls are locked to prevent tampering during review.",
                pass_fail_criteria="Pass: Submission succeeds, status updates to 'Submitted', and document editing locks.\nFail: Status remains Draft or controls stay unlocked.",
            ),
            TestCase(
                id="TC019",
                description="Verify Organization Portal Dashboard reflection after renewal submission",
                preconditions="Organization user has submitted renewal application.",
                steps=[
                    "Navigate back to Organization Dashboard.",
                    "Inspect the renewal countdown chip and status banner.",
                    "Verify navigation links.",
                ],
                test_data="Submitted renewal cycle.",
                expected_result="Dashboard banner reflects 'Renewal Application Submitted - Under Review'. Link to 'View Renewal Status' directs back to the submitted workspace.",
                pass_fail_criteria="Pass: Dashboard accurately reflects pending renewal submission.\nFail: Dashboard displays outdated or incorrect status.",
            ),
            TestCase(
                id="TC020",
                description="Verify User Portal reflection of 'Needs Revision' with admin remarks display and replacement unlock",
                preconditions="Admin has flagged the renewal application for revision.",
                steps=[
                    "Log in as Organization user and open Renewal Workspace.",
                    "Observe status banner, review remarks alert, and document cards.",
                    "Verify replacement controls for flagged documents.",
                ],
                test_data="Renewal in 'Needs Revision' state.",
                expected_result="Status updates to 'Needs Revision' with an amber alert box displaying the administrator's exact remarks. The flagged document card shows 'Needs Revision' badge and activates the 'Replace File' button.",
                pass_fail_criteria="Pass: User sees admin revision feedback clearly and replacement upload unlocks.\nFail: Remarks are hidden or replacement remains locked.",
            ),
            TestCase(
                id="TC021",
                description="Verify user document replacement and resubmission workflow",
                preconditions="User is in Renewal Workspace with 'Needs Revision' status.",
                steps=[
                    "Click 'Replace File' on the flagged document card.",
                    "Upload corrected PDF 'Signed_Financial_Statement.pdf'.",
                    "Verify document card status updates to 'Updated'.",
                    "Click 'Resubmit Renewal' and confirm in dialog.",
                ],
                test_data="File: 'Signed_Financial_Statement.pdf'.",
                expected_result="The file is replaced successfully. 'Resubmit Renewal' action submits the revised packet. Status changes to 'Resubmitted' / 'Pending Review', locking documents until reviewed.",
                pass_fail_criteria="Pass: User can replace the flagged document and resubmit smoothly.\nFail: Resubmission fails or file fails to update.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Administrative Review, Term Calculation & Decision Pipeline
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Administrative Review, Term Calculation & Decision Pipeline",
        test_cases=[
            TestCase(
                id="TC022",
                description="Verify Admin Portal Renewals queue listing with authoritative summary cards and filters",
                preconditions="An organization has submitted a renewal packet. Administrator is on desktop viewport (>=1024px).",
                steps=[
                    "Log in as an Administrator and navigate to Admin Portal -> Renewals.",
                    "Inspect summary cards: Verified, Pending Review, Needs Revision (verify absence of 'Submitted' card).",
                    "Inspect visible status filters: All Status, Verified, Pending Review, Needs Revision.",
                    "Locate the submitted organization entry in the table.",
                ],
                test_data="Admin Renewals queue workspace.",
                expected_result="Application appears in the queue with status pill 'Pending Review', correct document ratio, and formatted dates. Summary cards and filter tabs display Verified, Pending Review, and Needs Revision.",
                pass_fail_criteria="Pass: Submitted renewal appears in queue with correct status and filters match UI specification.\nFail: Entry is missing or obsolete 'Submitted' card is rendered.",
            ),
            TestCase(
                id="TC023",
                description="Verify Admin Renewals queue filtering and search controls",
                preconditions="Multiple renewals exist across various statuses and districts.",
                steps=[
                    "Enter organization name in search input.",
                    "Toggle status tab to 'Pending Review'.",
                    "Toggle status tab to 'Needs Revision'.",
                    "Toggle status tab to 'Verified'.",
                    "Clear filters to 'All Status'.",
                ],
                test_data="Search: 'Youth Club'; Status tabs: Pending Review, Needs Revision, Verified, All Status.",
                expected_result="Table updates dynamically according to active filters. 'All Status' restores all entries.",
                pass_fail_criteria="Pass: Admin search, status tabs, and filters function accurately.\nFail: Filtered data does not match selection.",
            ),
            TestCase(
                id="TC024",
                description="Verify Admin open renewal review drawer and document inspection",
                preconditions="Admin locates a submitted renewal in the table.",
                steps=[
                    "Click 'Review' action button on the table row.",
                    "Observe drawer opening.",
                    "Inspect organization profile snapshot, cycle history, and submitted document list.",
                ],
                test_data="Renewal ID of target application.",
                expected_result="Review drawer slides open displaying organization details, current URN, accreditation expiration date, and all submitted PDF documents with view/download buttons.",
                pass_fail_criteria="Pass: Renewal review drawer loads complete application packet cleanly.\nFail: Drawer fails to open or renders blank.",
            ),
            TestCase(
                id="TC025",
                description="Verify Admin document preview and download from review drawer",
                preconditions="Admin review drawer is open.",
                steps=[
                    "Click 'View' on 'Accomplishment Report'.",
                    "Verify preview modal opens.",
                    "Click 'Download' button for the document.",
                ],
                test_data="Submitted PDF document.",
                expected_result="Document preview modal renders the submitted PDF accurately. Clicking download downloads the original PDF file with its original filename.",
                pass_fail_criteria="Pass: Admin can view and download submitted renewal attachments without errors.\nFail: Download or preview fails.",
            ),
            TestCase(
                id="TC026",
                description="Verify Admin 'Needs Revision' decision workflow with mandatory remarks",
                preconditions="Admin review drawer is open for a submitted renewal requiring document corrections.",
                steps=[
                    "Select 'Needs Revision' review decision.",
                    "Attempt to submit with empty remarks.",
                    "Enter detailed remarks: 'Please update Financial Statement to include signature of Treasurer and Auditor.'",
                    "Confirm decision.",
                ],
                test_data="Remarks: 'Please update Financial Statement to include signature of Treasurer and Auditor.'",
                expected_result="Empty remarks submission is prevented. Entering required remarks and confirming transitions status to 'Needs Revision'. Table status pill updates to amber 'Needs Revision'.",
                pass_fail_criteria="Pass: Remarks are mandatory and status transitions to Needs Revision.\nFail: Decision saves without required remarks.",
            ),
            TestCase(
                id="TC027",
                description="Verify Admin Approval with Standard Continuous Protection Anchor (within 30 days of previous expiry)",
                preconditions="Admin review drawer is open for a fully verified renewal packet whose previous accreditation end date was within 30 days or is in the future.",
                steps=[
                    "Select 'Approve' decision in review drawer.",
                    "Confirm approval dialog.",
                    "Inspect the resulting new accreditation term dates.",
                ],
                test_data="Previous expiry: 2026-10-01. Approval date: 2026-09-15.",
                expected_result="Application is approved. Standard Continuous Protection applies: new accreditation start date seamlessly anchors to 2026-10-01, and new end date is 2029-10-01 (3 full years continuous protection without forfeiting early renewal days).",
                pass_fail_criteria="Pass: Continuous protection anchor logic is verified upon timely approval.\nFail: Dates forfeit early days or calculate incorrectly.",
            ),
            TestCase(
                id="TC028",
                description="Verify Admin Approval beyond 30-day cutoff starts fresh term from approval date",
                preconditions="Admin is approving a late renewal submitted more than 30 days after previous accreditation expiry (e.g. 60 days past).",
                steps=[
                    "Open late renewal review in Admin Portal.",
                    "Select 'Approve' and confirm.",
                    "Inspect the resulting accreditation start and end dates.",
                ],
                test_data="Previous expiry: 2026-05-01. Approval date: 2026-09-16.",
                expected_result="Application is approved. Since approval date exceeds the 30-day anchor cutoff, new term start date is set to the current approval date (2026-09-16) and end date is set to exactly 3 years later (2029-09-16).",
                pass_fail_criteria="Pass: Late renewals beyond 30 days start fresh term on approval date.\nFail: Old expired date is erroneously anchored.",
            ),
            TestCase(
                id="TC029",
                description="Verify organization active status restoration and official URN preservation upon approval",
                preconditions="Renewal application has been approved by administrator.",
                steps=[
                    "Navigate to Admin Portal -> YORP Registry and search for the organization.",
                    "Open organization details drawer.",
                    "Check accreditation status, cycle number, and official URN.",
                ],
                test_data="Approved renewal organization.",
                expected_result="Organization status shows 'Active' / 'Accredited'. The cycle number increments (e.g. Cycle 2). The organization's existing official URN (BB-YY-NNN) is strictly preserved and remains constant; NO new or altered URN is generated.",
                pass_fail_criteria="Pass: Registry reflects renewed active status, updated cycle, and preserved official URN.\nFail: New URN is incorrectly generated or status remains expired.",
            ),
            TestCase(
                id="TC030",
                description="Verify Admin Rejection workflow and terminal state locking (no auto-resubmission)",
                preconditions="Admin review drawer is open for a renewal that fails legal or accreditation criteria.",
                steps=[
                    "Select 'Reject' decision.",
                    "Enter mandatory rejection remarks: 'Documents non-compliant and invalid.'",
                    "Confirm rejection.",
                ],
                test_data="Remarks: 'Non-compliant documents.'",
                expected_result="Application transitions to 'Rejected' (terminal status). Table reflects red 'Rejected' badge. User portal displays rejection notice with remarks. Rejected renewal is terminal and cannot be resubmitted; organization must undergo fresh registration if cutoff passed.",
                pass_fail_criteria="Pass: Rejection is terminal and user is barred from resubmitting on a rejected cycle.\nFail: Rejection allows continued resubmissions.",
            ),
            TestCase(
                id="TC031",
                description="Verify renewal status persistence across page refresh and browser restart",
                preconditions="A renewal is in 'Pending Review' or 'Needs Revision' status.",
                steps=[
                    "In User Portal Renewal Workspace, note current status and uploaded files.",
                    "Hard refresh browser (Ctrl + F5).",
                    "Re-open page.",
                    "Log out, close browser, re-open, and log in again.",
                ],
                test_data="Active renewal in 'Needs Revision' state.",
                expected_result="Status remains strictly 'Needs Revision'. All uploaded files, formatted sizes, and admin remarks persist without loss.",
                pass_fail_criteria="Pass: Renewal state and attachments persist reliably across sessions.\nFail: State reverts or files disappear.",
            ),
            TestCase(
                id="TC032",
                description="Verify unauthorized access protection for Renewal Workspace and protected Admin renewal pages",
                preconditions="Unauthenticated user or unauthorized role attempting direct navigation.",
                steps=[
                    "Copy /organization-renewal URL and open in Incognito window.",
                    "Log in as an Organization user and attempt direct navigation to /admin/renewals.",
                ],
                test_data="Direct URL access: /organization-renewal, /admin/renewals.",
                expected_result="Unauthenticated access redirects to /signin. Organization user navigating to /admin/renewals is redirected back to /dashboard or shown an unauthorized access notification.",
                pass_fail_criteria="Pass: Protected renewal views require appropriate sign-in and permissions.\nFail: Protected renewal views are accessible unauthorized.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Renewal Workspace & Admin Desktop Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Renewal Workspace & Admin Desktop Gate",
        test_cases=[
            TestCase(
                id="TC033",
                description="Verify Renewal Countdown and Application Workspace on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /organization-renewal as eligible organization user.",
                    "Verify full-width renewal eligibility banner, countdown timer, and document checklist table.",
                    "Log in as Admin and navigate to /admin/renewals queue.",
                    "Verify desktop data table, search filters, and renewal review drawer.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop renewal workspace displays eligibility countdown prominently across header. Document requirement checklist table spans clean desktop width. Admin renewal review drawer renders side-by-side verification controls.",
                pass_fail_criteria="Pass: Desktop renewal views render with generous spacing and accessible controls.\nFail: Countdown is truncated or review drawer layout breaks.",
            ),
            TestCase(
                id="TC034",
                description="Verify Renewal Workspace on tablet viewport (768x1024) while Admin Renewals enforces desktop gate",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /organization-renewal on tablet viewport as organization user.",
                    "Verify countdown cards wrap into 2 columns with comfortable touch targets.",
                    "Tap 'Upload Renewal Packet' and verify file picker dialog.",
                    "Navigate to /admin/renewals as Admin on tablet viewport.",
                    "Observe Admin Desktop Warning Screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="User renewal metrics and checklist adapt smoothly to tablet width with touch feedback. Admin Renewals route is desktop-gated and displays warning screen on viewports < 1024px.",
                pass_fail_criteria="Pass: User workspace adapts on tablet and admin workspace enforces desktop gate.\nFail: Buttons cut off or admin renewals queue is exposed on tablet.",
            ),
            TestCase(
                id="TC035",
                description="Verify Renewal Workspace on Phone Viewport (390x844) and Admin Warning on mobile",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /organization-renewal on mobile phone viewport.",
                    "Verify vertical renewal milestone tracker, mobile countdown badge, and stacked upload slots.",
                    "Verify submit renewal button is sticky or easily reachable at bottom.",
                    "Navigate to /admin/renewals on mobile phone viewport.",
                    "Verify Admin Desktop Warning Screen.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Renewal workspace renders in a clean single-column mobile view with zero horizontal overflow. Admin renewals route renders information-only warning screen blocking mobile administrative access.",
                pass_fail_criteria="Pass: Mobile phone renewal interface is completely usable with touch-friendly controls and blocks admin view.\nFail: Horizontal scroll bar appears or admin queue renders on mobile.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_06_groups()
    output_filename = "06_YTRACE_YORP_Renewal_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="06",
        section_title="YORP Accreditation Renewal Workflow Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

"""
Generator for Section 05: Registration Document Submission & Review (Compliance) Black-Box Test Cases.
Document: 05_YTRACE_Registration_Compliance_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_05_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: User Document Submissions Workspace
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="User Document Submissions Workspace",
        test_cases=[
            TestCase(
                id="TC001",
                description="View required compliance documents checklist",
                preconditions="Organization profile is complete. User navigates to /document-submission.",
                steps=[
                    "Navigate to /document-submission via sidebar.",
                    "Observe the document submission workspace layout.",
                ],
                test_data="N/A",
                expected_result="The page renders the dynamic checklist of currently required YORP documents (Directory of Officers, Constitution & By-Laws, Financial Statement, List of Members, etc.) with description, status badges, and upload triggers.",
                pass_fail_criteria="Pass: Required documents checklist renders completely.\nFail: Documents missing or page does not load.",
            ),
            TestCase(
                id="TC002",
                description="Upload valid PDF document for required item",
                preconditions="User is on /document-submission with an item in 'Not Submitted' status.",
                steps=[
                    "Locate 'Directory of Officers' document card.",
                    "Click 'Upload File' or drag and drop a valid PDF file (e.g. officers_directory.pdf, 1.2MB).",
                    "Observe upload progress and status change.",
                ],
                test_data="File: officers_directory.pdf (Valid PDF, 1.2 MB)",
                expected_result="The file uploads successfully. The document card updates to display the uploaded filename, file size, upload timestamp, and status pill 'Submitted' (or 'Under Review').",
                pass_fail_criteria="Pass: Valid PDF uploads and card updates.\nFail: Upload fails or file is rejected.",
            ),
            TestCase(
                id="TC003",
                description="Upload invalid file format (non-PDF rejected)",
                preconditions="User is on /document-submission.",
                steps=[
                    "Click upload on a document card.",
                    "Select an invalid file format (e.g. executable .exe, zip archive, or audio file).",
                    "Attempt to upload.",
                ],
                test_data="File: invalid_archive.zip",
                expected_result="The upload is blocked and an error message is displayed: 'Invalid file format. Please upload an official PDF document.'",
                pass_fail_criteria="Pass: Non-PDF files are blocked with clear validation message.\nFail: Non-PDF file is accepted.",
            ),
            TestCase(
                id="TC004",
                description="Upload oversized PDF file (size boundary check)",
                preconditions="System enforces maximum file upload limit (e.g. 10MB).",
                steps=[
                    "Select a PDF file exceeding 10MB.",
                    "Attempt to upload.",
                ],
                test_data="File: oversized_document.pdf (15 MB)",
                expected_result="The upload is blocked and an error message appears: 'File size exceeds the 10MB limit. Please compress your document before uploading.'",
                pass_fail_criteria="Pass: Oversized file is rejected with size warning.\nFail: Oversized file uploads without warning.",
            ),
            TestCase(
                id="TC005",
                description="Document inline preview modal",
                preconditions="Document has been uploaded to a card.",
                steps=[
                    "Click the 'Preview' eye icon on the uploaded document card.",
                    "Observe the document preview modal (PortalDocumentPreviewModal).",
                ],
                test_data="N/A",
                expected_result="A modal opens with an inline PDF viewer rendering the uploaded document, page navigation controls, zoom controls, and a 'Download' action button.",
                pass_fail_criteria="Pass: PDF renders cleanly inside preview modal.\nFail: Preview modal fails to load or shows blank window.",
            ),
            TestCase(
                id="TC006",
                description="Close document preview modal",
                preconditions="Document preview modal is open.",
                steps=[
                    "Click the 'Close' button or 'X' icon.",
                    "Observe the workspace.",
                ],
                test_data="N/A",
                expected_result="The preview modal closes and the user returns to the document submissions workspace.",
                pass_fail_criteria="Pass: Modal closes properly.\nFail: Modal cannot be closed.",
            ),
            TestCase(
                id="TC007",
                description="Uploaded document persists after page refresh",
                preconditions="User has uploaded a compliance document.",
                steps=[
                    "Refresh the browser page (F5).",
                    "Locate the uploaded document card.",
                ],
                test_data="N/A",
                expected_result="The uploaded file name, size, timestamp, and 'Submitted' status persist across page refresh.",
                pass_fail_criteria="Pass: Document status persists across reload.\nFail: Document card reverts to 'Not Submitted'.",
            ),
            TestCase(
                id="TC008",
                description="Submit completed registration packet",
                preconditions="All required compliance documents have been uploaded.",
                steps=[
                    "Verify all required checklist items show 'Submitted'.",
                    "Click 'Submit Registration Packet'.",
                    "Confirm the submission dialog.",
                ],
                test_data="All required documents: Uploaded",
                expected_result="The overall packet status updates to 'Submitted / Under Review' with confirmation toast 'Registration packet submitted for review.'",
                pass_fail_criteria="Pass: Packet submits and overall status reflects under review.\nFail: Submission button is disabled or packet submission fails.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: User Revision & Document Replacement Workflow
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="User Revision & Document Replacement Workflow",
        test_cases=[
            TestCase(
                id="TC009",
                description="View administrator revision feedback on rejected document",
                preconditions="Administrator marked a submitted document 'Needs Revision' with specific remarks.",
                steps=[
                    "Navigate to /document-submission.",
                    "Locate the affected document card.",
                    "Observe the status badge and feedback alert box.",
                ],
                test_data="Status: Needs Revision\nAdmin Remark: 'Directory missing signatures of Head of Organization and secretary.'",
                expected_result="The document card displays a yellow/amber 'Needs Revision' badge and a callout box showing the exact administrator remarks explaining why revision is necessary.",
                pass_fail_criteria="Pass: Admin remarks are visible on the affected document card.\nFail: Status remains unchanged or remarks are missing.",
            ),
            TestCase(
                id="TC010",
                description="Upload revised replacement document",
                preconditions="Document is in 'Needs Revision' status.",
                steps=[
                    "Click 'Replace File' on the document card.",
                    "Select the revised signed PDF (e.g. officers_directory_signed.pdf).",
                    "Confirm replacement.",
                ],
                test_data="File: officers_directory_signed.pdf",
                expected_result="The revised file replaces the previous file. The document status updates to 'Resubmitted / Under Review' and toast confirmation 'Revised document uploaded' appears.",
                pass_fail_criteria="Pass: Replacement file is uploaded and status updates to under review.\nFail: Replacement fails or old file remains.",
            ),
            TestCase(
                id="TC011",
                description="Delete draft unsubmitted document",
                preconditions="User uploaded a document in draft state prior to final packet submission.",
                steps=[
                    "Click the trash/delete icon on the draft document card.",
                    "Confirm deletion.",
                ],
                test_data="N/A",
                expected_result="The draft document is removed from the card and the status returns to 'Not Submitted'.",
                pass_fail_criteria="Pass: Draft document is removed.\nFail: Draft cannot be deleted.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Admin Registration Document Review & Decision UI
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Admin Registration Document Review & Decision UI",
        test_cases=[
            TestCase(
                id="TC012",
                description="Admin views Registration Review table with authoritative summary cards and filters",
                preconditions="Administrator is authenticated on desktop viewport (>=1024px).",
                steps=[
                    "Navigate to /admin/registrations via sidebar.",
                    "Inspect summary cards: Verified, Pending Review, Needs Revision (verify absence of 'Submitted' card).",
                    "Inspect visible status filter tabs: All Status, Verified, Pending Review, Needs Revision.",
                    "Observe table columns: Organization Name, Registration Type, Submission Date, Documents Count, Status, Actions.",
                ],
                test_data="Admin Registration Review workspace.",
                expected_result="Registrations table renders with summary metric cards (Verified, Pending Review, Needs Revision) and matching status filters. 'Submitted' is not an independent summary card or filter.",
                pass_fail_criteria="Pass: Summary cards and filter tabs match the authoritative UI specification.\nFail: Obsolete 'Submitted' card appears or columns are truncated.",
            ),
            TestCase(
                id="TC013",
                description="Filter registrations by review status (Verified, Pending Review, Needs Revision)",
                preconditions="Multiple registration submissions exist with varying statuses.",
                steps=[
                    "Select 'Pending Review' status filter -> observe matching rows.",
                    "Select 'Needs Revision' status filter -> observe matching rows.",
                    "Select 'Verified' status filter -> observe matching rows.",
                    "Select 'All Status' -> observe all records.",
                ],
                test_data="Filters: Pending Review / Needs Revision / Verified / All Status",
                expected_result="The table isolates registration packets matching the selected review status tab cleanly.",
                pass_fail_criteria="Pass: Status filter isolates registrations accurately.\nFail: Filter does not update table.",
            ),
            TestCase(
                id="TC014",
                description="Search registrations table by organization name",
                preconditions="Registrations table contains multiple organizations.",
                steps=[
                    "Type organization name 'Kapitolyo' in the search input.",
                    "Observe the table filtering.",
                ],
                test_data="Search: 'Kapitolyo'",
                expected_result="Only registrations matching 'Kapitolyo' are displayed.",
                pass_fail_criteria="Pass: Search filters table accurately.\nFail: Search does not work.",
            ),
            TestCase(
                id="TC015",
                description="Open registration review drawer",
                preconditions="Administrator is on /admin/registrations.",
                steps=[
                    "Click on a registration row or click 'Review Documents' in row actions.",
                    "Observe the review drawer (PortalDocumentDrawer).",
                ],
                test_data="N/A",
                expected_result="The review drawer slides open displaying organization overview, contact details, and all submitted compliance documents with status tags.",
                pass_fail_criteria="Pass: Review drawer opens with complete document list.\nFail: Drawer does not open or documents are missing.",
            ),
            TestCase(
                id="TC016",
                description="Admin preview of submitted document inside review drawer",
                preconditions="Registration review drawer is open.",
                steps=[
                    "Locate 'Constitution & By-Laws' in the drawer.",
                    "Click the document preview button.",
                    "Observe the inline preview.",
                ],
                test_data="N/A",
                expected_result="The PDF document renders inline with zoom and page controls, allowing the administrator to inspect document validity.",
                pass_fail_criteria="Pass: Admin can preview submitted PDF.\nFail: Document preview fails or displays broken frame.",
            ),
            TestCase(
                id="TC017",
                description="Admin approves individual document (Status transitions to Approved)",
                preconditions="Review drawer is open and document is under review.",
                steps=[
                    "Locate 'Directory of Officers'.",
                    "Click 'Approve Document'.",
                    "Confirm approval.",
                ],
                test_data="Document: Directory of Officers",
                expected_result="The document's status changes to 'Approved' (green badge). Toast notification confirms 'Document approved'.",
                pass_fail_criteria="Pass: Document transitions to Approved status.\nFail: Approval fails or status does not update.",
            ),
            TestCase(
                id="TC018",
                description="Admin marks individual document Needs Revision with remarks",
                preconditions="Review drawer is open.",
                steps=[
                    "Locate 'Financial Statement'.",
                    "Click 'Request Revision'.",
                    "Enter mandatory remarks: 'Please submit statement certified by an accredited CPA or treasurer.'",
                    "Click 'Confirm Request Revision'.",
                ],
                test_data="Remarks: 'Please submit statement certified by an accredited CPA or treasurer.'",
                expected_result="The document status changes to 'Needs Revision'. The remarks are saved and will display on the user's document card.",
                pass_fail_criteria="Pass: Document transitions to Needs Revision and remarks are recorded.\nFail: Revision request fails or remarks are omitted.",
            ),
            TestCase(
                id="TC019",
                description="Admin marks individual document Needs Revision with empty remarks blocked",
                preconditions="Admin opens 'Request Revision' dialog.",
                steps=[
                    "Click 'Request Revision'.",
                    "Leave remarks input empty.",
                    "Click 'Confirm Request Revision'.",
                ],
                test_data="Remarks: (empty)",
                expected_result="Validation blocks submission: 'Revision remarks are required to guide the organization.'",
                pass_fail_criteria="Pass: Empty remarks are blocked.\nFail: Document is marked needs revision without remarks.",
            ),
            TestCase(
                id="TC020",
                description="Admin rejects individual document",
                preconditions="Review drawer is open.",
                steps=[
                    "Click 'Reject Document'.",
                    "Enter mandatory rejection remarks: 'Document is completely unreadable or invalid.'",
                    "Confirm rejection.",
                ],
                test_data="Remarks: 'Document is completely unreadable or invalid.'",
                expected_result="The document status updates to 'Rejected' (red badge) and rejection remarks are logged.",
                pass_fail_criteria="Pass: Document is marked Rejected.\nFail: Rejection fails.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Automatic Verification, Deterministic URN & Decision Modal Integrity
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Automatic Verification, Deterministic URN & Decision Modal Integrity",
        test_cases=[
            TestCase(
                id="TC021",
                description="Automatic Registration Verification when all required documents are approved",
                preconditions="An organization has submitted all required registration documents. Admin is reviewing the compliance packet in Admin Portal.",
                steps=[
                    "Admin inspects the submitted required documents.",
                    "Admin approves each required document one by one until the final required document is approved.",
                    "Observe the resulting organization status and accreditation state in Admin UI.",
                ],
                test_data="All dynamic required documents approved.",
                expected_result="When the final currently-required registration document is approved, the organization automatically transitions to 'Verified' and the official deterministic URN (BB-YY-NNN) becomes available. The Admin UI immediately reflects the verified state and Term 1 accreditation without requiring any manual 'Verify Organization' action.",
                pass_fail_criteria="Pass: Organization becomes Verified with official deterministic URN immediately upon final required document approval.\nFail: Organization fails to auto-verify or requires manual verification.",
            ),
            TestCase(
                id="TC022",
                description="Dynamic required documents evaluation prevents premature auto-verification",
                preconditions="Dynamic template system defines active required documents. Multiple scenarios tested.",
                steps=[
                    "Scenario A: 1 required document is missing/unsubmitted -> Approve remaining -> Observe status.",
                    "Scenario B: 1 required document is in 'Pending Review' -> Observe status.",
                    "Scenario C: 1 required document is marked 'Needs Revision' -> Observe status.",
                    "Scenario D: 1 required document is marked 'Rejected' -> Observe status.",
                    "Scenario E: All required documents are approved, but an optional document is pending -> Observe status.",
                    "Scenario F: 0 required documents are configured in the system -> Observe status.",
                ],
                test_data="Dynamic document requirement scenarios A through F.",
                expected_result="Scenarios A, B, C, D, and F strictly do NOT auto-verify the organization. Scenario E successfully auto-verifies because optional documents do not block verification. System never hardcodes static 5-document assumption.",
                pass_fail_criteria="Pass: Auto-verification respects dynamic requirement completeness accurately.\nFail: Premature auto-verification occurs or optional document blocks verification.",
            ),
            TestCase(
                id="TC023",
                description="Deterministic official URN assignment format (BB-YY-NNN)",
                preconditions="New organization in Barangay Kapasigan (Barangay Ordinal: 01) auto-verifies in year 2026.",
                steps=[
                    "Admin completes approval of all required documents.",
                    "Inspect the generated URN on the verified organization record.",
                ],
                test_data="Barangay: Kapasigan (01), Year: 2026, Annual Sequence: 001.",
                expected_result="The generated URN strictly matches the deterministic format BB-YY-NNN (e.g. '01-26-001'), where BB is the canonical Pasig barangay ordinal, YY is the 2-digit verification year, and NNN is the global city-wide sequence.",
                pass_fail_criteria="Pass: URN strictly adheres to BB-YY-NNN format.\nFail: URN uses random string or obsolete PCYDO-YYYY-XXXX format.",
            ),
            TestCase(
                id="TC024",
                description="Verification Idempotency: Verified organization does not receive duplicate URN or incremented sequence",
                preconditions="Organization is already Verified with assigned URN '01-26-001' and Term 1 accreditation.",
                steps=[
                    "Perform subsequent document reviews or profile updates on the verified organization.",
                    "Re-evaluate registration verification triggers.",
                    "Inspect organization URN, accreditation term count, and sequence counter.",
                ],
                test_data="Already verified organization record.",
                expected_result="The organization retains its existing URN ('01-26-001'). No duplicate URN is assigned, the city-wide sequence counter is not incremented a second time, and no duplicate Term 1 accreditation record is created.",
                pass_fail_criteria="Pass: Verification is fully idempotent without duplicate URNs or terms.\nFail: Duplicate URN generated or sequence double-incremented.",
            ),
            TestCase(
                id="TC025",
                description="Confirm Review Decision Modal layout safety with long document names",
                preconditions="Admin opens Confirm Review Decision modal for a document with an unusually long name (e.g. 'Barangay_Endorsement_And_Joint_Council_Resolution_Signed_Copy_2026_Final_Version.pdf').",
                steps=[
                    "Click decision button to open Confirm Review Decision modal.",
                    "Inspect the modal table layout across Document, Decision, and Remarks columns.",
                ],
                test_data="Long filename: 'Barangay_Endorsement_And_Joint_Council_Resolution_Signed_Copy_2026_Final_Version.pdf'.",
                expected_result="The document name wraps or truncates safely within the Document column. It does NOT overlap Decision or Remarks columns, and full name remains accessible via tooltip or expansion.",
                pass_fail_criteria="Pass: Long document names format cleanly without overlapping modal columns.\nFail: Columns collide or text overflows modal boundaries.",
            ),
            TestCase(
                id="TC026",
                description="Document approval execution succeeds cleanly and registers in Activity Logs",
                preconditions="Admin submits an approval decision on a submitted compliance document.",
                steps=[
                    "Select 'Approve' decision on submitted document.",
                    "Confirm approval in the confirmation dialog.",
                    "Observe toast notification and document badge update.",
                    "Navigate to Admin Portal → Activity Logs.",
                ],
                test_data="Document approval execution.",
                expected_result="Document approval succeeds cleanly without error banners. The document visibly transitions to 'Approved' status with a green badge, and the approval action is recorded and visible in the Activity Logs list.",
                pass_fail_criteria="Pass: Document visibly becomes Approved and action appears in Activity Logs.\nFail: Approval fails, displays error banner, or document remains pending.",
            ),
            TestCase(
                id="TC027",
                description="User portal dashboard reflects approved accreditation in real time upon auto-verification",
                preconditions="Admin has completed final required document approval triggering auto-verification.",
                steps=[
                    "Sign in as the approved organization user.",
                    "Navigate to /dashboard.",
                    "Observe the accreditation status card and navigation items.",
                ],
                test_data="Approved organization user session.",
                expected_result="The dashboard immediately displays 'Accredited — Active' badge, assigned URN (BB-YY-NNN), Term 1 validity, and unlocks Financial Grants and YPOP workspaces.",
                pass_fail_criteria="Pass: User dashboard reflects accredited active status and unlocks modules.\nFail: Dashboard remains in unaccredited state or requires page re-login.",
            ),
            TestCase(
                id="TC028",
                description="Reject full registration application workflow",
                preconditions="Administrator determines application fails youth jurisdiction or legal criteria.",
                steps=[
                    "Select 'Reject Application' action.",
                    "Enter mandatory rejection remarks.",
                    "Confirm rejection in confirmation dialog.",
                ],
                test_data="Remarks: 'Organization does not meet youth jurisdiction criteria.'",
                expected_result="Application status transitions to 'Rejected'. Rejection remarks are logged and user portal reflects rejection notice.",
                pass_fail_criteria="Pass: Application is rejected with remarks recorded.\nFail: Rejection fails.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Compliance Documents & Admin Desktop Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Compliance Documents & Admin Desktop Gate",
        test_cases=[
            TestCase(
                id="TC029",
                description="Verify Document Submission Workspace and Review Drawer on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /document-submission as logged-in organization user.",
                    "Verify document requirement cards displayed in clean desktop grid, upload buttons, and file status badges.",
                    "Log in as Admin and open /admin/registrations review drawer.",
                    "Verify side-by-side document checklist, embedded PDF previewer, and administrative decision actions.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop document submission displays requirement cards in an orderly grid with clear drag-and-drop zones. Admin review drawer renders full-height PDF preview alongside document status dropdowns and URN details.",
                pass_fail_criteria="Pass: Desktop layout presents well-spaced document cards and full-featured review drawer.\nFail: Cards overlap, PDF preview is clipped, or buttons are inaccessible.",
            ),
            TestCase(
                id="TC030",
                description="Verify Document Submission on tablet viewport (768x1024) while Admin Registration enforces desktop gate",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /document-submission as organization user on tablet viewport.",
                    "Verify document cards wrap into 2-column layout with tap-friendly 'Replace File' buttons.",
                    "Navigate to /admin/registrations as Admin on tablet viewport.",
                    "Observe Admin Desktop Warning Screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="User document submission workspace adapts cleanly to tablet width with responsive upload buttons. Admin Registration Review is desktop-gated and displays warning screen on viewports < 1024px.",
                pass_fail_criteria="Pass: User workspace adapts on tablet and admin workspace enforces desktop gate.\nFail: User layout breaks or admin registration table renders brokenly on tablet.",
            ),
            TestCase(
                id="TC031",
                description="Verify Document Submission on Phone Viewport (390x844) and Admin Warning on mobile",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /document-submission on mobile phone viewport.",
                    "Verify single-column vertical document stack with clear upload progress feedback.",
                    "Tap 'Replace File' and verify mobile file chooser prompt.",
                    "Navigate to /admin/registrations on mobile phone viewport.",
                    "Verify Admin Desktop Warning Screen.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="User document submission cards stack vertically with zero horizontal scroll. Mobile file picker triggers on tap. Admin registration route renders information-only warning screen blocking mobile administrative access.",
                pass_fail_criteria="Pass: Mobile phone interface renders accessible user upload cards and blocks admin view.\nFail: User cards overflow phone screen or admin registration opens on mobile.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_05_groups()
    output_filename = "05_YTRACE_Registration_Compliance_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="05",
        section_title="Registration Document Submission & Review (Compliance) Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

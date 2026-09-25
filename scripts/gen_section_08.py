"""
Generator for Section 08: Budget Request Creation & Management Black-Box Test Cases.
Document: 08_YTRACE_Budget_Request_Creation_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_08_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Budget Request Form Access, Inputs & Boundary Validations
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Budget Request Form Access, Inputs & Boundary Validations",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify opening of New Budget Request creation form",
                preconditions="Accredited organization user is logged in and navigates to the Financial Grant / Budget Request workspace (/budget-request).",
                steps=[
                    "Navigate to Budget Request workspace.",
                    "Click '+ New Budget Request' action button.",
                    "Inspect the opened request modal/form layout.",
                ],
                test_data="N/A",
                expected_result="The Budget Request creation form opens displaying fields for Activity Title, Description, Proposed Date, Venue, Requested Amount, Purpose/Category, Remarks, and Section 3: Detailed Project Proposal upload dropzone.",
                pass_fail_criteria="Pass: Form opens cleanly with all required entry fields initialized.\nFail: Form fails to open or is missing key fields.",
            ),
            TestCase(
                id="TC002",
                description="Verify required field validation on empty Budget Request submission",
                preconditions="Budget Request modal is open with empty inputs.",
                steps=[
                    "Leave Activity Title, Description, Date, Venue, Requested Amount, Category, and Remarks blank.",
                    "Click 'Submit Proposal' / 'Save Request'.",
                    "Observe client validation errors.",
                ],
                test_data="Blank form fields.",
                expected_result="Submission is blocked. Toast displays: 'Complete the budget form: Activity title, description, proposed date, venue, requested amount, purpose/category, and remarks are required.' Form remains open.",
                pass_fail_criteria="Pass: Submission is prevented and required field toast is displayed.\nFail: Empty form submits without validation.",
            ),
            TestCase(
                id="TC003",
                description="Verify Requested Amount boundary: zero and negative value rejection",
                preconditions="Budget Request form is open.",
                steps=[
                    "Enter Activity Title: 'Youth Skills Training'.",
                    "Enter Requested Amount: 0.",
                    "Attempt submission.",
                    "Enter Requested Amount: -5000.",
                    "Attempt submission.",
                ],
                test_data="Requested Amount: 0, -5000.",
                expected_result="System rejects both 0 and negative amounts with validation message: 'Complete the budget form: Activity title, description, proposed date, venue, requested amount, purpose/category, and remarks are required.'",
                pass_fail_criteria="Pass: Zero and negative budget requests are strictly rejected.\nFail: Non-positive amounts are accepted.",
            ),
            TestCase(
                id="TC004",
                description="Verify Requested Amount boundary: minimum valid whole peso amount (₱1)",
                preconditions="Budget Request form is open with valid text fields.",
                steps=[
                    "Enter Requested Amount: 1 (PHP 1.00).",
                    "Fill other required fields with valid data and attach a PDF proposal.",
                    "Observe input acceptance.",
                ],
                test_data="Requested Amount: 1.",
                expected_result="Amount is accepted as a valid positive whole peso integer without validation error.",
                pass_fail_criteria="Pass: Minimum positive whole peso integer is accepted.\nFail: System rejects valid ₱1 amount.",
            ),
            TestCase(
                id="TC005",
                description="CRITICAL VERIFIED RULE: Rejection of decimal amounts (Whole peso amount required)",
                preconditions="Budget Request form is open with valid text fields.",
                steps=[
                    "Enter Requested Amount with decimal cents: 1500.50.",
                    "Fill other required fields and attach PDF.",
                    "Click submit.",
                ],
                test_data="Requested Amount: 1500.50.",
                expected_result="Submission is blocked. Destructive toast displays: 'Whole peso amount required: Requested amount must be a whole peso number without decimals.' Form is not submitted.",
                pass_fail_criteria="Pass: Decimals are strictly rejected with the exact 'Whole peso amount required' validation toast.\nFail: Decimals are accepted.",
            ),
            TestCase(
                id="TC006",
                description="Verify Purpose Category dropdown selection",
                preconditions="Budget Request form is open.",
                steps=[
                    "Click 'Purpose Category' dropdown.",
                    "Verify available municipal youth development categories (e.g. Leadership & Governance, Health & Sports, Education, Environmental Protection).",
                    "Select a category.",
                ],
                test_data="Category: 'Leadership & Governance'.",
                expected_result="Dropdown lists approved municipal categories. Selected category binds cleanly to form state.",
                pass_fail_criteria="Pass: Category dropdown presents options and binds selection.\nFail: Categories are missing or selection fails to bind.",
            ),
            TestCase(
                id="TC007",
                description="Verify Target Activity Date selection",
                preconditions="Budget Request form is open.",
                steps=[
                    "Click Activity Date input.",
                    "Select scheduled project date from calendar picker.",
                    "Observe date display.",
                ],
                test_data="Activity Date: 2026-10-15.",
                expected_result="Date is populated in the form input field in ISO format (YYYY-MM-DD).",
                pass_fail_criteria="Pass: Activity date is selected and recorded.\nFail: Date selection fails.",
            ),
            TestCase(
                id="TC008",
                description="CRITICAL VERIFIED RULE: Remarks / Notes to Evaluator is mandatory",
                preconditions="Budget Request form is open with Title, Description, Date, Venue, Amount, and Category filled.",
                steps=[
                    "Leave Remarks field empty.",
                    "Attach PDF proposal document.",
                    "Click submit.",
                ],
                test_data="Empty remarks field.",
                expected_result="Submission is blocked with toast: 'Complete the budget form: Activity title, description, proposed date, venue, requested amount, purpose/category, and remarks are required.'",
                pass_fail_criteria="Pass: Empty remarks field blocks submission.\nFail: Form submits without remarks.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Large Amounts, Itemized Breakdown & Form Inputs
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Large Amounts, Itemized Breakdown & Form Inputs",
        test_cases=[
            TestCase(
                id="TC009",
                description="Verify acceptance of large valid whole peso amount (e.g. ₱250,000)",
                preconditions="Budget Request form is open.",
                steps=[
                    "Enter Requested Amount: 250000.",
                    "Verify input acceptance and numeric integrity.",
                ],
                test_data="Requested Amount: 250000.",
                expected_result="Amount is accepted without overflow or truncation. In details and summary tables, it is formatted cleanly with currency symbol (₱250,000.00).",
                pass_fail_criteria="Pass: Large whole peso amount is recorded accurately.\nFail: Amount overflows or throws error.",
            ),
            TestCase(
                id="TC010",
                description="Verify Description / Objectives multiline text entry",
                preconditions="Budget Request form is open.",
                steps=[
                    "Enter detailed project description and objectives in the textarea.",
                    "Verify multiline formatting and character wrapping.",
                ],
                test_data="Description: 'A two-day leadership summit aimed at empowering barangay youth leaders with project management skills.'",
                expected_result="Multiline text is accepted and preserved with line breaks intact.",
                pass_fail_criteria="Pass: Description textarea accepts and preserves formatted text.\nFail: Text is truncated or strips formatting.",
            ),
            TestCase(
                id="TC011",
                description="Verify Venue input text validation and special characters",
                preconditions="Budget Request form is open.",
                steps=[
                    "Enter Venue: 'Pasig City Sports Complex, Caruncho Ave., Brgy. San Nicolas'.",
                    "Verify special characters (commas, periods, numbers) are preserved.",
                ],
                test_data="Venue: 'Pasig City Sports Complex, Caruncho Ave., Brgy. San Nicolas'.",
                expected_result="Venue text is accepted and saved cleanly.",
                pass_fail_criteria="Pass: Venue text is recorded accurately.\nFail: Special characters cause errors.",
            ),
            TestCase(
                id="TC012",
                description="Verify cancel and discard changes in Budget Request form",
                preconditions="Budget Request form is open with partially filled inputs.",
                steps=[
                    "Enter Activity Title: 'Discard Test'.",
                    "Click 'Cancel' / 'Close' (X) button.",
                    "Re-open '+ New Budget Request'.",
                ],
                test_data="Form cancellation.",
                expected_result="Modal closes immediately without saving. Re-opening modal presents fresh empty input fields.",
                pass_fail_criteria="Pass: Cancellation discards unsaved draft without side effects.\nFail: Modal fails to close or saves phantom record.",
            ),
            TestCase(
                id="TC013",
                description="Verify non-numeric character rejection in Requested Amount field",
                preconditions="Budget Request form is open.",
                steps=[
                    "Attempt to type letters ('abc') or special symbols ('$#@') into the Requested Amount field.",
                    "Observe input behavior.",
                ],
                test_data="Input: 'abc$#@'.",
                expected_result="Input field restricts non-numeric keystrokes or strips non-digit characters, maintaining clean numeric value.",
                pass_fail_criteria="Pass: Non-numeric characters are barred from amount field.\nFail: Letters are accepted in currency field.",
            ),
            TestCase(
                id="TC014",
                description="Verify Activity Title length boundary and whitespace trimming",
                preconditions="Budget Request form is open.",
                steps=[
                    "Enter Activity Title with leading and trailing spaces: '   Clean-Up Drive 2026   '.",
                    "Save request.",
                ],
                test_data="Title: '   Clean-Up Drive 2026   '.",
                expected_result="System trims leading and trailing whitespace. Saved title is cleanly stored as 'Clean-Up Drive 2026'.",
                pass_fail_criteria="Pass: Whitespace is trimmed properly.\nFail: Untrimmed whitespace creates malformed records.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Project Proposal Upload & Validation (Section 3: Detailed Project Proposal)
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Project Proposal Upload & Validation (Section 3: Detailed Project Proposal)",
        test_cases=[
            TestCase(
                id="TC015",
                description="Mandatory Detailed Project Proposal upload verification in Section 3",
                preconditions="All text fields are filled with valid data. Section 3 displays 'Detailed Project Proposal' with description 'Upload your orgs detailed project budget proposal for administrative review'.",
                steps=[
                    "Inspect Section 3 header and copy in the budget creation workspace.",
                    "Do NOT upload any proposal document.",
                    "Click 'Submit Proposal'.",
                ],
                test_data="Section 3: Detailed Project Proposal.",
                expected_result="Section 3 is clearly labeled 'Detailed Project Proposal' with description 'Upload your orgs detailed project budget proposal for administrative review'. Missing file blocks submission with validation toast: 'Attach the required document: Please upload the detailed project proposal before saving the request.'",
                pass_fail_criteria="Pass: Section 3 renders current copy and enforces mandatory proposal upload.\nFail: Obsolete 'Detailed Budget Document' title appears or submission proceeds without file.",
            ),
            TestCase(
                id="TC016",
                description="Verify successful upload of valid PDF project proposal (<25MB)",
                preconditions="Budget Request form is open.",
                steps=[
                    "Click 'Upload Document' or drag and drop file in Section 3.",
                    "Select valid PDF 'Youth_Summit_2026_Proposal.pdf' (size: 2.4 MB).",
                    "Observe upload progress and slot card.",
                ],
                test_data="File: 'Youth_Summit_2026_Proposal.pdf', size: 2.4 MB.",
                expected_result="File uploads successfully. Slot displays filename, formatted file size ('2.4 MB'), upload timestamp, and 'Preview' / 'Remove' actions.",
                pass_fail_criteria="Pass: Valid PDF proposal uploads cleanly and displays file details.\nFail: Upload errors out or metadata fails to show.",
            ),
            TestCase(
                id="TC017",
                description="CRITICAL VERIFIED RULE: Rejection of non-PDF file formats ('PDF only' toast)",
                preconditions="Budget Request form is open.",
                steps=[
                    "Attempt to upload 'Proposal.docx' or 'Proposal.png'.",
                    "Observe client validation alert.",
                ],
                test_data="File: 'Proposal.docx'.",
                expected_result="Upload is blocked with destructive toast: 'PDF only: Please upload a PDF file for the budget request document.'",
                pass_fail_criteria="Pass: Non-PDF uploads are rejected with exact 'PDF only' toast.\nFail: Non-PDF files upload without error.",
            ),
            TestCase(
                id="TC018",
                description="Verify proposal upload rejection of oversized PDF (>25MB)",
                preconditions="Budget Request form is open.",
                steps=[
                    "Attempt to upload PDF file 'Large_Design_Doc.pdf' with size 27.5 MB.",
                    "Observe validation message.",
                ],
                test_data="File: 'Large_Design_Doc.pdf', size: 27.5 MB.",
                expected_result="Upload is blocked immediately with error: 'File size must not exceed 25MB.'",
                pass_fail_criteria="Pass: Files exceeding 25MB boundary are rejected.\nFail: Oversized file is uploaded.",
            ),
            TestCase(
                id="TC019",
                description="Verify proposal upload rejection of corrupted or 0-byte PDF",
                preconditions="Budget Request form is open.",
                steps=[
                    "Attempt to upload 0-byte file 'empty_proposal.pdf'.",
                    "Attempt to upload text file renamed to 'corrupted.pdf' lacking %PDF- header.",
                ],
                test_data="0-byte file; corrupted binary file.",
                expected_result="Upload is blocked with validation error indicating empty or invalid PDF structure.",
                pass_fail_criteria="Pass: Corrupted and empty files are rejected.\nFail: Corrupted file uploads.",
            ),
            TestCase(
                id="TC020",
                description="Verify PDF proposal preview in viewer modal",
                preconditions="Valid PDF proposal has been uploaded to the form.",
                steps=[
                    "Click 'Preview' (Eye icon) on the uploaded file card.",
                    "Verify document viewer renders PDF pages.",
                    "Close preview modal.",
                ],
                test_data="Uploaded proposal PDF.",
                expected_result="Modal opens rendering PDF pages clearly without navigating away from the form. Closing returns focus to form.",
                pass_fail_criteria="Pass: Proposal preview functions without breaking form state.\nFail: Preview crashes or alters form input.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Submission Processing, Immediate Feedback & Workspace Details
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Submission Processing, Immediate Feedback & Workspace Details",
        test_cases=[
            TestCase(
                id="TC021",
                description="Submit interaction: Immediate 'Submitting Proposal...' spinner feedback and disabled button state",
                preconditions="All required fields and valid PDF proposal are filled in Budget Request creation modal.",
                steps=[
                    "Click 'Submit Proposal' button.",
                    "Observe immediate visual feedback on the button.",
                    "Verify button is disabled during submission to prevent double submission.",
                ],
                test_data="Click 'Submit Proposal'.",
                expected_result="Button immediately updates to display 'Submitting Proposal...' with a visible animated spinner. The button becomes disabled, providing instant user feedback without freezing the screen.",
                pass_fail_criteria="Pass: Button disables and displays 'Submitting Proposal...' with spinner instantly upon click.\nFail: Button does not provide loading feedback or allows multiple clicks.",
            ),
            TestCase(
                id="TC022",
                description="Successful submission of Budget Request transitions status to 'Submitted' / 'Pending Review'",
                preconditions="Complete budget request submitted by accredited organization user.",
                steps=[
                    "Complete submission execution.",
                    "Observe feedback toast notification.",
                    "Inspect budget requests list in workspace.",
                ],
                test_data="Complete Budget Request for ₱100,000.",
                expected_result="Request submits successfully. Success toast confirms 'Budget request submitted.' Status displays 'Submitted' / 'Pending Review' (blue badge).",
                pass_fail_criteria="Pass: Request submits cleanly and displays Pending Review status.\nFail: Submission fails or status is incorrect.",
            ),
            TestCase(
                id="TC023",
                description="Verify opening Budget Request Details Drawer in User Portal",
                preconditions="Budget request is in 'Pending Review' status.",
                steps=[
                    "Click on the budget request card or 'View Details' button.",
                    "Inspect the opened drawer content.",
                    "Verify Activity Title, Requested Amount (₱100,000.00), Status ('Pending Review'), Proposal Attachment link, and Remarks.",
                ],
                test_data="Budget request ID.",
                expected_result="Details drawer slides open displaying complete request summary, tracking code, formatted requested amount, proposal download link, and current review stage.",
                pass_fail_criteria="Pass: Drawer renders complete request information in read-only mode.\nFail: Drawer fails to open or is missing key data.",
            ),
            TestCase(
                id="TC024",
                description="Verify downloading attached proposal document from Details Drawer",
                preconditions="Budget request drawer is open.",
                steps=[
                    "Locate attached proposal document.",
                    "Click 'Download' button.",
                ],
                test_data="Attached PDF file.",
                expected_result="Browser downloads the original proposal PDF file with its original filename.",
                pass_fail_criteria="Pass: Proposal file downloads cleanly.\nFail: Download fails or produces corrupted file.",
            ),
            TestCase(
                id="TC025",
                description="Verify user dashboard KPI card reflects pending budget request count",
                preconditions="Organization has 1 submitted budget request under review.",
                steps=[
                    "Navigate to Organization Dashboard (/dashboard).",
                    "Inspect Budget / Financial Grants summary card.",
                ],
                test_data="User dashboard.",
                expected_result="Dashboard reflects 1 active request in review with total requested amount displayed.",
                pass_fail_criteria="Pass: Dashboard reflects active budget requests accurately.\nFail: Dashboard counter does not update.",
            ),
            TestCase(
                id="TC026",
                description="Verify Budget Request persistence across browser page refresh",
                preconditions="User has 1 submitted budget request in 'Pending Review'.",
                steps=[
                    "Note the request tracking code and details.",
                    "Perform browser hard refresh (Ctrl + F5).",
                    "Inspect budget list.",
                ],
                test_data="Submitted budget request.",
                expected_result="Budget request card remains visible with exact status 'Pending Review', correct amounts, and proposal link intact.",
                pass_fail_criteria="Pass: Request details persist across browser refreshes.\nFail: Request disappears or resets status.",
            ),
            TestCase(
                id="TC027",
                description="Verify unaccredited organization cannot create Budget Requests",
                preconditions="User is logged in under an organization with Pending or Expired accreditation.",
                steps=[
                    "Navigate to /budget-request.",
                    "Observe eligibility restriction notice and '+ New Budget Request' button state.",
                ],
                test_data="Unaccredited organization profile.",
                expected_result="System displays an eligibility restriction message: 'Financial Grant Requests require an Active YORP Accreditation.' The '+ New Budget Request' button is disabled or hidden.",
                pass_fail_criteria="Pass: Unaccredited organizations are barred from creating budget requests.\nFail: Button is clickable and allows unaccredited submissions.",
            ),
            TestCase(
                id="TC028",
                description="Verify multiple budget requests submitted by same organization operate independently",
                preconditions="Organization user has 1 existing budget request.",
                steps=[
                    "Click '+ New Budget Request' to create a second request.",
                    "Fill in details for 'Youth Health Caravan' with amount ₱60,000 and valid PDF.",
                    "Submit proposal.",
                    "Inspect budget list.",
                ],
                test_data="Second budget request.",
                expected_result="Second request submits successfully and appears in the list alongside the first request. Both requests operate with independent lifecycle states.",
                pass_fail_criteria="Pass: Multiple requests can be created and managed independently.\nFail: Second submission fails or overwrites first.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Budget Request Creation Across Viewports
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Budget Request Creation Across Viewports",
        test_cases=[
            TestCase(
                id="TC029",
                description="Verify Budget Request Workspace and Creation Modal on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /budget-request as accredited organization user.",
                    "Click '+ New Budget Request' and inspect modal.",
                    "Verify layout, Section 3: Detailed Project Proposal dropzone, and Submit Proposal button.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop budget modal opens with wide layout (max-w-4xl). Input fields and Section 3 dropzone are well-spaced and legible.",
                pass_fail_criteria="Pass: Desktop layout renders all sections and controls cleanly.\nFail: Modal is cramped, fields overlap, or text wraps awkwardly.",
            ),
            TestCase(
                id="TC030",
                description="Verify Budget Request Workspace on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /budget-request and open '+ New Budget Request' on tablet viewport.",
                    "Verify form adapts with touch-friendly input fields and dropzone.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Modal adapts to 90% tablet width. Form fields adjust cleanly with touch targets of at least 44px height.",
                pass_fail_criteria="Pass: Tablet layout provides tap-friendly inputs and handles drafting smoothly.\nFail: Form overflows horizontally or inputs are unclickable.",
            ),
            TestCase(
                id="TC031",
                description="Verify Budget Request Workspace on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /budget-request on mobile phone viewport.",
                    "Verify budget requests list renders as stacked mobile cards with status pills.",
                    "Click '+ New Budget Request' and verify form opens in full-screen modal.",
                    "Verify Section 3 dropzone and sticky 'Submit Proposal' button.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Budget requests display as touch-friendly cards. Request form occupies full screen with stacked inputs. Sticky 'Submit Proposal' bar stays visible without obstructing input fields.",
                pass_fail_criteria="Pass: Mobile phone interface allows seamless budget drafting with zero horizontal overflow.\nFail: Modal overflows screen or submit button is unreachable.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_08_groups()
    output_filename = "08_YTRACE_Budget_Request_Creation_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="08",
        section_title="Budget Request Creation & Management Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

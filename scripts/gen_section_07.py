"""
Generator for Section 07: YPOP Incentive & PPA Submission Black-Box Test Cases.
Document: 07_YTRACE_YPOP_PPA_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_07_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Organization-Led PPA Creation, Draft Management & Regression Protection
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Organization-Led PPA Creation, Draft Management & Regression Protection",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify opening of New Organization-Led Activity Modal",
                preconditions="Accredited organization user is on the YPOP Workspace (/ypop) under the Org-Led tab during an open period.",
                steps=[
                    "Navigate to YPOP Workspace.",
                    "Select 'Org-Led Activities' tab.",
                    "Click '+ Add Activity' / 'Submit New Activity' button.",
                ],
                test_data="N/A",
                expected_result="The 'Submit Organization-Led Activity' modal opens displaying input fields for Activity Title, Date Conducted, Venue, Narrative Report, and File Upload dropzone.",
                pass_fail_criteria="Pass: Modal opens cleanly with all expected form fields initialized.\nFail: Modal fails to open or is missing required inputs.",
            ),
            TestCase(
                id="TC002",
                description="Verify client validation on required fields for Organization-Led Activity",
                preconditions="PPA creation modal is open.",
                steps=[
                    "Leave Activity Title and Date Conducted blank.",
                    "Click 'Submit for Review'.",
                    "Observe validation indicators.",
                ],
                test_data="Empty form fields.",
                expected_result="Submission is blocked. Field validation highlights required fields (Activity Title, Date Conducted) with messages indicating they cannot be empty.",
                pass_fail_criteria="Pass: Required field validation prevents submission of empty form.\nFail: Form submits with empty required fields.",
            ),
            TestCase(
                id="TC003",
                description="Verify PDF attachment requirement on direct 'Submit for Review'",
                preconditions="PPA creation modal is open with title, date, venue, and narrative filled in.",
                steps=[
                    "Fill in valid Activity Title, Date, Venue, and Narrative Report.",
                    "Do NOT attach any PDF verification file.",
                    "Click 'Submit for Review'.",
                ],
                test_data="Title: 'Community Clean-Up', Date: '2026-09-10', Venue: 'Barangay Hall', Narrative: 'Clean-up drive.', No files.",
                expected_result="System blocks submission and displays validation toast/message: 'Please attach at least one supporting document or accomplishment report (PDF) before submitting for review.'",
                pass_fail_criteria="Pass: Direct submission requires at least one attachment.\nFail: Activity submits without supporting documentation.",
            ),
            TestCase(
                id="TC004",
                description="Verify 'Save as Draft' workflow creates exactly one Draft row",
                preconditions="PPA modal is open.",
                steps=[
                    "Enter Activity Title: 'Youth Leadership Workshop 2026'.",
                    "Select Date Conducted: '2026-09-12'.",
                    "Enter Venue: 'Pasig City Library'.",
                    "Enter Narrative: 'Initial draft notes for leadership workshop.'",
                    "Attach a draft PDF file 'draft_notes.pdf'.",
                    "Click 'Save as Draft'.",
                ],
                test_data="Title: 'Youth Leadership Workshop 2026', File: 'draft_notes.pdf'.",
                expected_result="Modal closes. A toast confirms 'Draft saved successfully.' In the Org-Led activities list, EXACTLY ONE row appears with status 'Draft'. Edit and Delete actions are available.",
                pass_fail_criteria="Pass: Exactly one Draft activity row appears with accurate details.\nFail: Multiple rows appear or activity fails to save.",
            ),
            TestCase(
                id="TC005",
                description="CRITICAL REGRESSION: Direct 'Submit for Review' does NOT create transient duplicate Draft row",
                preconditions="User opens modal to create a new activity from scratch.",
                steps=[
                    "Fill in Activity Title: 'Barangay Tree Planting Program'.",
                    "Select Date Conducted: '2026-09-14'.",
                    "Enter Venue: 'Riverbank Green Park'.",
                    "Enter Narrative Report: 'Planted 200 native seedlings along the river corridor.'",
                    "Attach valid PDF: 'Tree_Planting_Narrative_Report.pdf' (1.8 MB).",
                    "Click 'Submit for Review'.",
                    "Closely observe the Org-Led activities table during and immediately after submission.",
                ],
                test_data="Activity Title: 'Barangay Tree Planting Program', File: 'Tree_Planting_Narrative_Report.pdf'.",
                expected_result="Modal closes and success toast appears. In the activities list, EXACTLY ONE activity card appears with status badge 'Pending Review'. At NO point does a temporary or duplicate 'Draft' row flicker or appear in the table.",
                pass_fail_criteria="Pass: Exactly one 'Pending Review' card appears; zero transient Draft rows are rendered.\nFail: A duplicate Draft card briefly or permanently displays.",
            ),
            TestCase(
                id="TC006",
                description="Verify persistence of directly submitted PPA activity after page refresh",
                preconditions="TC005 has completed with one activity in 'Pending Review' status.",
                steps=[
                    "Note the details of the submitted activity 'Barangay Tree Planting Program'.",
                    "Execute hard page refresh (Ctrl + F5).",
                    "Navigate back to Org-Led tab if needed.",
                    "Inspect the activity listing.",
                ],
                test_data="Submitted activity from TC005.",
                expected_result="Exactly ONE activity row is displayed with status 'Pending Review'. No duplicate rows or orphaned drafts are present after browser reload.",
                pass_fail_criteria="Pass: Single submitted activity persists reliably across page reloads.\nFail: Multiple rows or reverted draft status appears upon refresh.",
            ),
            TestCase(
                id="TC007",
                description="Verify editing an existing Draft PPA activity",
                preconditions="An activity exists in 'Draft' status.",
                steps=[
                    "Click 'Edit' (Pencil icon) on the Draft activity card.",
                    "Verify modal opens pre-populated with saved draft details.",
                    "Change Activity Title to: 'Youth Leadership Workshop 2026 — Revised'.",
                    "Update Narrative text.",
                    "Click 'Save as Draft'.",
                ],
                test_data="Updated Title: 'Youth Leadership Workshop 2026 — Revised'.",
                expected_result="Modal closes. Draft card updates in real time to show the modified title and narrative without changing its 'Draft' status or duplicating records.",
                pass_fail_criteria="Pass: Draft updates cleanly with modified fields preserved.\nFail: Update fails or creates new record.",
            ),
            TestCase(
                id="TC008",
                description="Verify deleting an existing Draft PPA activity",
                preconditions="An activity exists in 'Draft' status.",
                steps=[
                    "Click 'Delete' (Trash icon) on the Draft activity card.",
                    "Confirm deletion in the confirmation dialog.",
                    "Observe activities list.",
                ],
                test_data="Target Draft activity.",
                expected_result="Confirmation dialog prompts user. Upon confirming, the draft is deleted. Toast confirms deletion and the activity card is removed from the view.",
                pass_fail_criteria="Pass: Draft is removed cleanly upon user confirmation.\nFail: Draft remains visible or deletion fails.",
            ),
            TestCase(
                id="TC009",
                description="Verify submitting an existing Draft activity for review",
                preconditions="A Draft activity exists with all required fields and an attached PDF.",
                steps=[
                    "Click 'Edit' on the Draft activity.",
                    "Verify attached PDF file is present.",
                    "Click 'Submit for Review'.",
                    "Observe list update.",
                ],
                test_data="Existing Draft with 'draft_notes.pdf'.",
                expected_result="Draft activity transitions to status 'Pending Review'. The Draft badge changes to blue 'Pending Review'. Edit and Delete actions are replaced by 'View Details'.",
                pass_fail_criteria="Pass: Existing draft transitions smoothly to Pending Review without duplicate items.\nFail: Activity remains Draft or duplicates.",
            ),
            TestCase(
                id="TC010",
                description="Verify file size and format validation during PPA document upload",
                preconditions="PPA creation modal is open.",
                steps=[
                    "Attempt to upload an executable file ('malware.exe').",
                    "Attempt to upload a valid PDF exceeding 25MB.",
                    "Attempt to upload an empty 0-byte PDF.",
                ],
                test_data="Invalid files: .exe, >25MB PDF, 0-byte PDF.",
                expected_result="System rejects invalid file uploads with clear feedback ('Only PDF documents are allowed', 'File size must not exceed 25MB', 'Empty file not allowed'). Valid PDF file slot remains clean.",
                pass_fail_criteria="Pass: File validation rejects non-PDF, oversized, and empty files.\nFail: Invalid files upload successfully.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Organization-Led PPA Review Submission & Lifecycle
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Organization-Led PPA Review Submission & Lifecycle",
        test_cases=[
            TestCase(
                id="TC011",
                description="Verify viewing details drawer for a submitted PPA activity",
                preconditions="An activity is in 'Pending Review' status.",
                steps=[
                    "Click on the activity card or 'View Details' button.",
                    "Inspect the drawer/modal content.",
                    "Verify Activity Title, Date, Venue, Narrative Report, and attached PDF links.",
                ],
                test_data="Submitted activity ID.",
                expected_result="Detail view opens displaying complete submitted metadata and file attachments. File preview/download links are active. Editing controls are disabled.",
                pass_fail_criteria="Pass: Submitted activity details and files render in read-only mode.\nFail: Details cannot be viewed or edit inputs remain unlocked.",
            ),
            TestCase(
                id="TC012",
                description="Verify User Portal reflection when PPA is flagged as 'Needs Revision'",
                preconditions="Admin has reviewed the PPA and set status to 'Needs Revision' with remarks.",
                steps=[
                    "Log in as organization user and open YPOP Org-Led tab.",
                    "Locate the flagged activity card.",
                    "Inspect status badge and admin feedback display.",
                ],
                test_data="Activity with admin remarks: 'Please attach signed attendance sheet and photo documentation.'",
                expected_result="Status badge shows amber 'Needs Revision'. An alert box prominently displays the administrator's exact remarks. An 'Edit & Resubmit' or 'Replace File' action becomes enabled.",
                pass_fail_criteria="Pass: Needs Revision status and admin remarks are clearly rendered to user.\nFail: Status or remarks fail to display.",
            ),
            TestCase(
                id="TC013",
                description="Verify document replacement and resubmission of PPA under 'Needs Revision'",
                preconditions="Activity is in 'Needs Revision' status.",
                steps=[
                    "Click 'Edit & Resubmit' on the flagged activity card.",
                    "Upload updated PDF file 'Complete_Attendance_and_Photos.pdf'.",
                    "Update narrative if necessary.",
                    "Click 'Resubmit for Review'.",
                ],
                test_data="Updated PDF: 'Complete_Attendance_and_Photos.pdf'.",
                expected_result="File is uploaded and replaces the flagged attachment. Status transitions back to 'Pending Review'. User sees confirmation toast 'Activity resubmitted successfully.'",
                pass_fail_criteria="Pass: Resubmission transitions activity back to Pending Review with new file attached.\nFail: Resubmission fails or retains old file.",
            ),
            TestCase(
                id="TC014",
                description="Verify User Portal reflection when PPA is 'Approved'",
                preconditions="Admin has approved the PPA activity.",
                steps=[
                    "Navigate to YPOP Workspace -> Org-Led tab.",
                    "Locate approved activity.",
                    "Observe badge, points awarded, and cumulative score summary.",
                ],
                test_data="Approved activity with 10 points awarded.",
                expected_result="Status badge displays green 'Approved'. Points awarded (e.g. '+10 pts') are shown on the card. The organization's total YPOP points in the header banner increment accordingly.",
                pass_fail_criteria="Pass: Activity reflects Approved status and updates cumulative points score.\nFail: Points fail to increment or badge remains pending.",
            ),
            TestCase(
                id="TC015",
                description="Verify User Portal reflection when PPA is 'Rejected'",
                preconditions="Admin has rejected the PPA activity with remarks.",
                steps=[
                    "Navigate to YPOP Workspace -> Org-Led tab.",
                    "Locate rejected activity card.",
                    "Inspect status and admin remarks.",
                ],
                test_data="Rejected activity with remarks: 'Activity conducted outside eligible period.'",
                expected_result="Status badge displays red 'Rejected'. Admin rejection remarks are visible. No edit, delete, or resubmit actions are available (terminal state). Zero points awarded.",
                pass_fail_criteria="Pass: Rejected state is terminal, displays remarks, and awards 0 points.\nFail: Rejected activity allows resubmission.",
            ),
            TestCase(
                id="TC016",
                description="Verify responsiveness of PPA submission drawer on mobile viewports",
                preconditions="PPA submission modal/drawer is open on a mobile viewport (width <= 768px).",
                steps=[
                    "Resize browser viewport to 375px width (iPhone standard).",
                    "Open PPA submission form.",
                    "Verify full-screen sheet layout, input readability, and sticky submit action buttons.",
                ],
                test_data="Viewport width: 375px.",
                expected_result="Form renders as a bottom sheet / full-screen drawer. All form inputs, date picker, and file upload dropzones are cleanly stacked without horizontal clipping. Submit button remains accessible.",
                pass_fail_criteria="Pass: Mobile layout adapts smoothly without horizontal overflow.\nFail: Content overflows or buttons become unreachable.",
            ),
            TestCase(
                id="TC017",
                description="Verify multiple PPA submissions within the same semester period",
                preconditions="Organization user has already submitted 1 approved activity in the current semester.",
                steps=[
                    "Click '+ Add Activity' to create a second activity.",
                    "Fill in details for 'Youth Blood Donation Campaign'.",
                    "Attach PDF proof and submit.",
                    "Inspect list of activities.",
                ],
                test_data="Second activity submission.",
                expected_result="Second activity submits successfully and appears alongside the first activity. The list displays both activities independently with their respective statuses.",
                pass_fail_criteria="Pass: Multiple distinct activities can be submitted within the period.\nFail: System prevents subsequent submissions.",
            ),
            TestCase(
                id="TC018",
                description="Verify submission blocking when YPOP period is closed",
                preconditions="Current YPOP period has passed its submission deadline and is in 'Closed' or 'Evaluation' status.",
                steps=[
                    "Navigate to YPOP Workspace.",
                    "Inspect period status banner.",
                    "Attempt to click '+ Add Activity' or submit draft.",
                ],
                test_data="Closed semester period.",
                expected_result="Banner indicates 'Submissions Closed for this semester'. The '+ Add Activity' button is hidden or disabled. Existing drafts cannot be submitted for review.",
                pass_fail_criteria="Pass: Submissions are locked when period deadline expires.\nFail: User can submit activities during closed periods.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: City-Led PPA Participation & Attendance Proof
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="City-Led PPA Participation & Attendance Proof",
        test_cases=[
            TestCase(
                id="TC019",
                description="Verify listing of City-Led Events in YPOP Workspace",
                preconditions="Organization user navigates to YPOP Workspace -> 'City-Led Activities' tab.",
                steps=[
                    "Click 'City-Led Activities' tab.",
                    "Observe the list of published city-organized youth events.",
                    "Verify event titles, dates, venues, allocated incentive points, and status.",
                ],
                test_data="Published city-led events (e.g. 'Pasig Youth Month Kickoff', 'City Leadership Conclave').",
                expected_result="All published city-led events for the active semester are listed with dates, organizer details, point values, and participation status badges ('Not Joined', 'Submitted', 'Verified').",
                pass_fail_criteria="Pass: City-led events render with correct metadata and status.\nFail: Events fail to load.",
            ),
            TestCase(
                id="TC020",
                description="Verify submission of attendance proof for a City-Led Event",
                preconditions="User is on City-Led tab with an event in 'Not Joined' status.",
                steps=[
                    "Click 'Submit Proof' / 'Participate' on 'Pasig Youth Month Kickoff'.",
                    "Modal opens prompting for attendance documentation.",
                    "Upload valid PDF attendance certificate / photo sheet 'Youth_Month_Attendance.pdf'.",
                    "Enter participant count (e.g. 15 members) and optional remarks.",
                    "Click 'Submit Participation'.",
                ],
                test_data="Event: 'Pasig Youth Month Kickoff', Proof: 'Youth_Month_Attendance.pdf', Participants: 15.",
                expected_result="Proof uploads successfully. Event status changes to 'Submitted' / 'Pending Review'. Card displays submitted date, participant count, and file link.",
                pass_fail_criteria="Pass: Attendance proof submits cleanly and transitions status to Pending Review.\nFail: Upload fails or status does not update.",
            ),
            TestCase(
                id="TC021",
                description="Verify City-Led attendance proof validation against non-PDF uploads",
                preconditions="City-Led proof submission modal is open.",
                steps=[
                    "Select an image file ('photo.jpg') or text file ('names.txt').",
                    "Observe upload response.",
                ],
                test_data="File: 'photo.jpg'.",
                expected_result="System displays validation error requiring PDF format: 'Attendance documentation must be in PDF format.' Upload is rejected.",
                pass_fail_criteria="Pass: Non-PDF uploads are rejected.\nFail: Non-PDF files upload without error.",
            ),
            TestCase(
                id="TC022",
                description="Verify preview and replacement of submitted City-Led attendance proof",
                preconditions="Attendance proof is submitted and currently under pending review.",
                steps=[
                    "Click 'View Proof' on the city-led event card to view PDF.",
                    "Click 'Replace Proof'.",
                    "Select revised PDF 'Youth_Month_Attendance_v2.pdf'.",
                    "Confirm upload.",
                ],
                test_data="Replacement file: 'Youth_Month_Attendance_v2.pdf'.",
                expected_result="PDF preview opens cleanly. Replacement replaces the existing file on record and updates file size and timestamp.",
                pass_fail_criteria="Pass: Document preview works and replacement succeeds.\nFail: Preview crashes or replacement fails.",
            ),
            TestCase(
                id="TC023",
                description="Verify City-Led event verification by Admin awards fixed points",
                preconditions="Admin verifies organization's attendance at City-Led event.",
                steps=[
                    "User opens City-Led tab after admin verification.",
                    "Observe status badge and points.",
                ],
                test_data="City-led event with 15 fixed points.",
                expected_result="Event badge updates to green 'Verified' / 'Completed'. The 15 incentive points are added to the organization's cumulative YPOP total.",
                pass_fail_criteria="Pass: Verified status reflects and points are awarded accurately.\nFail: Points are omitted or status stays pending.",
            ),
            TestCase(
                id="TC024",
                description="Verify City-Led event rejection when proof is invalid",
                preconditions="Admin reviews attendance proof and determines organization did not attend.",
                steps=[
                    "Admin rejects proof with remarks 'No delegates shown in official photo log.'",
                    "User opens City-Led tab.",
                    "Inspect event status.",
                ],
                test_data="Remarks: 'No delegates shown in official photo log.'",
                expected_result="Status updates to red 'Not Verified' / 'Rejected' with admin remarks visible. 0 points are credited.",
                pass_fail_criteria="Pass: Rejection reflects remarks and awards 0 points.\nFail: Rejection remarks missing.",
            ),
            TestCase(
                id="TC025",
                description="Verify filtering of City-Led events by status (All, Pending, Verified)",
                preconditions="Multiple city-led events exist in various states.",
                steps=[
                    "Click filter tab 'Verified'.",
                    "Click filter tab 'Pending'.",
                    "Click filter tab 'All Events'.",
                ],
                test_data="Status filter tabs.",
                expected_result="List filters immediately to show only events matching the active filter tab.",
                pass_fail_criteria="Pass: Event filtering functions accurately.\nFail: Incorrect events display under filters.",
            ),
            TestCase(
                id="TC026",
                description="Verify cross-tab total score synchronization between Org-Led and City-Led points",
                preconditions="Organization has 20 points from Org-Led activities and 15 points from City-Led events.",
                steps=[
                    "Inspect total points counter on YPOP header summary banner.",
                    "Toggle between Org-Led and City-Led tabs.",
                    "Verify total is exactly 35 points.",
                ],
                test_data="Org-Led: 20 pts, City-Led: 15 pts.",
                expected_result="Banner displays 'Total YPOP Points: 35'. Progress towards incentive qualification tier (e.g. 50 pts target) reflects 70% progress accurately.",
                pass_fail_criteria="Pass: Total points correctly aggregate Org-Led and City-Led earned points.\nFail: Points calculation is incorrect.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Administrative Review, Scoring, Period Management & RBAC
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Administrative Review, Scoring, Period Management & RBAC",
        test_cases=[
            TestCase(
                id="TC027",
                description="Verify Admin YPOP submissions queue listing",
                preconditions="Organization has submitted an Org-Led activity for review.",
                steps=[
                    "Sign in as Administrator and navigate to Admin Portal -> YPOP Review.",
                    "Select current active semester period.",
                    "Inspect table rows for submitted PPA activities.",
                    "Verify columns: Organization Name, Activity Title, Date Conducted, Venue, Attachments, Status, Actions.",
                ],
                test_data="Submitted activity from organization.",
                expected_result="Submission appears in the queue with status 'Pending Review' and formatted submission date.",
                pass_fail_criteria="Pass: Submitted activity is listed in admin review queue with complete metadata.\nFail: Submission is missing from queue.",
            ),
            TestCase(
                id="TC028",
                description="Verify Admin inspection of PPA narrative and PDF attachments in review drawer",
                preconditions="Admin locates pending PPA in review table.",
                steps=[
                    "Click 'Review' action button on the table row.",
                    "Inspect review drawer displaying organization profile, narrative report, and file attachments.",
                    "Click attachment preview link.",
                ],
                test_data="PPA Activity ID.",
                expected_result="Review drawer opens. Admin can read full narrative report and view/download attached PDF verification documents inline.",
                pass_fail_criteria="Pass: Complete PPA submission and attachments are accessible in review drawer.\nFail: Files or narrative fail to render.",
            ),
            TestCase(
                id="TC029",
                description="Verify Admin PPA Approval and points assignment",
                preconditions="Admin is in review drawer for a compliant PPA submission.",
                steps=[
                    "Select 'Approve' decision.",
                    "Enter/confirm points to award (e.g. 10 points).",
                    "Enter optional admin commendation remarks.",
                    "Click 'Confirm Approval'.",
                ],
                test_data="Awarded Points: 10.",
                expected_result="Activity status updates to 'Approved'. Table row updates to green 'Approved'. Organization's score is credited with 10 points.",
                pass_fail_criteria="Pass: PPA is approved and points are awarded.\nFail: Approval fails or points not recorded.",
            ),
            TestCase(
                id="TC030",
                description="Verify Admin 'Needs Revision' workflow with mandatory remarks",
                preconditions="Admin is reviewing a PPA submission with incomplete proof.",
                steps=[
                    "Select 'Needs Revision' decision.",
                    "Attempt to confirm with empty remarks.",
                    "Enter mandatory remarks: 'Please attach official attendance sheet with signatures.'",
                    "Click 'Confirm Needs Revision'.",
                ],
                test_data="Remarks: 'Please attach official attendance sheet with signatures.'",
                expected_result="Submission with empty remarks is blocked. Confirming with remarks updates status to 'Needs Revision'. Remarks are stored and dispatched to the organization user.",
                pass_fail_criteria="Pass: Mandatory remarks enforced and status transitions to Needs Revision.\nFail: Revision accepted without remarks.",
            ),
            TestCase(
                id="TC031",
                description="Verify Admin PPA Rejection workflow",
                preconditions="Admin is reviewing an ineligible PPA submission.",
                steps=[
                    "Select 'Reject' decision.",
                    "Enter mandatory rejection justification: 'Activity was not organized by youth delegates.'",
                    "Click 'Confirm Rejection'.",
                ],
                test_data="Remarks: 'Activity was not organized by youth delegates.'",
                expected_result="Activity transitions to 'Rejected' (terminal status). Points awarded are set to 0. Organization cannot resubmit this activity.",
                pass_fail_criteria="Pass: Activity is rejected with remarks and zero points awarded.\nFail: Rejection fails or awards points.",
            ),
            TestCase(
                id="TC032",
                description="Verify Admin City-Led Event Attendance Verification",
                preconditions="Organization has submitted proof for a City-Led event.",
                steps=[
                    "Navigate to Admin Portal -> YPOP City-Led Attendance Queue.",
                    "Locate organization submission for 'Pasig Youth Month Kickoff'.",
                    "Inspect uploaded attendance PDF.",
                    "Click 'Verify Attendance' and confirm.",
                ],
                test_data="City-led attendance proof.",
                expected_result="Submission transitions to 'Verified'. Organization is credited with the event's designated points.",
                pass_fail_criteria="Pass: City-led attendance is verified and points are credited.\nFail: Verification fails.",
            ),
            TestCase(
                id="TC033",
                description="Verify YPOP Semester Period Creation and Configuration by Admin",
                preconditions="Admin is on Admin Portal -> YPOP Period Settings.",
                steps=[
                    "Click '+ New Period'.",
                    "Enter Year: 2026, Semester: '2nd Semester'.",
                    "Set Start Date, Submission Deadline, and Evaluation Deadline.",
                    "Click 'Create Period'.",
                ],
                test_data="Year: 2026, Semester: 2, Deadline: 2026-12-31.",
                expected_result="New period is created and listed. When status is set to 'Open', organizations can begin submitting PPAs for that period.",
                pass_fail_criteria="Pass: Admin can configure and publish new YPOP periods.\nFail: Period creation fails.",
            ),
            TestCase(
                id="TC034",
                description="Verify qualification threshold evaluation and incentive tier determination",
                preconditions="Semester evaluation period is active. Organizations have accumulated points.",
                steps=[
                    "Navigate to Admin Portal -> YPOP Leaderboard / Qualification.",
                    "Inspect ranking list of organizations sorted by total points.",
                    "Verify threshold tags: 'Tier 1 Qualified' (>=50 pts), 'Tier 2 Qualified' (>=30 pts), 'Not Qualified' (<30 pts).",
                ],
                test_data="Threshold values: 50, 30 points.",
                expected_result="Organizations are ranked accurately by total points. Tier qualifications are computed deterministically based on verified points earned.",
                pass_fail_criteria="Pass: Leaderboard and qualification tiers calculate accurately.\nFail: Tiers or ranking incorrect.",
            ),
            TestCase(
                id="TC035",
                description="Verify non-accredited organizations cannot access YPOP submission workflows",
                preconditions="User is logged in under an organization whose registration is pending or unaccredited.",
                steps=[
                    "Navigate to /ypop.",
                    "Inspect page accessibility and submission controls.",
                ],
                test_data="Unaccredited organization account.",
                expected_result="Page displays an eligibility restriction banner: 'YPOP Incentive Program is exclusive to Accredited Organizations in Good Standing.' Submission buttons are disabled.",
                pass_fail_criteria="Pass: Unaccredited organizations are barred from submitting PPAs.\nFail: Unaccredited user can submit PPAs.",
            ),
            TestCase(
                id="TC036",
                description="Verify access restrictions for protected Admin YPOP validation pages",
                preconditions="Organization user attempts direct URL access to /admin/ypop-validation.",
                steps=[
                    "Enter URL http://localhost:5173/admin/ypop-validation directly in browser address bar.",
                    "Observe system navigation response.",
                ],
                test_data="Direct URL: /admin/ypop-validation.",
                expected_result="Access is blocked. The user is redirected to /dashboard or shown an Access Denied message.",
                pass_fail_criteria="Pass: Protected Admin YPOP pages are restricted against non-admin access.\nFail: User can view administrative review page.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive YPOP Workspace & Validation Drawer Across Viewports
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive YPOP Workspace & Validation Drawer Across Viewports",
        test_cases=[
            TestCase(
                id="TC037",
                description="Verify YPOP Incentive Workspace and Admin Validation on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /ypop as accredited organization user.",
                    "Verify multi-tab interface (Org-Led PPAs, City-Led Events, Incentive Standing), wide data tables, and '+ Add Activity' modal.",
                    "Log in as Admin and navigate to /admin/ypop-validation.",
                    "Open PPA review drawer and inspect side-by-side proposal document previewer and scoring rubric criteria.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop layout displays all tabs cleanly with full-width tables. Admin review drawer renders generous 600px width with readable scoring sliders and criteria descriptions.",
                pass_fail_criteria="Pass: Desktop views provide ample workspace for PPA drafting and admin scoring.\nFail: Content wraps awkwardly or review drawer elements overlap.",
            ),
            TestCase(
                id="TC038",
                description="Verify YPOP Incentive Workspace and Admin Validation on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /ypop on tablet viewport.",
                    "Switch tabs between Org-Led PPAs and City-Led Events.",
                    "Scroll horizontally through activity records table.",
                    "Open Admin PPA validation review drawer on tablet.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Tab navigation bar wraps or scrolls horizontally with touch gestures. Activity list table supports smooth horizontal touch-scrolling. Admin scoring inputs are comfortably tap-friendly.",
                pass_fail_criteria="Pass: Tablet layout allows full PPA management and admin scoring without clipped buttons.\nFail: Horizontal scroll gets trapped or tabs cannot be tapped.",
            ),
            TestCase(
                id="TC039",
                description="Verify YPOP Incentive Workspace and Admin Validation on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /ypop on mobile phone viewport.",
                    "Verify semester period selector renders as mobile dropdown.",
                    "Verify PPA activities display as stacked touch cards with colored status pills.",
                    "Tap '+ Add Activity' and verify form modal renders in full-screen mode.",
                    "Log in as Admin and open PPA review drawer on phone viewport.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="PPA workspace renders in a clean single-column mobile view. Form modal and admin evaluation drawer open full-screen with sticky header/footer action buttons.",
                pass_fail_criteria="Pass: Mobile phone interface renders accessible cards, full-screen modals, and touch controls.\nFail: Elements overflow viewport or submit buttons are offscreen.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_07_groups()
    output_filename = "07_YTRACE_YPOP_PPA_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="07",
        section_title="YPOP Incentive & PPA Submission Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


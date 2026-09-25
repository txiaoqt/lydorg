"""
Generator for Section 04: Organization Profile & YORP Registry Black-Box Test Cases.
Document: 04_YTRACE_Organization_Profile_YORP_Registry_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_04_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Organization Profile Viewing & Editing
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Organization Profile Viewing & Editing",
        test_cases=[
            TestCase(
                id="TC001",
                description="View Organization Profile workspace",
                preconditions="User is authenticated as an organization user.",
                steps=[
                    "Navigate to /organization-profile via sidebar or user profile menu.",
                    "Observe the profile workspace layout and sections.",
                ],
                test_data="N/A",
                expected_result="The page loads with organization header (Logo/Avatar, Name, URN, District, Barangay, Accreditation badge), Profile Completeness bar, and editable sections: Basic Information, Contact Information, Head of Organization Details, Adviser Details, and Centers of Youth Participation & Statements.",
                pass_fail_criteria="Pass: Profile workspace renders all sections cleanly.\nFail: Page fails to load or sections are missing.",
            ),
            TestCase(
                id="TC002",
                description="Profile completeness progress bar reflects completion percentage",
                preconditions="Organization profile has some optional/required fields empty.",
                steps=[
                    "Observe the Profile Completeness progress bar and percentage indicator.",
                    "Fill in missing fields (e.g. Adviser Name, Mission Statement).",
                    "Save profile changes.",
                    "Observe the completeness progress bar update.",
                ],
                test_data="Missing fields filled",
                expected_result="The progress bar visually advances and the percentage calculation updates dynamically (e.g. 75% -> 100%).",
                pass_fail_criteria="Pass: Completeness percentage calculates accurately.\nFail: Progress bar does not update after saving.",
            ),
            TestCase(
                id="TC003",
                description="Incomplete profile warning banner displayed when incomplete",
                preconditions="Organization profile is below 100% complete.",
                steps=[
                    "Navigate to /organization-profile.",
                    "Observe the top notification callout banner.",
                ],
                test_data="Completeness: < 100%",
                expected_result="An alert callout banner appears: 'Complete your profile — Ensure all required information, Head of Organization details, and adviser information are provided to enable full system workflows.'",
                pass_fail_criteria="Pass: Incomplete profile warning banner is displayed.\nFail: No guidance is displayed for incomplete profile.",
            ),
            TestCase(
                id="TC004",
                description="Edit organization basic details (acronym, classifications, address)",
                preconditions="User is on /organization-profile in editing mode.",
                steps=[
                    "Update Organization Acronym: 'KYC'.",
                    "Select Major Classification: 'Community-Based Youth Organization'.",
                    "Enter Sub-Classification: 'Civic / Volunteer'.",
                    "Enter Official Headquarters Address: '123 Pasig Blvd, Kapitolyo, Pasig City'.",
                    "Enter Facebook Page URL: 'https://facebook.com/kapitolyoyouthcouncil'.",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Acronym: KYC\nClass: Community-Based\nAddress: 123 Pasig Blvd, Kapitolyo\nFB: https://facebook.com/kapitolyoyouthcouncil",
                expected_result="A success toast notification appears: 'Profile updated successfully.' The updated details are reflected in the view.",
                pass_fail_criteria="Pass: Profile updates are saved and toast confirms.\nFail: Saving fails or values revert.",
            ),
            TestCase(
                id="TC005",
                description="Edit organization Head of Organization leadership details",
                preconditions="User is on /organization-profile.",
                steps=[
                    "Locate 'Head of Organization' section.",
                    "Enter Head of Organization Full Name: 'Juan Dela Cruz'.",
                    "Enter Contact Number: '09171234567'.",
                    "Enter Email: 'juan.delacruz.kyc@gmail.com'.",
                    "Enter Term of Office: '2025 - 2027'.",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Name: Juan Dela Cruz\nContact: 09171234567\nEmail: juan.delacruz.kyc@gmail.com\nTerm: 2025 - 2027",
                expected_result="The leadership information is saved successfully with confirmation toast.",
                pass_fail_criteria="Pass: Leadership details save successfully.\nFail: Errors occur on valid leadership info.",
            ),
            TestCase(
                id="TC006",
                description="Edit organization adviser details",
                preconditions="User is on /organization-profile.",
                steps=[
                    "Locate 'Organization Adviser' section.",
                    "Enter Adviser Full Name: 'Prof. Maria Santos'.",
                    "Enter Adviser Contact Number: '09187654321'.",
                    "Enter Adviser Email: 'maria.santos.adviser@gmail.com'.",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Adviser: Prof. Maria Santos\nContact: 09187654321\nEmail: maria.santos.adviser@gmail.com",
                expected_result="Adviser information is saved successfully with confirmation toast.",
                pass_fail_criteria="Pass: Adviser details save successfully.\nFail: Saving adviser fails.",
            ),
            TestCase(
                id="TC007",
                description="Edit organization Centers of Youth Participation, mission, and vision statements",
                preconditions="User is on /organization-profile.",
                steps=[
                    "Locate 'Centers of Youth Participation & Statements' section.",
                    "Select Centers of Youth Participation: 'Youth Leadership & Good Governance'.",
                    "Enter Mission Statement text.",
                    "Enter Vision Statement text.",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Center: Youth Leadership & Good Governance\nMission: To empower local youth...\nVision: A resilient youth community...",
                expected_result="Centers of Youth Participation and statements are saved successfully and displayed on the profile.",
                pass_fail_criteria="Pass: Centers of Youth Participation, mission, and vision save properly.\nFail: Saving statements produces an error.",
            ),
            TestCase(
                id="TC008",
                description="Validation on invalid email format in profile fields",
                preconditions="User is editing organization profile.",
                steps=[
                    "Enter an invalid email format in the Head of Organization Email field (e.g. 'invalidemail').",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Email: invalidemail",
                expected_result="A validation error appears under the email field: 'Please enter a valid email address.' Saving is blocked.",
                pass_fail_criteria="Pass: Invalid email format is rejected.\nFail: Form saves invalid email format.",
            ),
            TestCase(
                id="TC009",
                description="Validation on invalid contact number in profile fields",
                preconditions="User is editing organization profile.",
                steps=[
                    "Enter a contact number that is not 11 digits starting with 09 (e.g. '12345').",
                    "Click 'Save Profile Changes'.",
                ],
                test_data="Contact: 12345",
                expected_result="A validation error appears: 'Must be 11 digits starting with 09.' Saving is blocked.",
                pass_fail_criteria="Pass: Invalid contact number format is rejected.\nFail: Form saves invalid contact number.",
            ),
            TestCase(
                id="TC010",
                description="Profile updates persist across page refresh",
                preconditions="User has successfully updated profile fields.",
                steps=[
                    "Refresh the browser page (F5).",
                    "Inspect all previously updated profile fields.",
                ],
                test_data="N/A",
                expected_result="All updated profile data (acronym, address, leadership, adviser, mission/vision) remains intact after page reload.",
                pass_fail_criteria="Pass: Profile data persists across refresh.\nFail: Data reverts to prior state on reload.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Profile Completeness Gating & Public Preview
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Profile Completeness Gating & Public Preview",
        test_cases=[
            TestCase(
                id="TC011",
                description="Document submission workspace is gated when profile is incomplete",
                preconditions="Organization profile is incomplete (<100%).",
                steps=[
                    "Attempt to navigate to /document-submission.",
                    "Observe the workspace screen.",
                ],
                test_data="Completeness: < 100%",
                expected_result="A blocking gate card appears: 'Complete your profile first — Finish and save all required organization information before accessing document submission.' Progress bar and a 'Complete Profile' button are displayed.",
                pass_fail_criteria="Pass: Incomplete profile gate blocks document submission.\nFail: Incomplete organization can submit compliance documents.",
            ),
            TestCase(
                id="TC012",
                description="Completing profile unblocks document submission workspace",
                preconditions="Organization finishes all required profile fields to 100%.",
                steps=[
                    "Complete all required fields on /organization-profile and save.",
                    "Navigate to /document-submission.",
                    "Observe the workspace.",
                ],
                test_data="Completeness: 100%",
                expected_result="The document submission workspace unlocks, displaying the full list of required compliance document upload cards.",
                pass_fail_criteria="Pass: 100% complete profile unblocks document submissions.\nFail: Workspace remains gated after completing profile.",
            ),
            TestCase(
                id="TC013",
                description="Preview Public Profile modal opens and renders organization card",
                preconditions="User is on /organization-profile.",
                steps=[
                    "Click the 'Preview Public Profile' button.",
                    "Observe the modal dialog that appears.",
                ],
                test_data="N/A",
                expected_result="A modal dialog opens displaying the public profile card: Organization Avatar, Full Name, URN, District, Barangay, Accreditation Status badge, Official Contact, Head of Organization, and Centers of Youth Participation summary.",
                pass_fail_criteria="Pass: Public profile modal renders accurately.\nFail: Modal fails to open or profile card data is blank.",
            ),
            TestCase(
                id="TC014",
                description="Close Preview Public Profile modal returns to profile workspace",
                preconditions="Public profile preview modal is open.",
                steps=[
                    "Click the 'Close' button or 'X' icon.",
                    "Observe the profile workspace.",
                ],
                test_data="N/A",
                expected_result="The modal closes smoothly and the user returns to the editable organization profile view.",
                pass_fail_criteria="Pass: Modal closes properly.\nFail: Modal cannot be dismissed.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Admin YORP Registry Master Table & Multi-Filtering
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Admin YORP Registry Master Table & Filtering",
        test_cases=[
            TestCase(
                id="TC015",
                description="Admin accesses YORP Registry table",
                preconditions="Administrator is authenticated on desktop viewport (>=1024px).",
                steps=[
                    "Navigate to /admin/yorp-registry via sidebar.",
                    "Observe the table columns and filter toolbar.",
                ],
                test_data="N/A",
                expected_result="The YORP Registry page loads with title 'YORP Registry', summary counter metrics, search bar, district filter, barangay filter, classification filter, status filter, and columns: URN, Organization Name, District, Barangay, Classification, Status, Actions.",
                pass_fail_criteria="Pass: Registry table loads with all columns and filters.\nFail: Registry fails to load or columns are missing.",
            ),
            TestCase(
                id="TC016",
                description="Search YORP Registry by organization name",
                preconditions="Multiple organizations exist in the registry.",
                steps=[
                    "Type an existing organization name (e.g. 'Kapitolyo') into the search input.",
                    "Observe the filtered table rows.",
                ],
                test_data="Search: 'Kapitolyo'",
                expected_result="The table updates in real time to show only organizations matching 'Kapitolyo'.",
                pass_fail_criteria="Pass: Matching organizations are returned.\nFail: Search does not filter rows or shows unrelated organizations.",
            ),
            TestCase(
                id="TC017",
                description="Search YORP Registry by URN",
                preconditions="Organizations with distinct URNs exist.",
                steps=[
                    "Type a specific URN (e.g. '01-26-001') into the search input.",
                    "Observe the table results.",
                ],
                test_data="Search: '01-26-001'",
                expected_result="The table filters to display exactly the organization possessing that URN.",
                pass_fail_criteria="Pass: Exact URN match is displayed.\nFail: Search by URN fails.",
            ),
            TestCase(
                id="TC018",
                description="Filter YORP Registry by District (District I vs District II)",
                preconditions="Organizations from both districts exist in registry.",
                steps=[
                    "Select 'District I' from District filter dropdown.",
                    "Verify all displayed rows belong to District I.",
                    "Select 'District II' from District filter dropdown.",
                    "Verify all displayed rows belong to District II.",
                ],
                test_data="Filter: District I / District II",
                expected_result="The table isolates organizations belonging strictly to the chosen district.",
                pass_fail_criteria="Pass: District filtering works accurately.\nFail: Cross-district organizations appear in filtered results.",
            ),
            TestCase(
                id="TC019",
                description="Filter YORP Registry by Barangay",
                preconditions="District is selected.",
                steps=[
                    "Select District I.",
                    "Select Barangay 'Bagong Ilog' from Barangay filter dropdown.",
                    "Observe the filtered rows.",
                ],
                test_data="District: District I\nBarangay: Bagong Ilog",
                expected_result="The table displays only organizations situated in Barangay Bagong Ilog.",
                pass_fail_criteria="Pass: Barangay filtering accurately isolates records.\nFail: Wrong barangay records appear.",
            ),
            TestCase(
                id="TC020",
                description="Filter YORP Registry by Classification",
                preconditions="Organizations with various classifications exist.",
                steps=[
                    "Select 'School-Based Youth Organization' from Classification filter.",
                    "Observe the filtered table rows.",
                ],
                test_data="Filter: School-Based Youth Organization",
                expected_result="Only school-based youth organizations are shown.",
                pass_fail_criteria="Pass: Classification filter functions correctly.\nFail: Wrong classifications appear in results.",
            ),
            TestCase(
                id="TC021",
                description="Filter YORP Registry by Accreditation Status",
                preconditions="Organizations with statuses Active, Expiring Soon, Expired, and Pending exist.",
                steps=[
                    "Select 'Active' status filter -> verify all rows show green 'Active' badge.",
                    "Select 'Expiring Soon' status filter -> verify rows show yellow 'Expiring Soon' badge.",
                    "Select 'Expired' status filter -> verify rows show red/gray 'Expired' badge.",
                ],
                test_data="Filter: Active / Expiring Soon / Expired",
                expected_result="The table accurately filters records according to their accreditation lifecycle state.",
                pass_fail_criteria="Pass: Status filter isolates matching accreditation statuses.\nFail: Status filter does not work or displays wrong statuses.",
            ),
            TestCase(
                id="TC022",
                description="Combined multi-criteria search and filter in Registry",
                preconditions="Registry has diverse organizations.",
                steps=[
                    "Enter Search query 'Youth'.",
                    "Select District 'District I'.",
                    "Select Status 'Active'.",
                    "Observe the filtered records.",
                ],
                test_data="Search: 'Youth' + District I + Active",
                expected_result="Only active organizations situated in District I matching the keyword 'Youth' are displayed.",
                pass_fail_criteria="Pass: Multi-criteria filter applies logical intersection correctly.\nFail: Filter logic fails or causes crash.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Admin Detail Drawer, Deletion Protection & Export System
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Admin Detail Drawer, Deletion Protection & Export System",
        test_cases=[
            TestCase(
                id="TC023",
                description="Open organization detail drawer in YORP Registry",
                preconditions="Administrator is on /admin/yorp-registry.",
                steps=[
                    "Click on an organization row (or click 'View Profile' in row actions).",
                    "Observe the side drawer (YorpRegistryDetailDrawer) that slides open.",
                ],
                test_data="N/A",
                expected_result="The detail drawer slides open displaying organization overview: Full Name, URN, District, Barangay, Category, Accreditation badge, Head of Organization information, Adviser information, and Centers of Youth Participation details.",
                pass_fail_criteria="Pass: Detail drawer opens with complete profile information.\nFail: Drawer does not open or information is missing.",
            ),
            TestCase(
                id="TC024",
                description="View organization submitted compliance documents in drawer",
                preconditions="Organization detail drawer is open.",
                steps=[
                    "Navigate to the 'Compliance Documents' tab/section inside the drawer.",
                    "Observe the list of uploaded registration/renewal documents.",
                    "Click the preview icon for an uploaded PDF.",
                ],
                test_data="N/A",
                expected_result="The drawer displays all uploaded compliance documents with status badges. Clicking preview opens the inline document preview modal.",
                pass_fail_criteria="Pass: Documents list and preview function within drawer.\nFail: Documents missing or preview non-functional.",
            ),
            TestCase(
                id="TC025",
                description="View organization accreditation history in drawer",
                preconditions="Organization has an established accreditation history.",
                steps=[
                    "Inspect the 'Accreditation & Terms' section inside the detail drawer.",
                    "Observe the displayed term records (Term Number, Start Date, Expiry Date, Certificate URN, Approving Officer).",
                ],
                test_data="N/A",
                expected_result="The drawer lists the organization's accreditation history including active certificate URN and prior terms.",
                pass_fail_criteria="Pass: Accreditation history is displayed.\nFail: Term information is missing or corrupted.",
            ),
            TestCase(
                id="TC026",
                description="Export YORP Master Registry with authoritative 7-column layout across PDF, XLSX, and CSV",
                preconditions="Administrator is on /admin/yorp-registry.",
                steps=[
                    "Click the 'Export Registry' button to launch the Admin Export Dialog.",
                    "Select format (PDF, Excel / XLSX, CSV).",
                    "Generate export and inspect the column headers and data rows.",
                ],
                test_data="Export formats: PDF, XLSX, CSV.",
                expected_result="The generated file contains EXACTLY the 7 official columns in order: 1. No. (sequential row index 1, 2, 3...), 2. Name of the Organization, 3. Major Classification, 4. Address, 5. URN, 6. Date of Registration, 7. Date of Expiration. Obsolete columns (Sub-classification, Advocacy Themes, District, Barangay, Status, Contact Numbers, Emails) are completely excluded across all three formats.",
                pass_fail_criteria="Pass: Export matches the exact 7-column structure across PDF, XLSX, and CSV.\nFail: Obsolete columns are included or column structure is mismatched.",
            ),
            TestCase(
                id="TC027",
                description="Organization deletion protection blocks deletion when active budget/liquidation records exist",
                preconditions="Organization has active submitted budget requests or liquidation reports.",
                steps=[
                    "Attempt to delete the organization record via admin actions menu.",
                    "Observe the danger confirmation dialog and warning message.",
                ],
                test_data="Target: Organization with active budget/liquidation links",
                expected_result="The system blocks the deletion and displays a warning: 'Cannot delete organization: Active budget requests or liquidation records are linked to this organization. Resolve or archive dependent transactions first.'",
                pass_fail_criteria="Pass: System protects linked historical records and blocks deletion.\nFail: Organization with active records is deleted or unhandled error occurs.",
            ),
            TestCase(
                id="TC028",
                description="Close organization detail drawer",
                preconditions="Organization detail drawer is open.",
                steps=[
                    "Click the drawer close button (X) or backdrop overlay.",
                    "Observe the screen.",
                ],
                test_data="N/A",
                expected_result="The drawer closes smoothly and focus returns to the YORP Registry table.",
                pass_fail_criteria="Pass: Drawer dismisses cleanly.\nFail: Drawer remains stuck open.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Advanced YORP Reporting & Export Configuration
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Advanced YORP Reporting & Export Configuration",
        test_cases=[
            TestCase(
                id="TC029",
                description="PDF Export Paper Size and Orientation options configuration",
                preconditions="Admin opens Export Dialog on YORP Registry or Reports workspace.",
                steps=[
                    "Select PDF export format in the dialog.",
                    "Inspect Paper Size dropdown: A4, Short Bond / Letter (8.5x11 in), Long Bond / Folio (8.5x13 in), Legal (8.5x14 in), A3 (297x420 mm), Tabloid (11x17 in).",
                    "Inspect Orientation toggle: Portrait, Landscape.",
                    "Select Long Bond and Landscape, then generate PDF.",
                ],
                test_data="Paper size: Long Bond; Orientation: Landscape.",
                expected_result="Dialog defaults to A4 Portrait. Long Bond (8.5x13 in) is distinct from Legal (8.5x14 in). Generated PDF adapts properly to the selected custom dimensions and orientation without table clipping.",
                pass_fail_criteria="Pass: Paper size and orientation options generate compliant PDF layout.\nFail: Paper sizes fail to apply or table overflows page.",
            ),
            TestCase(
                id="TC030",
                description="Generate YORP Quarterly Summary Report (Official naming, Metric A/B/C, no Section 35 title)",
                preconditions="Admin navigates to Admin → YORP Registry and clicks 'Reports' to open the report generation dialog.",
                steps=[
                    "In Admin Portal, navigate to YORP Registry.",
                    "Click 'Reports' button in top actions to open the report dialog.",
                    "Select Report Type: 'Quarterly Summary'.",
                    "Select Target Year (e.g. 2026) and Quarter (e.g. Q3).",
                    "Click 'Generate Report' (PDF/XLSX).",
                    "Inspect generated document title, metrics, and footer.",
                ],
                test_data="Year: 2026, Quarter: Q3.",
                expected_result="Report dialog opens allowing selection between Quarterly Summary and Disaggregated Report. The generated report is officially titled 'YORP QUARTERLY SUMMARY REPORT' (fulfilling statutory reporting without obsolete 'Section 35' UI tab branding). Displays authoritative Metric A (quarter-end verified population based on active terms), Metric B (initial registration applications from first submitted_at), and Metric C (term 1 approvals in quarter). No misleading 'Approval Rate' is shown.",
                pass_fail_criteria="Pass: Quarterly summary generates with clean official title, Metric A/B/C, and no Section 35 branding.\nFail: Title contains 'Section 35', Approval Rate is shown, or metrics are incorrect.",
            ),
            TestCase(
                id="TC031",
                description="Generate YORP Disaggregated Report (Breakdowns, Centers of Youth Participation, PCYDO template & watermark)",
                preconditions="Admin navigates to Admin → YORP Registry → Reports dialog.",
                steps=[
                    "In Admin Portal, open YORP Registry → Reports.",
                    "Select Report Type: 'Disaggregated Report'.",
                    "Select Year and Quarter, then generate PDF export.",
                    "Inspect classification breakdown, organizational level breakdown, Centers of Youth Participation non-additive multi-tagging, geography breakdown, official PCYDO template headers, and watermark.",
                ],
                test_data="Disaggregated Report for 2026 Q3.",
                expected_result="Disaggregated report renders official PCYDO header template with visible watermark. Multi-tagged Centers of Youth Participation are handled in a non-additive manner. Breakdown tables display clean classification and geographic distributions.",
                pass_fail_criteria="Pass: Disaggregated report renders official template, watermark, and non-additive participation breakdowns.\nFail: Report fails to generate or double-counts multi-tagged organizations.",
            ),
            TestCase(
                id="TC032",
                description="Immediate 100% profile completeness reflection upon navigating to Dashboard after Google Onboarding",
                preconditions="Organization user completes initial onboarding via Google Onboarding flow.",
                steps=[
                    "Complete Google onboarding save.",
                    "Observe immediate redirect to /dashboard and /organization-profile.",
                    "Check profile completeness score indicator.",
                ],
                test_data="Newly onboarded Google user.",
                expected_result="Profile completeness immediately displays 100% without lag, caching delay, or persistent 'Incomplete Profile' warning callout.",
                pass_fail_criteria="Pass: Profile reflects 100% completeness immediately post-onboarding.\nFail: Profile shows stale <100% or warning banner.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Responsive Organization Profile & Admin Desktop-Gated Registry
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Responsive Organization Profile & Admin Desktop-Gated Registry",
        test_cases=[
            TestCase(
                id="TC033",
                description="Verify Organization Profile and Admin YORP Registry on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /organization-profile as logged-in organization user.",
                    "Verify 2-column form grid, leadership roster, and preview public profile button.",
                    "Log in as Admin and navigate to /admin/yorp-registry.",
                    "Verify wide data table with sorting columns (URN, Name, District, Barangay, Classification, Status), filter pills, and slide-over profile drawer.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop profile layout presents well-spaced two-column fields without visual crowding. Admin YORP Registry displays full multi-column data table and 500px slide-over drawer with smooth transition.",
                pass_fail_criteria="Pass: Desktop layout renders all columns and controls with optimal spacing.\nFail: Columns overlap, text wraps awkwardly, or drawer covers entire screen.",
            ),
            TestCase(
                id="TC034",
                description="Verify Organization Profile adapts to tablet viewport (768x1024) while Admin Registry enforces desktop gate",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /organization-profile as organization user on tablet viewport.",
                    "Verify form adjusts to single/adaptive column with touch-friendly save buttons.",
                    "Navigate to /admin/yorp-registry as Admin on tablet viewport.",
                    "Observe the Admin Desktop Warning Screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="User profile forms adapt gracefully to tablet width with accessible touch controls. Admin YORP Registry is desktop-gated and displays the informational warning screen on viewport < 1024px.",
                pass_fail_criteria="Pass: User profile functions on tablet while admin registry enforces desktop gate.\nFail: User profile breaks or admin registry exposes broken table on tablet.",
            ),
            TestCase(
                id="TC035",
                description="Verify Organization Profile on Phone Viewport (390x844) and Admin Warning on mobile",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /organization-profile on mobile phone viewport.",
                    "Verify single-column vertical layout, touch-friendly dropdowns for District/Barangay, and full-width 'Save Changes' button.",
                    "Navigate to /admin/yorp-registry on mobile phone viewport.",
                    "Verify Admin Desktop Warning Screen is displayed without misleading action buttons.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="User profile forms stack vertically with zero horizontal overflow. Admin registry route renders the information-only warning screen blocking mobile administrative access.",
                pass_fail_criteria="Pass: Mobile phone profile is fully usable and admin registry is safely gated.\nFail: Profile overflows phone screen or admin registry is accessible on mobile.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_04_groups()
    output_filename = "04_YTRACE_Organization_Profile_YORP_Registry_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="04",
        section_title="Organization Profile & YORP Registry Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

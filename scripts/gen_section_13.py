"""
Generator for Section 13: Forms & Templates Management (Archive / Restore) Black-Box Test Cases.
Document: 13_YTRACE_Forms_Templates_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_13_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Template Upload, Metadata, File Validation & Category Creation
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Template Upload, Metadata, File Validation & Category Creation",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify opening of 'Upload New Template' dialog in Admin Portal",
                preconditions="Administrator navigates to Admin Portal -> Forms & Templates.",
                steps=[
                    "Click '+ Upload Template' action button.",
                    "Inspect the opened dialog.",
                    "Verify input fields: Template Name, Description, Scope, Categories, Sort Order, and File Upload dropzone.",
                ],
                test_data="N/A",
                expected_result="Dialog opens cleanly with all metadata inputs and file dropzone initialized.",
                pass_fail_criteria="Pass: Dialog opens with all required template authoring fields.\nFail: Dialog fails to open or is missing fields.",
            ),
            TestCase(
                id="TC002",
                description="Verify required field validation on empty template submission",
                preconditions="Upload template dialog is open.",
                steps=[
                    "Leave Template Name blank.",
                    "Do not attach a file.",
                    "Click 'Save Template'.",
                ],
                test_data="Blank form fields.",
                expected_result="Submission is blocked with validation alerts highlighting required fields: Template Name and Template File.",
                pass_fail_criteria="Pass: Required fields are enforced.\nFail: Form submits without name or file.",
            ),
            TestCase(
                id="TC003",
                description="Verify upload of valid PDF template file",
                preconditions="Upload dialog is open.",
                steps=[
                    "Enter Name: 'YORP Directory of Officers Form'.",
                    "Enter Description: 'Official template for youth organization officer directories.'",
                    "Select Category: 'YORP'.",
                    "Upload valid PDF 'yorp_directory_template.pdf' (size: 1.5 MB).",
                    "Click 'Save Template'.",
                ],
                test_data="File: 'yorp_directory_template.pdf'.",
                expected_result="Template uploads successfully. Modal closes with success toast. The new template appears in the Active table with green 'Active' badge and category tag 'YORP'.",
                pass_fail_criteria="Pass: PDF template uploads cleanly and appears in the active table.\nFail: Upload fails or errors out.",
            ),
            TestCase(
                id="TC004",
                description="Verify upload of valid Excel spreadsheet (.xlsx) template file",
                preconditions="Upload dialog is open.",
                steps=[
                    "Enter Name: 'Itemized Project Budget Worksheet'.",
                    "Select Category: 'Financial Grant'.",
                    "Upload valid Excel file 'budget_worksheet.xlsx' (size: 850 KB).",
                    "Click 'Save Template'.",
                ],
                test_data="File: 'budget_worksheet.xlsx'.",
                expected_result="Excel template uploads successfully. Table row reflects file icon for spreadsheet and size 850 KB.",
                pass_fail_criteria="Pass: Excel template uploads and displays file type accurately.\nFail: Excel file is rejected.",
            ),
            TestCase(
                id="TC005",
                description="Verify rejection of prohibited executable or script file types",
                preconditions="Upload dialog is open.",
                steps=[
                    "Attempt to upload an executable or script file ('setup.exe', 'script.js').",
                    "Observe client validation alert.",
                ],
                test_data="File: 'setup.exe'.",
                expected_result="Upload is blocked immediately: 'Prohibited file type. Allowed formats: PDF, DOCX, XLSX.'",
                pass_fail_criteria="Pass: Prohibited executable file types are blocked.\nFail: Dangerous file types upload without error.",
            ),
            TestCase(
                id="TC006",
                description="Verify template file size limit enforcement (max 25MB)",
                preconditions="Upload dialog is open.",
                steps=[
                    "Attempt to upload an oversized document (size: 28.4 MB).",
                    "Observe validation response.",
                ],
                test_data="File size: 28.4 MB.",
                expected_result="Upload is blocked with error: 'File size must not exceed 25MB.'",
                pass_fail_criteria="Pass: Files exceeding 25MB are rejected.\nFail: Oversized file is uploaded.",
            ),
            TestCase(
                id="TC007",
                description="Verify creating a new Custom Category in Category Management modal",
                preconditions="Admin is in Forms & Templates module.",
                steps=[
                    "Click 'Manage Categories' button.",
                    "Click '+ Add Category'.",
                    "Enter Category Name: 'Youth Volunteerism'.",
                    "Enter Description: 'Templates and forms for community volunteer initiatives.'",
                    "Click 'Save Category'.",
                ],
                test_data="New category: 'Youth Volunteerism'.",
                expected_result="Category is created successfully. Toast confirms 'Category created.' The new category appears in the category filter dropdown and template creation modal.",
                pass_fail_criteria="Pass: Custom category is created and available across the module.\nFail: Category creation fails.",
            ),
            TestCase(
                id="TC008",
                description="Verify Scope selection (Public vs Organization Authenticated Only)",
                preconditions="Template upload dialog is open.",
                steps=[
                    "Select Scope: 'Public' for Template A.",
                    "Save Template A.",
                    "Create Template B with Scope: 'Organization Portal Only'.",
                    "Save Template B.",
                ],
                test_data="Scope options: Public, Organization Only.",
                expected_result="Template A is tagged with 'Public' scope badge; Template B is tagged with 'Organization Only' scope badge.",
                pass_fail_criteria="Pass: Scope settings are saved and tagged accurately.\nFail: Scope settings fail to apply.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Archive, Restore & Lifecycle State Preservation
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Archive, Restore & Lifecycle State Preservation",
        test_cases=[
            TestCase(
                id="TC009",
                description="CRITICAL REGRESSION: Admin archives an active template via row action",
                preconditions="Template 'YORP Directory of Officers Form' is in Active status.",
                steps=[
                    "In Admin Portal -> Forms & Templates, locate 'YORP Directory of Officers Form' in the Active table.",
                    "Click 'Archive' (Archive box icon) action button on the row.",
                    "Observe confirmation modal.",
                    "Click 'Confirm Archive'.",
                ],
                test_data="Target template: 'YORP Directory of Officers Form'.",
                expected_result="Confirmation dialog displays: 'Archive this template? It will be hidden from public and organization catalogs but preserved in your archives.' Confirming updates status to Archived. Row immediately leaves Active table. Toast confirms 'Template archived successfully.'",
                pass_fail_criteria="Pass: Template transitions to Archived status and leaves Active table.\nFail: Template remains active or error occurs.",
            ),
            TestCase(
                id="TC010",
                description="CRITICAL REGRESSION: Archived filter displays STRICTLY inactive templates (isActive = false)",
                preconditions="TC009 has executed, archiving the template. Active templates also exist.",
                steps=[
                    "Click 'Archived' status tab in the table header.",
                    "Inspect all rows rendered in the table.",
                    "Verify that ONLY templates with isActive = false (status 'Archived') are displayed.",
                    "Verify that zero active templates (isActive = true) appear in this tab.",
                ],
                test_data="Archived tab view.",
                expected_result="The Archived tab strictly isolates inactive templates (`isActive = false`). All active templates are completely excluded. The archived template displays an 'Archived' badge and a 'Restore' action button.",
                pass_fail_criteria="Pass: Archived tab strictly displays inactive records only.\nFail: Active records leak into Archived tab or archived items are missing.",
            ),
            TestCase(
                id="TC011",
                description="Verify 'All Status' tab displays both Active and Archived templates simultaneously",
                preconditions="System contains 2 Active templates and 1 Archived template.",
                steps=[
                    "Click 'All Status' tab.",
                    "Inspect table rows and status badges.",
                ],
                test_data="'All Status' tab.",
                expected_result="All 3 templates are listed. Active templates show green 'Active' badges with 'Archive' buttons; archived template shows 'Archived' badge with 'Restore' button.",
                pass_fail_criteria="Pass: 'All Status' tab aggregates active and archived items cleanly.\nFail: Tab shows only active or only archived.",
            ),
            TestCase(
                id="TC012",
                description="CRITICAL REGRESSION: Storage preservation: Archived template file remains intact and downloadable",
                preconditions="Template is in 'Archived' status.",
                steps=[
                    "In Archived tab, click 'Download' button on the archived template row.",
                    "Click 'Preview' button on the row.",
                ],
                test_data="Archived template file.",
                expected_result="The original PDF file downloads successfully with intact contents. Preview modal renders the document. Archiving did NOT delete or corrupt the storage file.",
                pass_fail_criteria="Pass: File remains fully accessible in storage while archived.\nFail: Download or preview fails with 404 or missing file.",
            ),
            TestCase(
                id="TC013",
                description="CRITICAL REGRESSION: Archived state persists across browser page refresh",
                preconditions="Template is in 'Archived' status.",
                steps=[
                    "Execute browser hard reload (Ctrl + F5).",
                    "Navigate back to Forms & Templates.",
                    "Inspect 'Active' and 'Archived' tabs.",
                ],
                test_data="Browser refresh.",
                expected_result="Template remains absent from 'Active' tab and continues to display in 'Archived' tab with 'Archived' status badge.",
                pass_fail_criteria="Pass: Archived state persists through page reloads.\nFail: Template reverts to Active upon reload.",
            ),
            TestCase(
                id="TC014",
                description="CRITICAL REGRESSION: Restore Archived Template transitions it back to Active status",
                preconditions="Template is currently in 'Archived' tab.",
                steps=[
                    "Click 'Restore' action button on 'YORP Directory of Officers Form'.",
                    "Confirm restore in dialog.",
                    "Observe toast notification.",
                    "Check 'Archived' tab.",
                ],
                test_data="Target template restore action.",
                expected_result="Toast confirms 'File restored: YORP Directory of Officers Form is active again.' Template immediately disappears from 'Archived' tab.",
                pass_fail_criteria="Pass: Template is restored and removed from Archived tab.\nFail: Template remains stuck in Archived tab.",
            ),
            TestCase(
                id="TC015",
                description="CRITICAL REGRESSION: Restored template reappears in 'Active' tab with green Active badge",
                preconditions="TC014 has executed, restoring the template.",
                steps=[
                    "Click 'Active' tab in Forms & Templates table.",
                    "Locate 'YORP Directory of Officers Form'.",
                    "Inspect status badge and action buttons.",
                ],
                test_data="Active tab view.",
                expected_result="Template is present in Active tab. Status pill shows green 'Active'. Action button reflects 'Archive' once again.",
                pass_fail_criteria="Pass: Restored template is fully active in Active tab.\nFail: Template missing from Active tab.",
            ),
            TestCase(
                id="TC016",
                description="CRITICAL REGRESSION: No duplicate records created through archive/restore cycle",
                preconditions="A template has undergone Archive and Restore.",
                steps=[
                    "Click 'All Status' tab.",
                    "Count occurrences of 'YORP Directory of Officers Form'.",
                ],
                test_data="Template name search.",
                expected_result="EXACTLY ONE record exists for the template. Archiving and restoring toggles status flag without duplicating rows.",
                pass_fail_criteria="Pass: Exactly one record exists with zero duplication.\nFail: Duplicate template records appear.",
            ),
            TestCase(
                id="TC017",
                description="Verify category assignments remain intact through archive and restore",
                preconditions="Template assigned to 'YORP' category was archived and restored.",
                steps=[
                    "Inspect category badges on restored template row.",
                    "Filter by category 'YORP'.",
                ],
                test_data="Category: 'YORP'.",
                expected_result="Category tag remains 'YORP'. Template correctly matches the 'YORP' category filter.",
                pass_fail_criteria="Pass: Category metadata is preserved through archive/restore.\nFail: Category is cleared or lost.",
            ),
            TestCase(
                id="TC018",
                description="Verify Audit Log records template archive and restore actions",
                preconditions="Admin archived and restored a template.",
                steps=[
                    "Navigate to Admin Portal -> Activity Logs.",
                    "Inspect recent log entries.",
                ],
                test_data="Template audit logs.",
                expected_result="Audit log contains entries: 'template.archived' and 'template.restored' with admin user and timestamp.",
                pass_fail_criteria="Pass: Archive and restore events are logged in audit trail.\nFail: Actions not logged.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Public Catalog & User Portal Active-Only Visibility Isolation
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Public Catalog & User Portal Active-Only Visibility Isolation",
        test_cases=[
            TestCase(
                id="TC019",
                description="CRITICAL REGRESSION: User Portal (/templates) strictly hides archived templates",
                preconditions="Template 'Itemized Project Budget Worksheet' is Archived by administrator.",
                steps=[
                    "Log in as Organization user and navigate to Forms & Templates (/templates).",
                    "Search for 'Itemized Project Budget Worksheet'.",
                    "Inspect all category tabs.",
                ],
                test_data="Archived template name.",
                expected_result="The archived template DOES NOT appear in the User Portal catalog. Search returns no results.",
                pass_fail_criteria="Pass: Archived template is completely hidden from User Portal.\nFail: Archived template is visible to organization users.",
            ),
            TestCase(
                id="TC020",
                description="CRITICAL REGRESSION: Public Catalog (/public-templates) strictly hides archived templates",
                preconditions="Template 'Itemized Project Budget Worksheet' is Archived.",
                steps=[
                    "In an Incognito window without login, navigate to http://localhost:5173/public-templates.",
                    "Search for 'Itemized Project Budget Worksheet'.",
                ],
                test_data="Public templates catalog URL.",
                expected_result="The archived template DOES NOT appear in the Public Catalog. Only active templates are displayed.",
                pass_fail_criteria="Pass: Archived template is hidden from public catalog.\nFail: Public can view archived template.",
            ),
            TestCase(
                id="TC021",
                description="CRITICAL REGRESSION: Restoring template immediately restores visibility in User and Public catalogs",
                preconditions="Admin restores 'Itemized Project Budget Worksheet' to Active status.",
                steps=[
                    "In Public Catalog (/public-templates), refresh page.",
                    "In User Portal (/templates), refresh page.",
                    "Search for template.",
                ],
                test_data="Restored template.",
                expected_result="Template immediately reappears in both Public Catalog and User Portal with 'Download' and 'Preview' actions active.",
                pass_fail_criteria="Pass: Restored template becomes immediately visible in public/user portals.\nFail: Template remains hidden.",
            ),
            TestCase(
                id="TC022",
                description="Verify Public Catalog search by template name and keyword",
                preconditions="Multiple active templates exist in public catalog.",
                steps=[
                    "Navigate to /public-templates.",
                    "Type 'Proposal' in the search bar.",
                    "Verify filtered template cards.",
                ],
                test_data="Search: 'Proposal'.",
                expected_result="Only templates with 'Proposal' in their name or description are shown.",
                pass_fail_criteria="Pass: Search filters public catalog accurately.\nFail: Search fails or shows non-matching items.",
            ),
            TestCase(
                id="TC023",
                description="Verify Public Catalog category pill filtering",
                preconditions="Public catalog has templates in YORP, YPOP, and Financial categories.",
                steps=[
                    "Click 'YORP' category pill.",
                    "Click 'Financial' category pill.",
                    "Click 'All Templates' pill.",
                ],
                test_data="Category filter pills.",
                expected_result="Catalog filters instantly to display templates belonging to the selected category. 'All Templates' restores full catalog.",
                pass_fail_criteria="Pass: Category pills filter catalog accurately.\nFail: Filtering fails or displays wrong category.",
            ),
            TestCase(
                id="TC024",
                description="Verify Public Catalog template download action",
                preconditions="Public user views an active template card.",
                steps=[
                    "Click 'Download Template' button on card.",
                    "Verify file download in browser.",
                ],
                test_data="Active template download.",
                expected_result="Browser downloads the file with its original filename and extension.",
                pass_fail_criteria="Pass: Public user can download template file.\nFail: Download fails or throws error.",
            ),
            TestCase(
                id="TC025",
                description="Verify Public Catalog template preview modal",
                preconditions="Public user views active PDF template.",
                steps=[
                    "Click 'Preview' button on template card.",
                    "Verify modal renders document pages inline.",
                    "Close preview.",
                ],
                test_data="PDF template preview.",
                expected_result="Modal opens rendering document inline without requiring page reload. Close button exits preview.",
                pass_fail_criteria="Pass: Preview renders accurately.\nFail: Preview crashes or fails to open.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Permanent Deletion, Submission Safety & Search/Export
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Permanent Deletion, Submission Safety & Search/Export",
        test_cases=[
            TestCase(
                id="TC026",
                description="CRITICAL SAFEGUARD: Category deletion protection prevents deletion of categories with assigned templates",
                preconditions="Category 'YORP' has 3 active templates assigned to it.",
                steps=[
                    "In Admin Portal -> Forms & Templates, open Category Management.",
                    "Locate 'YORP' category.",
                    "Attempt to click 'Delete Category'.",
                ],
                test_data="Category: 'YORP' (in use).",
                expected_result="Deletion is blocked. An alert or tooltip explains: 'Cannot delete category YORP because 3 templates are currently assigned to it. Reassign or delete the templates first.'",
                pass_fail_criteria="Pass: Category deletion protection prevents deletion of in-use categories.\nFail: Category is deleted, orphaning assigned templates.",
            ),
            TestCase(
                id="TC027",
                description="Verify deletion of unused Custom Category",
                preconditions="A custom category 'Old Archive 2024' exists with 0 templates assigned.",
                steps=[
                    "Locate 'Old Archive 2024' category in management dialog.",
                    "Click 'Delete Category'.",
                    "Confirm deletion.",
                ],
                test_data="Unused category: 'Old Archive 2024'.",
                expected_result="Category is deleted successfully. It is removed from the category filter dropdown.",
                pass_fail_criteria="Pass: Unused category is deleted cleanly upon confirmation.\nFail: Deletion fails.",
            ),
            TestCase(
                id="TC028",
                description="Permanent template deletion preserves historical user submissions and review evidence",
                preconditions="A template has been used previously by organizations for registration/renewal document submissions.",
                steps=[
                    "In Admin Portal → Forms & Templates, select a form/template that has existing historical submissions.",
                    "Click 'Permanent Delete' and confirm deletion in the safeguard modal.",
                    "Confirm the deleted template disappears immediately from Forms & Templates.",
                    "Navigate to Registration Compliance and open an affected historical submission.",
                    "Confirm the submitted evidence file still exists and can be viewed/downloaded.",
                    "Confirm existing review status and admin remarks remain intact.",
                ],
                test_data="Form/template with linked historical submission evidence.",
                expected_result="The template is removed cleanly from the active template catalog. Historical submitted files remain fully accessible for viewing and downloading in compliance review drawers, with all previous review statuses and remarks preserved intact.",
                pass_fail_criteria="Pass: Template is deleted while historical submissions, files, and review remarks remain accessible.\nFail: Deletion fails, or historical user submission evidence is lost.",
            ),
            TestCase(
                id="TC029",
                description="CRITICAL UI RESPONSIVENESS: Post-deletion immediate row removal and three-dot action stability",
                preconditions="Admin deletes a template row from the table.",
                steps=[
                    "Click 'Delete' on Row 2.",
                    "Confirm deletion.",
                    "Observe table immediately without refreshing page.",
                    "Click 'More Options' (Three dots) on Row 1 and Row 3.",
                ],
                test_data="Table row deletion.",
                expected_result="Row 2 disappears immediately from the table without requiring a full-page reload. The three-dot action dropdowns on remaining rows function normally with zero UI freeze or crash.",
                pass_fail_criteria="Pass: Row disappears instantly and other row menus continue functioning smoothly.\nFail: Page freeze, ghost row, or broken action menus.",
            ),
            TestCase(
                id="TC030",
                description="Verify editing template metadata (Name, Description, Sort Order)",
                preconditions="Template exists in Admin table.",
                steps=[
                    "Click 'Edit' (Pencil icon) on template row.",
                    "Update Name to 'YORP Directory of Officers — Revised 2026'.",
                    "Update Sort Order to 5.",
                    "Click 'Save Changes'.",
                ],
                test_data="Updated template metadata.",
                expected_result="Template details update in real time. New name and order reflect in the table immediately.",
                pass_fail_criteria="Pass: Metadata updates cleanly.\nFail: Edit fails or reverts.",
            ),
            TestCase(
                id="TC031",
                description="Verify file replacement in existing template",
                preconditions="Edit template dialog is open.",
                steps=[
                    "In file section, click 'Replace File'.",
                    "Select updated PDF 'yorp_directory_v2.pdf'.",
                    "Save changes.",
                ],
                test_data="Replacement file: 'yorp_directory_v2.pdf'.",
                expected_result="The template file is replaced with the new version. File size and upload timestamp update. The old file is superseded.",
                pass_fail_criteria="Pass: Template file is successfully replaced.\nFail: Replacement fails or retains old file.",
            ),
            TestCase(
                id="TC032",
                description="Verify Admin search and category filtering in Templates table",
                preconditions="Multiple templates exist across categories.",
                steps=[
                    "Type 'Financial' in search bar.",
                    "Select category filter 'Financial Grant'.",
                    "Reset search and filters.",
                ],
                test_data="Search and filter inputs.",
                expected_result="Table filters matching records dynamically. Resetting restores all templates.",
                pass_fail_criteria="Pass: Search and filters operate accurately.\nFail: Filtering fails or displays wrong items.",
            ),
            TestCase(
                id="TC033",
                description="Verify standardized Admin Export Dialog for Forms & Templates catalog (PDF, Excel, CSV with paper sizes & orientation)",
                preconditions="Admin is on Forms & Templates page.",
                steps=[
                    "Click 'Export Catalog' button in table toolbar.",
                    "Verify export modal opens with format options: PDF, Excel (.xlsx), CSV.",
                    "For PDF, verify paper size selector (A4, Short 8.5x11, Long 8.5x13, Legal, A3, Tabloid) and orientation toggle (Portrait, Landscape).",
                    "Confirm export generation.",
                ],
                test_data="Export modal options.",
                expected_result="Standardized export dialog opens cleanly. Generating export produces complete catalog report with template names, categories, scopes, filenames, sizes, and active status.",
                pass_fail_criteria="Pass: Standardized export dialog generates accurate PDF/Excel/CSV files.\nFail: Export errors out or generates empty file.",
            ),
            TestCase(
                id="TC034",
                description="Verify role-based access control: Non-admins cannot access admin template management",
                preconditions="Organization user attempts direct URL navigation to /admin/templates.",
                steps=[
                    "Enter URL /admin/templates in address bar while logged in as organization user.",
                ],
                test_data="Unauthorized URL access.",
                expected_result="Access is denied. User is redirected to organization portal with unauthorized error.",
                pass_fail_criteria="Pass: Admin template routes are protected by RBAC.\nFail: Non-admin can access admin template views.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive Forms & Templates Catalogs & Admin Desktop Gate
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive Forms & Templates Catalogs & Admin Desktop Gate",
        test_cases=[
            TestCase(
                id="TC035",
                description="Verify Forms & Templates Catalogs on Desktop Viewport (>= 1024px)",
                preconditions="Tester opens Desktop browser at >= 1024px resolution.",
                steps=[
                    "Navigate to /public-templates and User Portal /templates.",
                    "Verify 3-4 column responsive template card grid, category filter pill bar, and search bar.",
                    "Log in as Admin and navigate to /admin/templates.",
                    "Verify desktop data table, category pills, Active/Archived tab controls, and '+ Upload Template' modal.",
                ],
                test_data="Viewport: >= 1024px (Desktop Full HD).",
                expected_result="Template cards align cleanly in a balanced multi-column grid. Admin management workspace operates with full table controls and zero gating screens.",
                pass_fail_criteria="Pass: Desktop catalog and admin management display with generous margins and no truncated text.\nFail: Cards overlap or action buttons break layout.",
            ),
            TestCase(
                id="TC036",
                description="Verify Public & User Forms Catalogs on Tablet & Phone Viewports (< 1024px)",
                preconditions="Tester configures browser viewport to Tablet (768x1024) and Mobile Phone (390x844).",
                steps=[
                    "Navigate to /public-templates and /templates on mobile and tablet.",
                    "Test search input, horizontal category pill scrolling, and 'Download' buttons.",
                ],
                test_data="Viewports: 768x1024, 390x844.",
                expected_result="Public and User template catalogs adapt gracefully into 2-column or single-column mobile cards with tap-friendly download buttons and zero horizontal overflow.",
                pass_fail_criteria="Pass: Public/User catalogs are fully responsive on mobile and tablet.\nFail: Horizontal scroll breaks layout or download buttons fail.",
            ),
            TestCase(
                id="TC037",
                description="Verify Admin Desktop-Only Gate on /admin/templates on viewports < 1024px",
                preconditions="Tester opens /admin/templates on viewport width < 1024px (e.g. 768px tablet portrait or 390px mobile).",
                steps=[
                    "Navigate to /admin/templates on mobile/tablet viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport: < 1024px.",
                expected_result="Admin Desktop-Only Gate warning screen is displayed ('Desktop Experience Required'). The administrative template management table and category tools are safely gated.",
                pass_fail_criteria="Pass: Admin template view displays desktop-only warning gate on viewports < 1024px.\nFail: Cramped admin table renders without gating.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_13_groups()
    output_filename = "13_YTRACE_Forms_Templates_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="13",
        section_title="Forms & Templates Management (Archive / Restore) Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

"""
Generator for Section 02: Administrative Authentication & Role-Based Access Control Black-Box Test Cases.
Document: 02_YTRACE_Admin_Authentication_RBAC_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_02_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Admin Sign In & Credentials Validation
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Admin Sign In & Credentials Validation",
        test_cases=[
            TestCase(
                id="TC001",
                description="Sign in with valid administrator credentials",
                preconditions="Administrator account exists and is active. User is on the Admin Sign In page (/admin/signin or /signin in Admin mode).",
                steps=[
                    "Navigate to the Admin Sign In page.",
                    "Enter the registered admin username in the 'Username' field.",
                    "Enter the correct admin password in the 'Password' field.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: pcydo_lead_admin\nPassword: AdminPassword@2026",
                expected_result="The 'Sign In' button displays a loading spinner with text 'Signing in…'. The administrator is authenticated and redirected to the Admin Portal Overview (/admin). A toast notification appears: 'Signed In – Welcome, administrator.'",
                pass_fail_criteria="Pass: Administrator is redirected to /admin and welcome toast is displayed.\nFail: Administrator remains on sign in or receives an unhandled error.",
            ),
            TestCase(
                id="TC002",
                description="Sign in with invalid administrator password",
                preconditions="Administrator account exists. User is on Admin Sign In page.",
                steps=[
                    "Enter a valid admin username.",
                    "Enter an incorrect password.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: pcydo_lead_admin\nPassword: WrongPassword!999",
                expected_result="An inline error message is displayed: 'Invalid admin credentials.' The user remains on the Admin Sign In page.",
                pass_fail_criteria="Pass: Error message 'Invalid admin credentials.' is displayed.\nFail: Access is granted or no error feedback appears.",
            ),
            TestCase(
                id="TC003",
                description="Sign in with non-existent administrator username",
                preconditions="No administrator account exists for the entered username.",
                steps=[
                    "Enter a non-existent username.",
                    "Enter any password.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: non_existent_admin_99\nPassword: AdminPassword@2026",
                expected_result="An inline error message is displayed: 'Invalid admin credentials.' The user remains on the Admin Sign In page.",
                pass_fail_criteria="Pass: Non-existent admin credentials rejected with error message.\nFail: Unexpected error or blank page.",
            ),
            TestCase(
                id="TC004",
                description="Sign in with empty username field",
                preconditions="User is on Admin Sign In page.",
                steps=[
                    "Leave the 'Username' field empty.",
                    "Enter a password.",
                    "Observe the 'Sign In' button state.",
                ],
                test_data="Username: (empty)\nPassword: AdminPassword@2026",
                expected_result="The 'Sign In' button remains disabled because the username field is empty. Submission is blocked.",
                pass_fail_criteria="Pass: Sign In button is disabled and form cannot submit.\nFail: Button is enabled or form submits without username.",
            ),
            TestCase(
                id="TC005",
                description="Sign in with empty password field",
                preconditions="User is on Admin Sign In page.",
                steps=[
                    "Enter a valid admin username.",
                    "Leave the 'Password' field empty.",
                    "Observe the 'Sign In' button state.",
                ],
                test_data="Username: pcydo_lead_admin\nPassword: (empty)",
                expected_result="The 'Sign In' button remains disabled because the password field is empty. Submission is blocked.",
                pass_fail_criteria="Pass: Sign In button is disabled and form cannot submit.\nFail: Form submits without a password.",
            ),
            TestCase(
                id="TC006",
                description="Sign in with both fields empty",
                preconditions="User is on Admin Sign In page.",
                steps=[
                    "Leave both username and password fields empty.",
                    "Observe the 'Sign In' button state.",
                ],
                test_data="Username: (empty)\nPassword: (empty)",
                expected_result="The 'Sign In' button is disabled.",
                pass_fail_criteria="Pass: Button is disabled.\nFail: Button is clickable.",
            ),
            TestCase(
                id="TC007",
                description="Sign in with demo administrator credentials (fallback)",
                preconditions="System is configured with seeded demo administrator credentials.",
                steps=[
                    "Navigate to Admin Sign In.",
                    "Enter the seeded demo admin username (e.g. 'lydoadmin').",
                    "Enter the seeded demo admin password.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: lydoadmin\nPassword: (seeded demo password)",
                expected_result="The system authenticates the demo administrator session and redirects to /admin.",
                pass_fail_criteria="Pass: Demo admin session is established and portal loads.\nFail: Demo credentials fail to authenticate.",
            ),
            TestCase(
                id="TC008",
                description="Toggle password visibility on Admin Sign In",
                preconditions="User is on Admin Sign In page.",
                steps=[
                    "Enter a password in the password field.",
                    "Click the eye icon ('Show password').",
                    "Click the eye icon again ('Hide password').",
                ],
                test_data="Password: AdminPassword@2026",
                expected_result="Clicking the eye icon reveals password text; clicking it again masks the text with dots/asterisks.",
                pass_fail_criteria="Pass: Visibility toggles correctly.\nFail: Eye icon does not function.",
            ),
            TestCase(
                id="TC009",
                description="Toggle between User Sign In mode and Admin Sign In mode",
                preconditions="User is on combined surface Sign In page (/signin).",
                steps=[
                    "Click the 'Administrator' tab or toggle option.",
                    "Observe the form changes from email to username.",
                    "Click the 'Youth Organization' tab or toggle option.",
                    "Observe the form changes back to email.",
                ],
                test_data="N/A",
                expected_result="The UI switches seamlessly between Organization User login (Email address, Google OAuth) and PCYDO Admin login (Username, no Google OAuth).",
                pass_fail_criteria="Pass: Mode switches and field requirements adapt accordingly.\nFail: UI fails to switch modes or inputs overlap.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Admin Session Management & Route Protection
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Admin Session Management & Route Protection",
        test_cases=[
            TestCase(
                id="TC010",
                description="Authenticated administrator accesses protected admin routes",
                preconditions="Administrator is authenticated.",
                steps=[
                    "Sign in as administrator.",
                    "Navigate to admin routes: /admin, /admin/registrations, /admin/renewals, /admin/yorp-registry, /admin/budget-utilization, /admin/liquidation-monitoring, /admin/budget-monitoring, /admin/templates, /admin/news-releases, /admin/inquiries, /admin/notifications, /admin/activity-logs.",
                    "Observe whether each page loads.",
                ],
                test_data="N/A",
                expected_result="Each administrative page loads successfully with the full admin sidebar, breadcrumbs, and authorized management tables.",
                pass_fail_criteria="Pass: All admin routes are accessible to authenticated administrator.\nFail: Admin is redirected to sign in or pages error out.",
            ),
            TestCase(
                id="TC011",
                description="Unauthenticated visitor is blocked from admin routes",
                preconditions="User is unauthenticated (no active session).",
                steps=[
                    "Open a clean browser window.",
                    "Navigate directly to /admin or /admin/budget-utilization.",
                    "Observe the result.",
                ],
                test_data="URL: /admin/budget-utilization",
                expected_result="The system blocks unauthorized access and immediately redirects the user to the Admin Sign In page (/signin or /admin/signin).",
                pass_fail_criteria="Pass: Unauthenticated access is redirected to sign in.\nFail: Admin console is accessible without authentication.",
            ),
            TestCase(
                id="TC012",
                description="Regular youth organization user is blocked from admin routes",
                preconditions="User is authenticated as a youth organization user.",
                steps=[
                    "Sign in as an organization user.",
                    "Attempt to navigate directly to /admin or /admin/registrations.",
                    "Observe the result.",
                ],
                test_data="URL: /admin",
                expected_result="The user is redirected away from the admin portal (redirected to /dashboard or /signin) because the account lacks the admin role.",
                pass_fail_criteria="Pass: Non-admin user cannot access admin routes.\nFail: Organization user accesses admin portal.",
            ),
            TestCase(
                id="TC013",
                description="Administrator sign out terminates session",
                preconditions="Administrator is authenticated.",
                steps=[
                    "Click the administrator profile menu in the header.",
                    "Click 'Sign Out'.",
                    "Observe the redirect and session termination.",
                ],
                test_data="N/A",
                expected_result="The user is signed out of the administrative portal and redirected to the Sign In page. Subsequent attempts to access protected admin pages require signing in again.",
                pass_fail_criteria="Pass: Administrator is signed out and redirected.\nFail: Session remains active or user is not redirected.",
            ),
            TestCase(
                id="TC014",
                description="Admin session persists across browser page refresh",
                preconditions="Administrator is authenticated on /admin.",
                steps=[
                    "Sign in as administrator.",
                    "Navigate to /admin/yorp-registry.",
                    "Refresh the browser page (F5).",
                    "Observe the page state.",
                ],
                test_data="N/A",
                expected_result="The administrator remains authenticated and the YORP Registry page reloads cleanly without prompting for credentials.",
                pass_fail_criteria="Pass: Admin session persists across refresh.\nFail: Administrator is logged out on refresh.",
            ),
            TestCase(
                id="TC015",
                description="Signed-out administrator cannot access admin routes via Back button",
                preconditions="Administrator has just signed out.",
                steps=[
                    "Sign out from the Admin Portal.",
                    "Click the browser's Back button.",
                    "Observe the result.",
                ],
                test_data="N/A",
                expected_result="The browser does not reload the administrative portal; the system redirects the user to the Sign In page.",
                pass_fail_criteria="Pass: Back button access is blocked after sign out.\nFail: Admin portal reloads via Back button.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Super Admin & Administrator Accounts Management
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Super Admin & Administrator Accounts Management",
        test_cases=[
            TestCase(
                id="TC016",
                description="Super Admin views Administrators management page",
                preconditions="User is authenticated with 'super_admin' role.",
                steps=[
                    "Navigate to /admin/administrators.",
                    "Observe the page header, action buttons, and tab controls.",
                ],
                test_data="N/A",
                expected_result="The page renders title 'Administrators', action buttons 'Export' and 'Add Administrator', and tab segmented control with 'Accounts' and 'Roles and Permissions'.",
                pass_fail_criteria="Pass: Super Admin accesses full administrators console.\nFail: Page is missing or action buttons are absent.",
            ),
            TestCase(
                id="TC017",
                description="Administrators table renders accounts list and search",
                preconditions="User is on /admin/administrators in 'Accounts' tab.",
                steps=[
                    "Observe the administrators table columns: Name, Username, Email, Unit, Role, Status, Actions.",
                    "Type an admin name or username in the search input.",
                    "Observe the table filtering.",
                ],
                test_data="Search: 'lead'",
                expected_result="Table displays administrator accounts with status pills (Active, Inactive, Pending). Search dynamically filters matching accounts.",
                pass_fail_criteria="Pass: Table renders all account details and filters correctly.\nFail: Accounts fail to load or search does not function.",
            ),
            TestCase(
                id="TC018",
                description="Add Administrator modal opens and validates required fields",
                preconditions="Super Admin is on /admin/administrators.",
                steps=[
                    "Click 'Add Administrator'.",
                    "Observe modal 'Add Administrator' with fields: Full Name, Username, Email, Unit, Role.",
                    "Leave all fields empty and click 'Send Invitation'.",
                    "Observe validation feedback.",
                ],
                test_data="All fields: (empty)",
                expected_result="Validation error messages appear for required fields (Full name required, Username required, Email required). Submission is blocked.",
                pass_fail_criteria="Pass: Missing required fields are flagged.\nFail: Modal submits empty administrator form.",
            ),
            TestCase(
                id="TC019",
                description="Add Administrator with invalid email format",
                preconditions="Super Admin is on 'Add Administrator' modal.",
                steps=[
                    "Enter valid name and username.",
                    "Enter an invalid email format: 'admin_email_without_at'.",
                    "Click 'Send Invitation'.",
                ],
                test_data="Email: admin_email_without_at",
                expected_result="A validation error indicates that a valid email address is required.",
                pass_fail_criteria="Pass: Invalid email format is rejected.\nFail: Form submits with invalid email.",
            ),
            TestCase(
                id="TC020",
                description="Add Administrator with duplicate username or email",
                preconditions="An administrator with username 'pcydo_lead_admin' already exists.",
                steps=[
                    "Enter full name.",
                    "Enter existing username 'pcydo_lead_admin'.",
                    "Enter existing email.",
                    "Click 'Send Invitation'.",
                ],
                test_data="Username: pcydo_lead_admin (duplicate)",
                expected_result="An error message indicates that the username or email is already in use by another administrator.",
                pass_fail_criteria="Pass: Duplicate administrator account creation is blocked.\nFail: Duplicate username or email is accepted.",
            ),
            TestCase(
                id="TC021",
                description="Successfully invite new administrator",
                preconditions="Super Admin fills all fields with unique valid data.",
                steps=[
                    "Enter unique Full Name: 'Maria Santos'.",
                    "Enter unique Username: 'maria_santos'.",
                    "Enter unique Email: 'maria.santos.pcydo@gmail.com'.",
                    "Select Unit: 'Compliance & YORP Unit'.",
                    "Select Role: 'Admin'.",
                    "Click 'Send Invitation'.",
                ],
                test_data="Full Name: Maria Santos\nUsername: maria_santos\nEmail: maria.santos.pcydo@gmail.com\nUnit: Compliance & YORP Unit\nRole: Admin",
                expected_result="Modal closes with toast confirmation 'Invitation sent'. A new row appears in the Administrators table with status 'Pending'.",
                pass_fail_criteria="Pass: Invitation is created with Pending status and toast appears.\nFail: Account creation fails or row does not appear.",
            ),
            TestCase(
                id="TC022",
                description="Resend administrator invitation",
                preconditions="An administrator account with status 'Pending' exists in the table.",
                steps=[
                    "Locate the pending administrator row.",
                    "Click the row actions menu (three dots) -> 'Resend Invite'.",
                    "Observe the confirmation toast.",
                ],
                test_data="Pending Admin: maria_santos",
                expected_result="The system resends the invitation email and displays toast 'Invitation resent'.",
                pass_fail_criteria="Pass: Invitation is resent successfully.\nFail: Resend action fails or produces an error.",
            ),
            TestCase(
                id="TC023",
                description="Deactivate active administrator account",
                preconditions="An active administrator account exists.",
                steps=[
                    "Locate an active administrator row.",
                    "Click actions menu -> 'Deactivate Account'.",
                    "Confirm the deactivation dialog.",
                    "Observe the account status badge.",
                ],
                test_data="Target Admin: test_officer",
                expected_result="The administrator status changes from 'Active' to 'Inactive' (gray badge). Toast confirmation appears.",
                pass_fail_criteria="Pass: Account status changes to Inactive.\nFail: Status does not update or deactivation fails.",
            ),
            TestCase(
                id="TC024",
                description="Deactivated administrator sign-in is blocked",
                preconditions="Administrator account has been deactivated (status = Inactive).",
                steps=[
                    "Navigate to Admin Sign In.",
                    "Enter credentials for the deactivated administrator.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: (deactivated admin)\nPassword: (valid password)",
                expected_result="Authentication fails with error message indicating the administrator account is inactive or disabled.",
                pass_fail_criteria="Pass: Deactivated administrator cannot log in.\nFail: Deactivated administrator accesses admin portal.",
            ),
            TestCase(
                id="TC025",
                description="Export administrators directory",
                preconditions="Super Admin is on /admin/administrators.",
                steps=[
                    "Click 'Export' button in the page header.",
                    "Observe the export dialog and confirm export.",
                ],
                test_data="N/A",
                expected_result="An export file containing administrator records is generated and downloaded.",
                pass_fail_criteria="Pass: Export file downloads successfully.\nFail: Export button is non-functional.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Administrator Initial Password Creation (/admin/create-password)
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Administrator Initial Password Creation",
        test_cases=[
            TestCase(
                id="TC026",
                description="Access valid administrator invitation link",
                preconditions="User has received an invitation email with a valid setup link.",
                steps=[
                    "Open the invitation URL in browser (/admin/create-password).",
                    "Observe the page heading and form fields.",
                ],
                test_data="N/A",
                expected_result="The page loads with heading 'Create your administrator password', subtitle 'Set a secure password for your PCYDO administrator account', password input, confirm password input, and password criteria checklist.",
                pass_fail_criteria="Pass: Initial password creation page displays.\nFail: Page crashes or displays invalid link error for valid setup URL.",
            ),
            TestCase(
                id="TC027",
                description="Admin initial password policy enforcement and matching",
                preconditions="User is on /admin/create-password with a valid invitation link.",
                steps=[
                    "Enter a password that violates policy (e.g. fewer than 8 characters).",
                    "Observe checklist indicators.",
                    "Enter a password meeting all 5 criteria: 'AdminSecure@2026'.",
                    "Enter mismatched confirm password: 'Different@123'.",
                    "Observe mismatch message.",
                    "Re-enter matching password: 'AdminSecure@2026'.",
                    "Click 'Create Password'.",
                ],
                test_data="New Password: AdminSecure@2026\nConfirm: AdminSecure@2026",
                expected_result="Checklist dynamically confirms criteria. After entering matching passwords and clicking 'Create Password', a success screen appears ('Password created successfully').",
                pass_fail_criteria="Pass: Password policy and matching are enforced, and success screen appears.\nFail: Password creation fails or policy is bypassed.",
            ),
            TestCase(
                id="TC028",
                description="Access expired or invalid administrator invitation link",
                preconditions="The invitation link has expired or has already been used.",
                steps=[
                    "Open the expired invitation URL in browser.",
                    "Observe the page displayed.",
                ],
                test_data="Link: (expired / invalid setup link)",
                expected_result="A message is displayed: 'Invitation link unavailable or expired. Please contact your Super Administrator to request a new invitation link.' A button 'Back to Sign In' is provided.",
                pass_fail_criteria="Pass: Invalid invitation screen is displayed.\nFail: Password creation form is displayed for expired link.",
            ),
            TestCase(
                id="TC029",
                description="Sign in with newly created administrator password",
                preconditions="Administrator has successfully completed initial password creation.",
                steps=[
                    "Click 'Continue to Sign In' from success screen.",
                    "Enter the invited username.",
                    "Enter the newly created password.",
                    "Click 'Sign In'.",
                ],
                test_data="Username: maria_santos\nPassword: AdminSecure@2026",
                expected_result="The administrator is authenticated and redirected to /admin. The account status in the Administrators table is now 'Active'.",
                pass_fail_criteria="Pass: Newly created credentials authenticate into admin portal.\nFail: Login fails with new credentials.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Roles and Permissions Matrix
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Roles & Permissions Configuration",
        test_cases=[
            TestCase(
                id="TC030",
                description="View Roles and Permissions configuration panel",
                preconditions="Super Admin is on /admin/administrators.",
                steps=[
                    "Click 'Roles and Permissions' tab in the segmented control.",
                    "Observe the role selector (Super Admin, Admin, Unit Officer).",
                    "Observe the permissions matrix table displaying functional modules (Organizations, Compliance, Budget Requests, Liquidation, YPOP, Templates, News, Inquiries).",
                ],
                test_data="N/A",
                expected_result="The Roles & Permissions panel renders the role selector and permission checkboxes (Read, Create, Update, Delete, Approve).",
                pass_fail_criteria="Pass: Permissions panel renders correctly.\nFail: Panel does not display or is blank.",
            ),
            TestCase(
                id="TC031",
                description="Super Admin updates role permission checkboxes",
                preconditions="Super Admin selects 'Unit Officer' role in the permissions panel.",
                steps=[
                    "Select role 'Unit Officer'.",
                    "Toggle off the 'Delete' permission checkbox for 'Budget Requests'.",
                    "Click 'Save Permissions'.",
                    "Observe confirmation toast.",
                ],
                test_data="Role: Unit Officer\nPermission: Delete Budget Requests (unchecked)",
                expected_result="A confirmation toast appears: 'Permissions updated successfully'. The updated permission state persists after page refresh.",
                pass_fail_criteria="Pass: Permissions update and persist across refresh.\nFail: Updates fail to save or revert on refresh.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Responsive Administrative Authentication & Desktop-Only Gate (>=1024px)
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Responsive Administrative Authentication & Desktop-Only Gate (>=1024px)",
        test_cases=[
            TestCase(
                id="TC032",
                description="Verify Admin Sign In and Password Creation on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /admin/signin on desktop browser.",
                    "Verify desktop layout, Pasig City / PCYDO municipal seals, administrative header, credential inputs, and submit button.",
                    "Navigate to /admin/create-password with an invitation link.",
                    "Verify password creation form, criteria list (8+ characters, uppercase, number, symbol), and confirmation buttons.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Admin login card is properly centered with high-definition municipal branding. Password criteria checklist displays alongside input with instant live validation feedback.",
                pass_fail_criteria="Pass: Admin auth views render cleanly at 1920x1080 without distortion.\nFail: Branding misaligned or password criteria unreadable.",
            ),
            TestCase(
                id="TC033",
                description="Verify Admin surfaces enforce Desktop-Only Gate on tablet viewport (<1024px)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /admin/signin on tablet viewport.",
                    "Observe displayed screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="The Admin Desktop Warning Screen is displayed. Access to administrative sign in is blocked because viewport width is below the mandatory 1024px threshold.",
                pass_fail_criteria="Pass: Admin desktop warning screen renders on tablet viewport.\nFail: Admin login form appears on viewport < 1024px.",
            ),
            TestCase(
                id="TC034",
                description="Verify information-only nature of Admin Desktop Warning Screen on mobile viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /admin/signin or any /admin route on mobile phone viewport.",
                    "Inspect the Admin Warning Screen content and controls.",
                    "Verify absence of misleading navigation buttons (no 'Back to Home', no 'Sign Out', no CTA buttons).",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="The screen displays purely informational notice: 'Admin Portal requires a desktop-class display (minimum 1024px width) for secure administrative workflows.' There are NO misleading action buttons, Back to Home links, or Sign Out CTAs.",
                pass_fail_criteria="Pass: Warning screen is strictly informational with zero misleading buttons.\nFail: Misleading action buttons or navigation CTAs are present.",
            ),
            TestCase(
                id="TC035",
                description="Desktop gating for /admin/signin and Administrator mode on combined /signin",
                preconditions="Tester views combined /signin page on mobile viewport (<1024px).",
                steps=[
                    "Navigate to /signin on mobile viewport.",
                    "Switch segmented control / mode toggle to 'Administrator'.",
                    "Observe screen response.",
                ],
                test_data="Viewport: 390x844; Mode: Administrator.",
                expected_result="Selecting Administrator mode immediately activates the Admin Desktop Warning Screen, blocking administrative sign-in on mobile devices.",
                pass_fail_criteria="Pass: Administrator mode on /signin triggers desktop gate on small viewports.\nFail: Administrator login form renders on mobile.",
            ),
            TestCase(
                id="TC036",
                description="Organization / Youth User mode on /signin remains fully accessible on mobile (<1024px)",
                preconditions="Tester views /signin on mobile phone viewport (390x844).",
                steps=[
                    "Navigate to /signin in Organization / Youth User mode on mobile.",
                    "Verify form fields: Email, Password, 'Continue with Google', 'Sign In', and 'Forgot Password' link.",
                    "Enter user credentials and verify login interaction.",
                ],
                test_data="Viewport: 390x844; Mode: Organization / Youth User.",
                expected_result="Organization user authentication is NOT blocked by the desktop gate. The mobile-friendly login card renders cleanly and allows standard youth user sign in.",
                pass_fail_criteria="Pass: Organization mode remains fully accessible and functional on mobile.\nFail: Organization users are blocked by admin desktop gate.",
            ),
            TestCase(
                id="TC037",
                description="Admin Password Creation (/admin/create-password) is desktop-gated on viewports <1024px",
                preconditions="Tester accesses /admin/create-password on mobile device (390x844).",
                steps=[
                    "Open /admin/create-password with a valid setup link on mobile viewport.",
                    "Observe rendered view.",
                ],
                test_data="URL: /admin/create-password on viewport < 1024px.",
                expected_result="Desktop gate intercepts the view and renders the informational Admin Warning Screen, preventing administrative credential creation on non-desktop viewports.",
                pass_fail_criteria="Pass: Password creation route is strictly desktop-gated.\nFail: Admin password form renders on mobile.",
            ),
            TestCase(
                id="TC038",
                description="Authenticated Admin Portal (/admin/*) enforces desktop gate dynamically across viewport resize",
                preconditions="Administrator is authenticated on desktop viewport (1280x800).",
                steps=[
                    "Navigate to /admin/registrations.",
                    "Verify full administrative table and toolbar are visible.",
                    "Resize browser window width down to 900px.",
                    "Observe view transition.",
                    "Resize browser window width back up to 1280px.",
                    "Observe view restoration.",
                ],
                test_data="Window resize: 1280px -> 900px -> 1280px.",
                expected_result="When resized below 1024px, administrative workspace is immediately replaced by the informational Warning Screen. When resized back to >=1024px, the administrative workspace restores instantly without data corruption.",
                pass_fail_criteria="Pass: Desktop gate reacts dynamically to viewport resize.\nFail: Portal remains exposed below 1024px or breaks upon restoration.",
            ),
            TestCase(
                id="TC039",
                description="Viewport threshold boundary testing for Admin Desktop Gate (1023px vs 1024px)",
                preconditions="Tester uses precision viewport sizing tools on Admin route.",
                steps=[
                    "Set viewport width to exactly 1023px and observe screen.",
                    "Set viewport width to exactly 1024px and observe screen.",
                ],
                test_data="Viewport widths: 1023px and 1024px.",
                expected_result="At 1023px, the Admin Warning Screen is displayed. At exactly 1024px, the full Admin interface renders and becomes fully interactive.",
                pass_fail_criteria="Pass: Boundary enforcement precisely activates warning at <=1023px and permits UI at >=1024px.\nFail: Threshold is incorrect or fluctuates.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_02_groups()
    output_filename = "02_YTRACE_Admin_Authentication_RBAC_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="02",
        section_title="Administrative Authentication & Role-Based Access Control Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


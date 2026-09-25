"""
Generator for Section 03: Terms of Service & Privacy Policy Enforcement Black-Box Test Cases.
Document: 03_YTRACE_Terms_Privacy_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_03_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Mandatory Policy Agreement Modal on Sign In
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Mandatory Policy Agreement Modal on Sign In",
        test_cases=[
            TestCase(
                id="TC001",
                description="Mandatory policy agreement modal displays upon sign in",
                preconditions="User signs in with an account that has not yet accepted the active policy version (or policy has been updated).",
                steps=[
                    "Navigate to Sign In page.",
                    "Enter valid user credentials and click 'Sign In'.",
                    "Observe the screen immediately following authentication.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: NewTest@1234",
                expected_result="A blocking modal dialog 'Terms of Service & Privacy Policy Agreement' appears over the screen, preventing access to the dashboard until policies are resolved.",
                pass_fail_criteria="Pass: Mandatory policy modal appears and blocks dashboard access.\nFail: User accesses dashboard without seeing the policy modal.",
            ),
            TestCase(
                id="TC002",
                description="Policy modal displays version, effective date, and summarized terms",
                preconditions="Policy agreement modal is displayed.",
                steps=[
                    "Inspect the header, body, and metadata within the policy modal.",
                ],
                test_data="N/A",
                expected_result="The modal clearly displays the active policy title, Version (e.g. Version 1.0), Effective Date (June 30, 2026), and summarized clauses for both Data Privacy (RA 10173) and Terms of Service.",
                pass_fail_criteria="Pass: Policy metadata and summarized terms are visible.\nFail: Version, date, or terms content is missing.",
            ),
            TestCase(
                id="TC003",
                description="Accept button disabled when neither checkbox is checked",
                preconditions="Policy agreement modal is open.",
                steps=[
                    "Leave both 'Privacy Policy' and 'Terms of Service' checkboxes unchecked.",
                    "Observe the state of the 'Accept and Continue' button.",
                ],
                test_data="Checkboxes: (both unchecked)",
                expected_result="The 'Accept and Continue' button is disabled.",
                pass_fail_criteria="Pass: Accept button is disabled.\nFail: Accept button is enabled with unchecked boxes.",
            ),
            TestCase(
                id="TC004",
                description="Accept button disabled when only one checkbox is checked",
                preconditions="Policy agreement modal is open.",
                steps=[
                    "Check only the 'I have read and agree to the Privacy Policy' checkbox.",
                    "Leave 'Terms of Service' unchecked.",
                    "Observe the 'Accept and Continue' button.",
                    "Uncheck Privacy Policy and check only 'Terms of Service'.",
                    "Observe the button again.",
                ],
                test_data="Checkbox 1 checked, Checkbox 2 unchecked",
                expected_result="The 'Accept and Continue' button remains disabled in both scenarios until BOTH checkboxes are checked.",
                pass_fail_criteria="Pass: Button remains disabled when only one policy is checked.\nFail: Button enables with only one policy checked.",
            ),
            TestCase(
                id="TC005",
                description="Accept button enabled when both checkboxes are checked",
                preconditions="Policy agreement modal is open.",
                steps=[
                    "Check both 'Privacy Policy' and 'Terms of Service' checkboxes.",
                    "Observe the 'Accept and Continue' button state.",
                ],
                test_data="Both checkboxes: Checked",
                expected_result="The 'Accept and Continue' button becomes enabled with primary brand styling.",
                pass_fail_criteria="Pass: Button enables when both checkboxes are checked.\nFail: Button remains disabled.",
            ),
            TestCase(
                id="TC006",
                description="Accepting policies records agreement and redirects to dashboard",
                preconditions="Both checkboxes are checked in policy modal.",
                steps=[
                    "Click 'Accept and Continue'.",
                    "Observe the modal behavior and subsequent page load.",
                ],
                test_data="Both checkboxes: Checked",
                expected_result="The modal displays a brief saving state, closes, and user is granted full access to the Organization Portal Dashboard (/dashboard).",
                pass_fail_criteria="Pass: Modal closes and user enters dashboard.\nFail: Modal fails to dismiss or error occurs.",
            ),
            TestCase(
                id="TC007",
                description="Accepted policy persists across future sign ins",
                preconditions="User has accepted the active policy version.",
                steps=[
                    "Sign out from the portal.",
                    "Sign in again with the same credentials.",
                    "Observe whether policy modal appears.",
                ],
                test_data="Email: ytracetestorg@gmail.com",
                expected_result="The policy agreement modal does NOT appear; the user is directed straight to the portal dashboard.",
                pass_fail_criteria="Pass: User enters dashboard directly without re-prompting.\nFail: User is prompted to accept policy on every sign in.",
            ),
            TestCase(
                id="TC008",
                description="Declining policies signs user out and redirects to Sign In",
                preconditions="Policy agreement modal is displayed.",
                steps=[
                    "Click the 'Sign Out' button inside the policy modal.",
                    "Observe the redirect and authentication state.",
                ],
                test_data="N/A",
                expected_result="The user session is terminated immediately and the browser redirects to the Sign In / Welcome page. The user is not granted access to the portal.",
                pass_fail_criteria="Pass: Declining policy signs out the user.\nFail: User remains authenticated or can bypass modal.",
            ),
            TestCase(
                id="TC009",
                description="Policy re-prompt occurs when policy version is updated",
                preconditions="User previously accepted Version 1.0. A new Version 1.1 has been published in the system.",
                steps=[
                    "Sign in with the organization account.",
                    "Observe the post-authentication screen.",
                ],
                test_data="Updated Policy Version: 1.1",
                expected_result="The policy modal appears displaying the updated Version 1.1 and requires renewed agreement before accessing the portal.",
                pass_fail_criteria="Pass: Modal re-prompts for updated policy version.\nFail: Updated policy is bypassed.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: In-App & Registration Policy Modals
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="In-App & Registration Policy Modals",
        test_cases=[
            TestCase(
                id="TC010",
                description="Registration Step 2 Privacy Policy link opens modal",
                preconditions="User is on Step 2 of organization registration (/signup).",
                steps=[
                    "Click the 'Privacy Policy' text link within the policy agreement section.",
                    "Observe the modal dialog.",
                    "Close the modal.",
                    "Observe the registration form.",
                ],
                test_data="N/A",
                expected_result="A modal opens displaying the complete Privacy Policy text. Closing the modal returns the user to Step 2 with all form fields intact.",
                pass_fail_criteria="Pass: Modal opens, displays text, and closes with form data intact.\nFail: Modal fails to open or closes with form data cleared.",
            ),
            TestCase(
                id="TC011",
                description="Registration Step 2 Terms of Service link opens modal",
                preconditions="User is on Step 2 of organization registration (/signup).",
                steps=[
                    "Click the 'Terms of Service' text link within the policy agreement section.",
                    "Observe the modal dialog.",
                    "Close the modal.",
                    "Observe the registration form.",
                ],
                test_data="N/A",
                expected_result="A modal opens displaying the complete Terms of Service text. Closing the modal returns the user to Step 2 with all form fields intact.",
                pass_fail_criteria="Pass: Modal opens, displays text, and closes with form data intact.\nFail: Modal fails to open or closes with form data cleared.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Public Legal Policy Pages
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Public Legal Policy Pages",
        test_cases=[
            TestCase(
                id="TC012",
                description="Public Terms of Service page renders via footer link",
                preconditions="User is on the public landing page (/ or any public page).",
                steps=[
                    "Scroll down to the footer.",
                    "Click the 'Terms of Service' link.",
                    "Observe the URL and rendered page content.",
                ],
                test_data="URL: /terms",
                expected_result="The browser navigates to /terms. The page renders the full official Terms of Service including definitions, eligible organizations, user responsibilities, and effective dates.",
                pass_fail_criteria="Pass: Terms of Service page displays complete content.\nFail: Link is broken or content is truncated.",
            ),
            TestCase(
                id="TC013",
                description="Public Data Privacy Policy page renders via footer link",
                preconditions="User is on any public page.",
                steps=[
                    "Scroll down to the footer.",
                    "Click the 'Privacy Policy' link.",
                    "Observe the URL and rendered page content.",
                ],
                test_data="URL: /privacy",
                expected_result="The browser navigates to /privacy. The page renders the full RA 10173 Data Privacy Policy, including mandate, lawful bases, data subject rights, security safeguards, and official contact email (lydo@pasigcity.gov.ph).",
                pass_fail_criteria="Pass: Data Privacy Policy page displays complete content.\nFail: Link is broken or content is missing.",
            ),
            TestCase(
                id="TC014",
                description="Policy anchor link scrolling to specific sections",
                preconditions="User navigates to a policy URL with an anchor hash (e.g. /privacy#rights).",
                steps=[
                    "Navigate to /privacy#rights or click a table-of-contents link within the policy page.",
                    "Observe page scroll position.",
                ],
                test_data="Anchor: #rights",
                expected_result="The page smoothly scrolls directly to the targeted heading (e.g. Section 15: Your Data Privacy Rights) and aligns it in view.",
                pass_fail_criteria="Pass: Browser scrolls to the designated anchor.\nFail: Scroll does not adjust or page remains at top.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Responsive Terms & Privacy Policy Modal Across Viewports
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Responsive Terms & Privacy Policy Modal Across Viewports",
        test_cases=[
            TestCase(
                id="TC015",
                description="Verify Terms & Privacy Agreement Modal on Desktop Viewport (1920x1080)",
                preconditions="Tester opens desktop browser at 1920x1080 with user requiring policy acceptance.",
                steps=[
                    "Log in as organization user with pending policy agreement.",
                    "Observe Terms & Privacy Agreement modal dialog appearance.",
                    "Verify desktop modal width, comfortable reading typography, and visible scrollbar.",
                    "Scroll down through the agreement text and verify side-by-side 'Decline & Exit' and 'I Agree & Continue' buttons.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Modal displays as a centered dialog with ample margins (max-w-2xl/3xl), readable line height, clear section headings, and side-by-side action buttons with distinct visual hierarchy.",
                pass_fail_criteria="Pass: Modal centers cleanly with readable text and accessible buttons.\nFail: Modal is stretched, text is clipped, or buttons overlap.",
            ),
            TestCase(
                id="TC016",
                description="Verify Terms & Privacy Agreement Modal on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Trigger Terms & Privacy Agreement modal on tablet viewport.",
                    "Perform touch-scroll gestures through the 12 policy sections.",
                    "Verify scroll progress reaches bottom.",
                    "Verify touch targets for action buttons are comfortably spaced.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Modal adapts to 90% tablet width. Touch-scrolling is smooth with inertial momentum. Action buttons maintain minimum 44px tap height and remain reachable.",
                pass_fail_criteria="Pass: Tablet modal adapts smoothly with responsive touch scrolling.\nFail: Scrolling stutters, text overflows viewport, or buttons are unclickable.",
            ),
            TestCase(
                id="TC017",
                description="Verify Terms & Privacy Agreement Modal on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Trigger Terms & Privacy Agreement modal on phone viewport.",
                    "Verify modal renders as full-screen dialog or responsive bottom sheet.",
                    "Scroll through policy text to bottom.",
                    "Verify sticky bottom action bar containing stacked 'I Agree' and 'Decline' buttons.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Modal occupies full screen with zero horizontal overflow. Policy text is comfortably readable (>=14px). Sticky bottom bar ensures action buttons remain accessible without requiring manual scrolling back to bottom.",
                pass_fail_criteria="Pass: Mobile phone modal renders with sticky action bar and no horizontal scroll.\nFail: Modal overflows viewport or accept button is inaccessible.",
            ),
        ],
    )
    groups.append(g4)

    return groups


def main():
    groups = get_section_03_groups()
    output_filename = "03_YTRACE_Terms_Privacy_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="03",
        section_title="Terms of Service & Privacy Policy Enforcement Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


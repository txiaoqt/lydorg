"""
Generator for Section 01: Authentication & Access Control Black-Box Test Cases.
Document: 01_YTRACE_Authentication_Access_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_01_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Organization Registration – Existing Organization (with URN)
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Organization Registration – Existing Organization (with URN)",
        test_cases=[
            TestCase(
                id="TC001",
                description="Register existing organization with valid URN – Step 1",
                preconditions="User is on the Registration page (/signup). No account exists for the organization.",
                steps=[
                    "Navigate to the Registration page (/signup).",
                    "Enter a valid organization name in the 'Organization Name' field.",
                    "Check the checkbox: 'We already have a Unique Registration Number (URN)'.",
                    "Enter a valid URN in the format PCYDO-XXXX-XXXX.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: Kapitolyo Youth Council\nURN: PCYDO-AB12-CD34",
                expected_result="The system accepts the organization details and proceeds to Step 2 (Account Details).",
                pass_fail_criteria="Pass: User advances to Step 2.\nFail: User remains on Step 1 or receives an error.",
            ),
            TestCase(
                id="TC002",
                description="Register existing organization with invalid URN format",
                preconditions="User is on the Registration page, Step 1.",
                steps=[
                    "Enter a valid organization name.",
                    "Check the URN checkbox.",
                    "Enter a URN that does not match the PCYDO-XXXX-XXXX format.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: Kapitolyo Youth Council\nURN: INVALID-URN",
                expected_result="A validation message is displayed: 'Please enter a valid Unique Registration Number (URN) in the format PCYDO-XXXX-XXXX.' User remains on Step 1.",
                pass_fail_criteria="Pass: Validation message is displayed and user cannot proceed.\nFail: User proceeds to Step 2 with an invalid URN.",
            ),
            TestCase(
                id="TC003",
                description="Register existing organization with empty URN field",
                preconditions="User is on the Registration page, Step 1. URN checkbox is checked.",
                steps=[
                    "Enter a valid organization name.",
                    "Check the URN checkbox.",
                    "Leave the URN field empty.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: Kapitolyo Youth Council\nURN: (empty)",
                expected_result="A validation message is displayed: 'Enter your Unique Registration Number (URN).' User remains on Step 1.",
                pass_fail_criteria="Pass: Validation message is displayed and user cannot proceed.\nFail: User proceeds to Step 2 without a URN.",
            ),
            TestCase(
                id="TC004",
                description="Register existing organization with already-used URN",
                preconditions="Another organization is already registered with the same URN in the system.",
                steps=[
                    "Enter a valid organization name.",
                    "Check the URN checkbox.",
                    "Enter a URN that is already registered by another organization.",
                    "Observe the real-time availability check indicator below the URN field.",
                ],
                test_data="Organization Name: Kapitolyo Youth Council\nURN: PCYDO-2026-01EC (already registered)",
                expected_result="An error message is displayed: 'URN is unavailable.' Registration is blocked and user remains on Step 1.",
                pass_fail_criteria="Pass: Error message is displayed and duplicate registration is prevented.\nFail: Duplicate registration succeeds or availability check is missing.",
            ),
            TestCase(
                id="TC005",
                description="Register with empty organization name",
                preconditions="User is on the Registration page, Step 1.",
                steps=[
                    "Leave the 'Organization Name' field empty.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: (empty)",
                expected_result="A validation message is displayed: 'Organization name is required.' User remains on Step 1.",
                pass_fail_criteria="Pass: Validation message is displayed and user cannot proceed.\nFail: User proceeds to Step 2 without an organization name.",
            ),
            TestCase(
                id="TC006",
                description="URN case insensitivity – lowercase input converted to uppercase",
                preconditions="User is on the Registration page, Step 1.",
                steps=[
                    "Enter a valid organization name.",
                    "Check the URN checkbox.",
                    "Enter a valid URN in lowercase: 'pcydo-ab12-cd34'.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: Test Youth Org\nURN: pcydo-ab12-cd34",
                expected_result="The system automatically converts the URN to uppercase (PCYDO-AB12-CD34) and proceeds to Step 2.",
                pass_fail_criteria="Pass: URN is accepted regardless of case and user advances to Step 2.\nFail: URN is rejected due to lowercase input.",
            ),
            TestCase(
                id="TC007",
                description="URN Help icon popover displays information",
                preconditions="User is on the Registration page, Step 1 with URN checkbox checked.",
                steps=[
                    "Check the URN checkbox.",
                    "Click the help icon next to the URN field label.",
                    "Observe the popover content.",
                ],
                test_data="N/A",
                expected_result="A popover appears with the title 'About Unique Registration Number (URN)' and explains that the URN should match the existing LYDO / PCYDO registration record.",
                pass_fail_criteria="Pass: Help popover with URN information is displayed.\nFail: No popover appears or content is incorrect.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Organization Registration – New Organization (Registration Reference Lifecycle)
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Organization Registration – New Organization (Registration Reference Lifecycle)",
        test_cases=[
            TestCase(
                id="TC008",
                description="Register new organization without existing URN – Step 1",
                preconditions="User is on the Registration page. URN checkbox is unchecked.",
                steps=[
                    "Navigate to the Registration page (/signup).",
                    "Enter a valid organization name.",
                    "Leave the URN checkbox unchecked.",
                    "Observe the information callout below the registration type section.",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: Bagong Ilog Youth Association\nURN checkbox: (unchecked)",
                expected_result="A callout box is displayed stating: 'A Unique Registration Number (URN) will be automatically generated after your organization is successfully registered and verified.' User proceeds to Step 2. Verify that no official URN is shown/generated before the organization completes the required verification process.",
                pass_fail_criteria="Pass: User advances to Step 2, the registration guidance callout is visible, and no official URN is issued prematurely.\nFail: User cannot proceed or an official URN is generated before verification.",
            ),
            TestCase(
                id="TC009",
                description="Toggle URN checkbox shows/hides appropriate fields",
                preconditions="User is on the Registration page, Step 1.",
                steps=[
                    "Initially leave the URN checkbox unchecked – observe the URN callout.",
                    "Check the URN checkbox – observe the URN input field appears.",
                    "Uncheck the URN checkbox – observe the input field disappears and callout returns.",
                ],
                test_data="N/A",
                expected_result="When unchecked, the registration reference callout is visible and no URN input is shown. When checked, the URN input field appears with placeholder 'PCYDO-XXXX-XXXX' and the callout is hidden.",
                pass_fail_criteria="Pass: UI correctly toggles between URN input and registration callout.\nFail: Fields do not toggle correctly.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Organization Registration – Account Details (Step 2)
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Organization Registration – Account Details",
        test_cases=[
            TestCase(
                id="TC010",
                description="Complete account details with all valid fields",
                preconditions="User has completed Step 1 and is on Step 2 (Account Details).",
                steps=[
                    "Enter a valid email address (must end with @gmail.com).",
                    "Enter a valid contact number (11 digits starting with 09).",
                    "Select District I from the District dropdown.",
                    "Select Bagong Ilog from the Barangay dropdown.",
                    "Enter a password that meets all policy requirements (8–16 characters, uppercase, lowercase, number, special character).",
                    "Manually re-enter the same password in the Confirm Password field.",
                    "Check the policy agreement checkbox.",
                    "Click 'Continue to verification'.",
                    "Review the details in the confirmation dialog.",
                    "Click 'Confirm & Create'.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nContact: 09123456789\nDistrict: District I\nBarangay: Bagong Ilog\nPassword: Test@1234\nConfirm: Test@1234\nPolicy: Checked",
                expected_result="A review confirmation dialog appears showing all entered details. After clicking 'Confirm & Create', the account is created and user proceeds to Step 3 (Verification).",
                pass_fail_criteria="Pass: Account is created and user is shown the verification page.\nFail: Account creation fails or user remains on Step 2.",
            ),
            TestCase(
                id="TC011",
                description="Submit with empty email field",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Leave the email field empty.",
                    "Fill all other fields with valid data.",
                    "Click 'Continue to verification'.",
                ],
                test_data="Email: (empty)\nContact: 09123456789\nDistrict: District I\nBarangay: Bagong Ilog\nPassword: Test@1234\nConfirm: Test@1234\nPolicy: (checked)",
                expected_result="A validation message is displayed: 'Email Address is required.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message is displayed and form does not submit.\nFail: Form submits without an email address.",
            ),
            TestCase(
                id="TC012",
                description="Submit with non-Gmail email address",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter an email that does not end with @gmail.com.",
                    "Fill all other fields with valid data.",
                    "Attempt to proceed.",
                ],
                test_data="Email: ytracetestorg@yahoo.com",
                expected_result="A validation message is displayed: 'Email must end with @gmail.com.' The email is rejected.",
                pass_fail_criteria="Pass: Non-Gmail email is rejected with the appropriate message.\nFail: Non-Gmail email is accepted.",
            ),
            TestCase(
                id="TC013",
                description="Submit with already registered email",
                preconditions="Another organization has already registered with the same email.",
                steps=[
                    "Enter an email address that is already registered in the system.",
                    "Wait for the real-time availability check to complete.",
                    "Observe the message below the email field.",
                ],
                test_data="Email: existingorg@gmail.com (already registered)",
                expected_result="After a brief availability check ('Checking email availability...'), a message is displayed: 'This email cannot be used. Please try a different email address.'",
                pass_fail_criteria="Pass: Duplicate email is detected and registration is blocked.\nFail: Duplicate email is accepted.",
            ),
            TestCase(
                id="TC014",
                description="Email availability check shows available status",
                preconditions="No account exists for the entered email.",
                steps=[
                    "Enter a valid Gmail address that is not yet registered.",
                    "Wait for the real-time availability check to complete.",
                    "Observe the message below the email field.",
                ],
                test_data="Email: freshyouth2026@gmail.com",
                expected_result="After a brief check ('Checking email availability...'), a green confirmation message is displayed: 'Email is available.'",
                pass_fail_criteria="Pass: Available email shows green confirmation message.\nFail: Available email shows an error or no status message.",
            ),
            TestCase(
                id="TC015",
                description="Submit with empty contact number",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Leave the contact number field empty.",
                    "Fill all other fields with valid data.",
                    "Attempt to proceed.",
                ],
                test_data="Contact: (empty)",
                expected_result="A validation message is displayed: 'Contact number is required.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message is displayed and form does not submit.\nFail: Form submits without a contact number.",
            ),
            TestCase(
                id="TC016",
                description="Submit with invalid contact number format",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter a contact number that does not follow the 09XXXXXXXXX format.",
                    "Attempt to proceed.",
                ],
                test_data="Contact Number: 12345678901",
                expected_result="A validation message is displayed: 'Must be 11 digits starting with 09.' Submission is blocked.",
                pass_fail_criteria="Pass: Invalid contact number is rejected with proper message.\nFail: Contact number with wrong format is accepted.",
            ),
            TestCase(
                id="TC017",
                description="Contact number with fewer than 11 digits",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter a contact number with fewer than 11 digits.",
                    "Attempt to proceed.",
                ],
                test_data="Contact Number: 0912345",
                expected_result="A validation message is displayed: 'Must be 11 digits starting with 09.' Submission is blocked.",
                pass_fail_criteria="Pass: Short contact number is rejected.\nFail: Contact number with too few digits is accepted.",
            ),
            TestCase(
                id="TC018",
                description="Contact number maximum length enforcement (11 digits)",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Attempt to type more than 11 digits into the contact number field.",
                    "Observe the input behavior.",
                ],
                test_data="Contact Number: 091234567890 (attempt 12 digits)",
                expected_result="The input field enforces a maximum length of 11 characters. Characters beyond 11 cannot be typed.",
                pass_fail_criteria="Pass: Input is strictly limited to 11 characters maximum.\nFail: More than 11 characters can be entered.",
            ),
            TestCase(
                id="TC019",
                description="Contact number accepts only numeric input",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Attempt to type alphabetic characters in the contact number field.",
                    "Observe the input behavior.",
                ],
                test_data="Contact Number: 09abc12345",
                expected_result="The input field only accepts numeric digits. Alphabetic and special characters are blocked or sanitized.",
                pass_fail_criteria="Pass: Only numeric characters are accepted.\nFail: Alphabetic or special characters are accepted in the contact number field.",
            ),
            TestCase(
                id="TC020",
                description="District field is required",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Leave the District dropdown unselected.",
                    "Fill all other fields with valid data.",
                    "Attempt to proceed.",
                ],
                test_data="District: (not selected)",
                expected_result="A validation message is displayed: 'District is required.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message is displayed for missing district.\nFail: Form submits without a district selection.",
            ),
            TestCase(
                id="TC021",
                description="Barangay dropdown is disabled until district is selected",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Observe the Barangay dropdown before selecting a district.",
                    "Select a district from the District dropdown.",
                    "Observe the Barangay dropdown after selecting a district.",
                ],
                test_data="District: (initially unselected)",
                expected_result="Before selecting a district, the Barangay dropdown shows 'Choose district first' and is disabled. After selecting a district, the Barangay dropdown becomes enabled with the corresponding barangay options.",
                pass_fail_criteria="Pass: Barangay dropdown is disabled until district is selected, then shows correct options.\nFail: Barangay dropdown is enabled without a district, or shows wrong options.",
            ),
            TestCase(
                id="TC022",
                description="Barangay options change based on district selection (District I vs District II)",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Select 'District I' from the District dropdown.",
                    "Observe the Barangay dropdown options (Bagong Ilog, Kapitolyo, Oranbo, San Antonio, Ugong, etc.).",
                    "Change district selection to 'District II'.",
                    "Observe the Barangay dropdown options (Dela Paz, Manggahan, Maybunga, Pinagbuhatan, Rosario, Santolan, etc.).",
                ],
                test_data="District I -> District II",
                expected_result="District I shows District I barangays. When changed to District II, the options dynamically switch to District II barangays.",
                pass_fail_criteria="Pass: Barangay options correctly correspond to the selected district.\nFail: Barangay options do not update or display incorrect barangays.",
            ),
            TestCase(
                id="TC023",
                description="Submit with password that does not meet policy",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter all valid fields.",
                    "Enter a password that is too short (less than 8 characters).",
                    "Attempt to proceed.",
                ],
                test_data="Password: Ab1!",
                expected_result="The password requirements checklist indicates unmet rules (e.g. '8–16 characters' shows unmet circle). Submission is blocked.",
                pass_fail_criteria="Pass: Password policy violations are indicated and form does not submit.\nFail: Form accepts a password that violates policy.",
            ),
            TestCase(
                id="TC024",
                description="Submit with mismatched confirm password",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter all valid fields.",
                    "Enter a valid password: Test@1234.",
                    "Enter a different value in Confirm Password: Different@4567.",
                    "Attempt to proceed.",
                ],
                test_data="Password: Test@1234\nConfirm: Different@4567",
                expected_result="A validation message is displayed: 'Passwords do not match.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message about password mismatch is displayed.\nFail: Form submits with mismatched passwords.",
            ),
            TestCase(
                id="TC025",
                description="Matching passwords show confirmation message",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter a valid password.",
                    "Enter the exact same password in the Confirm Password field.",
                    "Observe the area below the Confirm Password field.",
                ],
                test_data="Password: Test@1234\nConfirm: Test@1234",
                expected_result="A green message with a checkmark is displayed: 'Passwords match'.",
                pass_fail_criteria="Pass: Green 'Passwords match' confirmation is displayed.\nFail: No confirmation message is shown for matching passwords.",
            ),
            TestCase(
                id="TC026",
                description="Paste prevention on Confirm Password field",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter a valid password.",
                    "Copy the password to the clipboard.",
                    "Attempt to paste into the Confirm Password field.",
                ],
                test_data="Password: Test@1234\nConfirm: (attempt to paste)",
                expected_result="The paste action is blocked and an inline security message is displayed: 'For security, please manually retype your confirmation password.'",
                pass_fail_criteria="Pass: Paste is blocked and the security message is shown.\nFail: Paste is allowed in the Confirm Password field.",
            ),
            TestCase(
                id="TC027",
                description="Submit without checking policy agreement",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Enter all valid fields.",
                    "Leave the policy agreement checkbox unchecked.",
                    "Attempt to proceed.",
                ],
                test_data="Policy: (unchecked)",
                expected_result="A validation message is displayed: 'You must accept the Privacy Policy & Terms of Service.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message about policy agreement is displayed.\nFail: Form submits without policy agreement.",
            ),
            TestCase(
                id="TC028",
                description="Privacy Policy link opens policy content modal",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Click the 'Privacy Policy' text link within the policy agreement label.",
                    "Observe the result.",
                ],
                test_data="N/A",
                expected_result="A modal dialog opens displaying the complete Privacy Policy content with its effective date and mandate.",
                pass_fail_criteria="Pass: Privacy Policy content is accessible via the link in a modal.\nFail: Link is non-functional or content is missing.",
            ),
            TestCase(
                id="TC029",
                description="Terms of Service link opens terms content modal",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Click the 'Terms of Service' text link within the policy agreement label.",
                    "Observe the result.",
                ],
                test_data="N/A",
                expected_result="A modal dialog opens displaying the complete Terms of Service content with its effective date.",
                pass_fail_criteria="Pass: Terms of Service content is accessible via the link in a modal.\nFail: Link is non-functional or content is missing.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Organization Registration – Verification & Review Dialog
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Organization Registration – Verification & Review",
        test_cases=[
            TestCase(
                id="TC030",
                description="Review confirmation dialog displays entered details",
                preconditions="User has filled all fields correctly on Step 2.",
                steps=[
                    "Fill all fields with valid data and check the policy agreement.",
                    "Click 'Continue to verification'.",
                    "Observe the review confirmation dialog that appears.",
                ],
                test_data="All fields: Valid data",
                expected_result="A confirmation dialog appears with the heading 'Review your details' and displays a summary of: Organization name, Email, Contact number, District, Barangay, and Registration Type (Existing URN or Auto-generated). Buttons 'Go back' and 'Confirm & Create' are available.",
                pass_fail_criteria="Pass: Review dialog shows all entered details correctly.\nFail: Review dialog is missing fields or displays incorrect data.",
            ),
            TestCase(
                id="TC031",
                description="Cancel review dialog returns to form with data preserved",
                preconditions="User is viewing the review confirmation dialog.",
                steps=[
                    "Click the 'Go back' button on the review dialog.",
                    "Observe the form.",
                ],
                test_data="N/A",
                expected_result="The dialog closes and user returns to Step 2 with all previously entered data intact.",
                pass_fail_criteria="Pass: User returns to the form with data preserved.\nFail: Data is lost or user cannot dismiss the dialog.",
            ),
            TestCase(
                id="TC032",
                description="Navigate back from Step 2 to Step 1 preserves data",
                preconditions="User is on Step 2 (Account Details).",
                steps=[
                    "Click the 'Back' button on Step 2.",
                    "Observe Step 1 fields.",
                ],
                test_data="N/A",
                expected_result="User is navigated back to Step 1 (Organization Details) with previously entered organization name and URN choice preserved.",
                pass_fail_criteria="Pass: User returns to Step 1 and data is preserved.\nFail: User cannot navigate back or data is lost.",
            ),
            TestCase(
                id="TC033",
                description="Confirm & Create button shows loading state during submission",
                preconditions="User is on the review confirmation dialog with all valid data.",
                steps=[
                    "Click 'Confirm & Create' on the review dialog.",
                    "Observe the button state during submission.",
                ],
                test_data="All fields: Valid data",
                expected_result="The button displays a loading spinner with text 'Creating account…' and is disabled during the registration process.",
                pass_fail_criteria="Pass: Button shows loading state and is disabled during submission.\nFail: Button remains clickable during submission.",
            ),
            TestCase(
                id="TC034",
                description="Verification page displays after successful registration",
                preconditions="User has successfully completed Steps 1 and 2 of registration.",
                steps=[
                    "Click 'Confirm & Create' on the review dialog.",
                    "Observe the page displayed after successful account creation.",
                ],
                test_data="N/A",
                expected_result="The user is redirected to the verification page (/verify-email) displaying the heading 'Verify your email' and an instruction: 'Enter the six-digit code sent to [email address].' A 6-slot OTP input is displayed.",
                pass_fail_criteria="Pass: Verification page is displayed with OTP input and the registered email address.\nFail: User is not shown the verification page.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Email OTP Verification
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Email OTP Verification",
        test_cases=[
            TestCase(
                id="TC035",
                description="Enter invalid OTP code",
                preconditions="User is on the email verification page (/verify-email).",
                steps=[
                    "Enter an incorrect 6-digit OTP code (e.g. 000000).",
                    "Click 'Verify and Continue'.",
                ],
                test_data="OTP Code: 000000 (incorrect code)",
                expected_result="An error message is displayed: 'Incorrect verification code. Please check the code and try again.'",
                pass_fail_criteria="Pass: Error message for incorrect OTP is displayed.\nFail: Invalid OTP is accepted or no feedback shown.",
            ),
            TestCase(
                id="TC036",
                description="Enter expired OTP code",
                preconditions="User is on the email verification page. The OTP code has expired.",
                steps=[
                    "Wait for the OTP code validity window to expire.",
                    "Enter the expired 6-digit code.",
                    "Click 'Verify and Continue'.",
                ],
                test_data="OTP Code: 123456 (expired code)",
                expected_result="An error message is displayed: 'That verification code has expired. Please request a new code.'",
                pass_fail_criteria="Pass: Error message for expired OTP is displayed.\nFail: Expired OTP is accepted.",
            ),
            TestCase(
                id="TC037",
                description="Verify and Continue button disabled with incomplete OTP",
                preconditions="User is on the email verification page.",
                steps=[
                    "Enter fewer than 6 digits in the OTP input slots (e.g. 3 digits).",
                    "Observe the 'Verify and Continue' button state.",
                ],
                test_data="OTP Code: 123 (only 3 digits entered)",
                expected_result="The 'Verify and Continue' button remains disabled when the OTP code is incomplete.",
                pass_fail_criteria="Pass: Button is disabled with incomplete OTP.\nFail: Button is enabled with fewer than 6 digits.",
            ),
            TestCase(
                id="TC038",
                description="Resend verification code",
                preconditions="User is on the email verification page.",
                steps=[
                    "Click the 'Send a new code' button.",
                    "Observe the result.",
                ],
                test_data="N/A",
                expected_result="A new verification code is sent. The button changes to show a 60-second countdown: 'Send again in [N]s' and is temporarily disabled.",
                pass_fail_criteria="Pass: New code is sent and the resend button shows a countdown timer.\nFail: No confirmation or cooldown timer appears.",
            ),
            TestCase(
                id="TC039",
                description="Resend code cooldown prevents rapid resending",
                preconditions="User is on the verification page and has just clicked 'Send a new code'.",
                steps=[
                    "Click 'Send a new code' to resend the code.",
                    "Observe the button immediately after.",
                    "Attempt to click the button again during the countdown period.",
                ],
                test_data="N/A",
                expected_result="The button displays 'Send again in [N]s' with a countdown from 60 seconds. The button is disabled and cannot be clicked until the timer expires.",
                pass_fail_criteria="Pass: Button is disabled during the 60-second cooldown.\nFail: Button allows resending before cooldown expires.",
            ),
            TestCase(
                id="TC040",
                description="Password field appears if verification page is refreshed",
                preconditions="User is on the verification page and refreshes the browser.",
                steps=[
                    "Complete registration and arrive at the verification page.",
                    "Refresh the browser page.",
                    "Observe the form fields.",
                ],
                test_data="N/A",
                expected_result="After page refresh, an additional 'Account password' field appears with helper text 'Re-enter the password if this page was refreshed.' The OTP input is still shown.",
                pass_fail_criteria="Pass: Password field appears after page refresh with helper text.\nFail: Verification page crashes or loses email context.",
            ),
            TestCase(
                id="TC041",
                description="Enter valid 6-digit OTP code",
                preconditions="User is on the verification page and has received the valid 6-digit code via email.",
                steps=[
                    "Enter the correct 6-digit verification code in the OTP input slots.",
                    "Click 'Verify and Continue'.",
                ],
                test_data="OTP Code: 123456 (valid code from email)",
                expected_result="The button displays 'Verifying...'. The user is authenticated and redirected to the Organization Portal Dashboard (/dashboard).",
                pass_fail_criteria="Pass: OTP is verified successfully and user enters the dashboard.\nFail: OTP verification fails despite correct code.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Forgot Password (Anti-Enumeration Privacy)
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Forgot Password (Anti-Enumeration Privacy Protection)",
        test_cases=[
            TestCase(
                id="TC042",
                description="Request password reset with unregistered email (Anti-Enumeration)",
                preconditions="No account exists for the entered email address. User is on /reset-password.",
                steps=[
                    "Navigate to the Forgot Password / Reset Password page (/reset-password).",
                    "Enter an email that is not registered in the system.",
                    "Click 'Send Reset Link'.",
                ],
                test_data="Email: unregistered_user_2026@gmail.com",
                expected_result="To protect user privacy and prevent account enumeration, the system displays the standard generic confirmation: 'If an account exists with this email, you will receive password reset instructions shortly.' No error revealing the account does not exist is shown.",
                pass_fail_criteria="Pass: Generic privacy-preserving message is displayed.\nFail: System reveals whether the email exists or displays an error.",
            ),
            TestCase(
                id="TC043",
                description="Request password reset with registered email",
                preconditions="User has a registered organization account in the system.",
                steps=[
                    "Navigate to the Forgot Password page.",
                    "Enter the registered email address.",
                    "Click 'Send Reset Link'.",
                ],
                test_data="Email: ytracetestorg@gmail.com",
                expected_result="The system displays the success message: 'If an account exists with this email, you will receive password reset instructions shortly.' and sends the password recovery link to the registered email.",
                pass_fail_criteria="Pass: Success message is shown and reset email is triggered.\nFail: Form submission fails.",
            ),
            TestCase(
                id="TC044",
                description="Request password reset with invalid email format",
                preconditions="User is on the Forgot Password page.",
                steps=[
                    "Navigate to the Forgot Password page.",
                    "Enter an email with invalid format (missing @ or domain).",
                    "Click 'Send Reset Link'.",
                ],
                test_data="Email: invalidemailformat",
                expected_result="A validation message is displayed: 'Please enter a valid email address.' Submission is blocked.",
                pass_fail_criteria="Pass: Validation message is displayed and form does not submit.\nFail: Form submits with an invalid email.",
            ),
            TestCase(
                id="TC045",
                description="Request password reset with empty email field",
                preconditions="User is on the Forgot Password page.",
                steps=[
                    "Navigate to the Forgot Password page.",
                    "Leave the email field empty.",
                    "Click 'Send Reset Link'.",
                ],
                test_data="Email: (empty)",
                expected_result="The form does not submit. A validation message indicates that the email address is required.",
                pass_fail_criteria="Pass: Form does not submit without an email.\nFail: Form submits with an empty email.",
            ),
            TestCase(
                id="TC046",
                description="Send Reset Link button shows loading state",
                preconditions="User is on the Forgot Password page with a valid email entered.",
                steps=[
                    "Enter a valid email address.",
                    "Click 'Send Reset Link'.",
                    "Observe the button state during submission.",
                ],
                test_data="Email: ytracetestorg@gmail.com",
                expected_result="The button displays a loading spinner with text 'Sending…' and is disabled during the request.",
                pass_fail_criteria="Pass: Button shows loading state and is disabled.\nFail: Button remains clickable during submission.",
            ),
            TestCase(
                id="TC047",
                description="Send another link from success page",
                preconditions="User is on the 'Check your inbox' success confirmation state.",
                steps=[
                    "Click the 'Send another link' button.",
                    "Observe the page.",
                ],
                test_data="N/A",
                expected_result="The page returns to the input form allowing the user to enter their email address again.",
                pass_fail_criteria="Pass: User is returned to the request form to send another link.\nFail: Button is non-functional.",
            ),
            TestCase(
                id="TC048",
                description="Navigate to Sign In from Forgot Password page",
                preconditions="User is on the Forgot Password page.",
                steps=[
                    "Click the 'Remember your password? Sign in' link.",
                    "Observe the URL and page.",
                ],
                test_data="N/A",
                expected_result="User is navigated back to the Sign In page (/signin).",
                pass_fail_criteria="Pass: User is redirected to the Sign In page.\nFail: Link is non-functional or redirects to wrong page.",
            ),
        ],
    )
    groups.append(g6)

    # =========================================================================
    # Group 7: Reset Password Update
    # =========================================================================
    g7 = TestGroup(
        number=7,
        title="Reset Password Update",
        test_cases=[
            TestCase(
                id="TC049",
                description="Reset password with valid link and valid new password",
                preconditions="User has received a valid password reset recovery link via email.",
                steps=[
                    "Click the password reset link from the email.",
                    "Observe that the 'Create a new password' page is displayed.",
                    "Enter a new password meeting all requirements (8–16 characters, uppercase, lowercase, number, special character).",
                    "Manually re-enter the new password in the Confirm Password field.",
                    "Click 'Update Password'.",
                ],
                test_data="New Password: NewTest@1234\nConfirm: NewTest@1234",
                expected_result="A success screen appears with a green checkmark, heading 'Password updated', and subtitle 'Your new password is ready. Sign in again to continue.' A 'Continue to Sign In' button is displayed.",
                pass_fail_criteria="Pass: Password is updated and success screen is shown.\nFail: Password reset fails or no success screen is shown.",
            ),
            TestCase(
                id="TC050",
                description="Reset password with expired or invalid recovery link",
                preconditions="The password reset link has expired or has already been used.",
                steps=[
                    "Click an expired or invalid password reset link from email.",
                    "Observe the page displayed.",
                ],
                test_data="Reset link: (expired / invalid link)",
                expected_result="A page is displayed with heading 'Reset link unavailable' and subtitle 'Request a new password reset link and try again.' A 'Request New Link' button is shown.",
                pass_fail_criteria="Pass: Expired link page is displayed with option to request a new link.\nFail: The reset form is shown despite an expired link.",
            ),
            TestCase(
                id="TC051",
                description="Reset password with password that does not meet policy",
                preconditions="User opens the Reset Password page from a valid recovery link.",
                steps=[
                    "Enter a new password that violates policy (e.g. no uppercase letter: 'simplepass1!').",
                    "Observe the password requirements checklist.",
                    "Attempt to click 'Update Password'.",
                ],
                test_data="New Password: simplepass1!\nConfirm: simplepass1!",
                expected_result="The password requirements checklist indicates unmet rules (e.g. uppercase letter unmet). The 'Update Password' button is disabled.",
                pass_fail_criteria="Pass: Unmet requirements are indicated and button is disabled.\nFail: Button is enabled despite policy violations.",
            ),
            TestCase(
                id="TC052",
                description="Reset password with mismatched confirm password",
                preconditions="User is on the Reset Password page with a valid recovery link.",
                steps=[
                    "Enter a valid new password in 'New Password'.",
                    "Enter a different password in 'Confirm Password'.",
                    "Observe the validation indicator.",
                ],
                test_data="New Password: NewTest@1234\nConfirm: DifferentPass@1234",
                expected_result="A red message is displayed: 'Passwords do not match.' The 'Update Password' button is disabled.",
                pass_fail_criteria="Pass: Mismatch message is displayed and button is disabled.\nFail: Form allows submission with mismatched passwords.",
            ),
            TestCase(
                id="TC053",
                description="Reset password with empty new password field",
                preconditions="User is on the Reset Password page with a valid recovery link.",
                steps=[
                    "Leave the New Password field empty.",
                    "Observe the 'Update Password' button state.",
                ],
                test_data="New Password: (empty)",
                expected_result="The 'Update Password' button is disabled when the password field is empty.",
                pass_fail_criteria="Pass: Button is disabled with empty password.\nFail: Button is enabled without a password.",
            ),
            TestCase(
                id="TC054",
                description="Paste prevention on Reset Password confirm field",
                preconditions="User is on the Reset Password page with a valid link.",
                steps=[
                    "Enter a valid new password.",
                    "Copy the password to clipboard.",
                    "Attempt to paste into the Confirm Password field.",
                ],
                test_data="New Password: NewTest@1234\nConfirm: (attempt to paste)",
                expected_result="The paste action is prevented and a security message is displayed: 'For security, please manually retype your confirmation password.'",
                pass_fail_criteria="Pass: Paste is blocked and security message is shown.\nFail: Paste is allowed in the confirm field.",
            ),
            TestCase(
                id="TC055",
                description="Update Password button shows loading state",
                preconditions="User is on the Reset Password page with valid data entered.",
                steps=[
                    "Enter valid matching new passwords.",
                    "Click 'Update Password'.",
                    "Observe the button state during submission.",
                ],
                test_data="New Password: NewTest@1234\nConfirm: NewTest@1234",
                expected_result="The button displays a loading spinner with text 'Updating…' and is disabled during the process.",
                pass_fail_criteria="Pass: Button shows loading state and is disabled.\nFail: Button remains clickable during submission.",
            ),
            TestCase(
                id="TC056",
                description="Login using new password after successful reset",
                preconditions="User has successfully reset their password to NewTest@1234.",
                steps=[
                    "Click 'Continue to Sign In' on the success screen.",
                    "Enter the registered email.",
                    "Enter the new password: NewTest@1234.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: NewTest@1234",
                expected_result="User is successfully authenticated with the new password and redirected to the Organization Portal Dashboard.",
                pass_fail_criteria="Pass: User logs in with the new password.\nFail: User cannot log in with the new password.",
            ),
            TestCase(
                id="TC057",
                description="Login using old password after successful reset",
                preconditions="User has successfully reset their password from OldTest@1234 to NewTest@1234.",
                steps=[
                    "Navigate to the Sign In page.",
                    "Enter the registered email.",
                    "Enter the old password: OldTest@1234.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: OldTest@1234 (old password)",
                expected_result="An error message is displayed: 'Invalid login credentials.' The old password is no longer valid.",
                pass_fail_criteria="Pass: Old password is rejected and error message is displayed.\nFail: User can still log in with the old password.",
            ),
        ],
    )
    groups.append(g7)

    # =========================================================================
    # Group 8: Password Policy & Live Checklist
    # =========================================================================
    g8 = TestGroup(
        number=8,
        title="Password Policy Verification & Live Checklist",
        test_cases=[
            TestCase(
                id="TC058",
                description="Password too short (less than 8 characters)",
                preconditions="User is on a page with a password field (Registration or Reset).",
                steps=[
                    "Enter a password with fewer than 8 characters that meets other rules.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Test@1",
                expected_result="The '8–16 characters' requirement shows an unmet indicator circle. Requirements that are met show green checkmarks.",
                pass_fail_criteria="Pass: Minimum length rule is flagged as unmet.\nFail: Password with fewer than 8 characters is accepted.",
            ),
            TestCase(
                id="TC059",
                description="Password too long (more than 16 characters enforcement)",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Attempt to enter a password with more than 16 characters.",
                    "Observe the input behavior.",
                ],
                test_data="Password: Test@1234567890AB (attempt 17+ chars)",
                expected_result="The password input field enforces a maximum length of 16 characters. Characters beyond 16 cannot be entered.",
                pass_fail_criteria="Pass: Input is limited to 16 characters maximum.\nFail: More than 16 characters can be entered.",
            ),
            TestCase(
                id="TC060",
                description="Password missing uppercase letter",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password without any uppercase letter.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: test@1234",
                expected_result="The 'Contains an uppercase letter (A–Z)' requirement shows an unmet indicator circle.",
                pass_fail_criteria="Pass: Uppercase letter rule is flagged as unmet.\nFail: Rule is shown as met without an uppercase letter.",
            ),
            TestCase(
                id="TC061",
                description="Password missing lowercase letter",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password without any lowercase letter.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: TEST@1234",
                expected_result="The 'Contains a lowercase letter (a–z)' requirement shows an unmet indicator circle.",
                pass_fail_criteria="Pass: Lowercase letter rule is flagged as unmet.\nFail: Rule is shown as met without a lowercase letter.",
            ),
            TestCase(
                id="TC062",
                description="Password missing number",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password without any numeric digit.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Test@abcd",
                expected_result="The 'Contains a number (0–9)' requirement shows an unmet indicator circle.",
                pass_fail_criteria="Pass: Number rule is flagged as unmet.\nFail: Rule is shown as met without a number.",
            ),
            TestCase(
                id="TC063",
                description="Password missing special character",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password without any special character.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Test1234",
                expected_result="The 'Contains a special character' requirement shows an unmet indicator circle.",
                pass_fail_criteria="Pass: Special character rule is flagged as unmet.\nFail: Rule is shown as met without a special character.",
            ),
            TestCase(
                id="TC064",
                description="Password policy live validation updates dynamically as user types",
                preconditions="User focuses on the password field.",
                steps=[
                    "Focus on the password field.",
                    "Type characters sequentially: 's' -> 'sE' -> 'sE1' -> 'sE1@' -> 'sE1@abcd'.",
                    "Observe the requirements checklist dynamically updating.",
                ],
                test_data="Type sequentially: 's' -> 'sE' -> 'sE1' -> 'sE1@' -> 'sE1@abcd'",
                expected_result="The requirements checklist updates in real time with each keystroke, turning indicators green as respective criteria are satisfied.",
                pass_fail_criteria="Pass: Checklist updates in real time as the user types.\nFail: Checklist does not update until the field loses focus.",
            ),
            TestCase(
                id="TC065",
                description="Password exactly 8 characters (lower boundary)",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password with exactly 8 characters meeting all other criteria.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Test@123",
                expected_result="All five requirements display green checkmarks. The password is valid and accepted.",
                pass_fail_criteria="Pass: Password with exactly 8 characters is accepted.\nFail: Password with exactly 8 characters is rejected.",
            ),
            TestCase(
                id="TC066",
                description="Password with 7 characters (one below minimum boundary)",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password with exactly 7 characters.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Secur@1",
                expected_result="The '8–16 characters' rule shows an unmet indicator. The password is not accepted.",
                pass_fail_criteria="Pass: 7-character password is correctly flagged as too short.\nFail: 7-character password is accepted.",
            ),
            TestCase(
                id="TC067",
                description="Password exactly 16 characters (upper boundary)",
                preconditions="User is on a page with a password field.",
                steps=[
                    "Enter a password with exactly 16 characters meeting all requirements.",
                    "Observe the requirements checklist.",
                ],
                test_data="Password: Secure@123456789",
                expected_result="All five requirements display green checkmarks. The password is valid and accepted.",
                pass_fail_criteria="Pass: Password with exactly 16 characters is accepted.\nFail: Password with 16 characters is rejected.",
            ),
        ],
    )
    groups.append(g8)

    # =========================================================================
    # Group 9: Email Validation Rules
    # =========================================================================
    g9 = TestGroup(
        number=9,
        title="Email Validation Rules",
        test_cases=[
            TestCase(
                id="TC068",
                description="Email missing domain",
                preconditions="User is on a form with an email field.",
                steps=[
                    "Enter an email without a domain after the '@' symbol (e.g. 'user@').",
                    "Attempt to proceed.",
                ],
                test_data="Email: user@",
                expected_result="A validation message 'Email must end with @gmail.com.' is displayed.",
                pass_fail_criteria="Pass: Validation message is displayed for email without domain.\nFail: Email without domain is accepted.",
            ),
            TestCase(
                id="TC069",
                description="Email with multiple @ symbols",
                preconditions="User is on a form with an email field.",
                steps=[
                    "Enter an email containing multiple '@' symbols.",
                    "Attempt to proceed.",
                ],
                test_data="Email: user@@gmail.com",
                expected_result="A validation message 'Email must end with @gmail.com.' is displayed.",
                pass_fail_criteria="Pass: Validation message is displayed for malformed email.\nFail: Malformed email is accepted.",
            ),
            TestCase(
                id="TC070",
                description="Email with spaces",
                preconditions="User is on a form with an email field.",
                steps=[
                    "Enter an email with internal spaces: 'user @gmail.com'.",
                    "Attempt to proceed.",
                ],
                test_data="Email: user @gmail.com",
                expected_result="A validation message 'Email must end with @gmail.com.' is displayed.",
                pass_fail_criteria="Pass: Validation message is displayed for email with internal spaces.\nFail: Email with spaces is accepted.",
            ),
            TestCase(
                id="TC071",
                description="Uppercase email treated as case-insensitive on sign in",
                preconditions="An account exists using the registered email ytracetestorg@gmail.com.",
                steps=[
                    "Navigate to the Sign In page (/signin).",
                    "Enter the registered email entirely in uppercase: 'YTRACETESTORG@GMAIL.COM'.",
                    "Enter the correct password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: YTRACETESTORG@GMAIL.COM\nPassword: NewTest@1234",
                expected_result="The system treats the email as case-insensitive and authenticates the user successfully into the dashboard.",
                pass_fail_criteria="Pass: Uppercase email is accepted and matched correctly.\nFail: Uppercase email is rejected as not found.",
            ),
        ],
    )
    groups.append(g9)

    # =========================================================================
    # Group 10: Organization Sign In
    # =========================================================================
    g10 = TestGroup(
        number=10,
        title="Organization Sign In",
        test_cases=[
            TestCase(
                id="TC072",
                description="Sign in with valid organization credentials",
                preconditions="User has a verified and active organization account.",
                steps=[
                    "Navigate to the Sign In page (/signin).",
                    "Enter the registered email in the 'Email address' field.",
                    "Enter the correct password in the 'Password' field.",
                    "Click the 'Sign In' button.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: NewTest@1234",
                expected_result="The 'Sign In' button displays 'Signing in…' with a loading spinner. User is authenticated and redirected to the Organization Portal Dashboard (/dashboard). A toast notification appears: 'Signed In – Welcome back.'",
                pass_fail_criteria="Pass: User is redirected to the dashboard and the welcome toast appears.\nFail: User remains on Sign In or receives an error.",
            ),
            TestCase(
                id="TC073",
                description="Sign in with invalid password",
                preconditions="User has a verified organization account.",
                steps=[
                    "Navigate to the Sign In page.",
                    "Enter the valid registered email address.",
                    "Enter an incorrect password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: WrongPassword!99",
                expected_result="An inline error message is displayed: 'Invalid login credentials.' User remains on the Sign In page.",
                pass_fail_criteria="Pass: Error message 'Invalid login credentials.' is displayed.\nFail: User is authenticated or no feedback appears.",
            ),
            TestCase(
                id="TC074",
                description="Sign in with unverified email address",
                preconditions="Account was registered but email OTP verification was not completed.",
                steps=[
                    "Navigate to the Sign In page.",
                    "Enter the unverified email and password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: unverifiedorg@gmail.com\nPassword: Test@1234",
                expected_result="An inline message is displayed: 'Your email address is not verified yet. Please complete verification before signing in.'",
                pass_fail_criteria="Pass: Unverified email message is displayed.\nFail: Unverified user enters dashboard or generic error shown.",
            ),
            TestCase(
                id="TC075",
                description="Sign in with invalid email format",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Enter an email without a valid format (e.g. missing '@').",
                    "Enter any password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: invalidemailformat\nPassword: NewTest@1234",
                expected_result="A validation message is displayed indicating the email format is invalid. Submission is blocked.",
                pass_fail_criteria="Pass: Validation message is displayed and sign-in attempt is blocked.\nFail: The form submits with an invalid email format.",
            ),
            TestCase(
                id="TC076",
                description="Sign in with non-existing email",
                preconditions="No account exists for the entered email address.",
                steps=[
                    "Enter an email address that is not registered in the system.",
                    "Enter any password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email: nonexisting_org_999@gmail.com\nPassword: NewTest@1234",
                expected_result="An inline error message is displayed: 'Invalid login credentials.' User remains on the Sign In page.",
                pass_fail_criteria="Pass: Error message is displayed and user is not authenticated.\nFail: User is authenticated or unexpected error occurs.",
            ),
            TestCase(
                id="TC077",
                description="Sign in with empty email field",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Leave the 'Email address' field empty.",
                    "Enter a password.",
                    "Observe the 'Sign In' button state.",
                ],
                test_data="Email: (empty)\nPassword: NewTest@1234",
                expected_result="The 'Sign In' button remains disabled because the email field is empty. Submission is blocked.",
                pass_fail_criteria="Pass: Form does not submit and Sign In button is disabled.\nFail: Form submits without an email address.",
            ),
            TestCase(
                id="TC078",
                description="Sign in with empty password field",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Enter a valid email address.",
                    "Leave the 'Password' field empty.",
                    "Observe the 'Sign In' button state.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: (empty)",
                expected_result="The 'Sign In' button remains disabled because the password field is empty. Submission is blocked.",
                pass_fail_criteria="Pass: Form does not submit and Sign In button is disabled.\nFail: Form submits without a password.",
            ),
            TestCase(
                id="TC079",
                description="Sign in with email containing leading/trailing spaces (auto-trimmed)",
                preconditions="User has a verified account with email ytracetestorg@gmail.com.",
                steps=[
                    "Enter the email with leading and trailing spaces: '  ytracetestorg@gmail.com  '.",
                    "Enter the correct password.",
                    "Click 'Sign In'.",
                ],
                test_data="Email:   ytracetestorg@gmail.com  \nPassword: NewTest@1234",
                expected_result="The system automatically trims the whitespace and authenticates the user successfully into the dashboard.",
                pass_fail_criteria="Pass: User is authenticated despite leading/trailing spaces.\nFail: User receives an error due to spaces in the email.",
            ),
            TestCase(
                id="TC080",
                description="Toggle password visibility on Sign In page",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Enter a password in the 'Password' field.",
                    "Click the eye icon button ('Show password').",
                    "Observe the password text.",
                    "Click the eye icon button again ('Hide password').",
                ],
                test_data="Password: NewTest@1234",
                expected_result="Clicking the eye icon reveals the password text in plain text. Clicking it again masks the password with dots/asterisks.",
                pass_fail_criteria="Pass: Password visibility toggles correctly between shown and hidden.\nFail: Eye icon does not function or password state does not change.",
            ),
            TestCase(
                id="TC081",
                description="Google OAuth sign in button",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Click the 'Continue with Google' button.",
                    "Observe the browser behavior.",
                ],
                test_data="N/A",
                expected_result="The browser redirects to the Google OAuth consent screen for Y-TRACE authentication.",
                pass_fail_criteria="Pass: Google OAuth authorization flow is initiated.\nFail: Button is non-functional or errors out.",
            ),
            TestCase(
                id="TC082",
                description="Navigation links on Sign In page",
                preconditions="User is on the Sign In page.",
                steps=[
                    "Click 'Forgot password?' -> verify navigation to /reset-password.",
                    "Return to Sign In, click 'Don't have an account? Create one' -> verify navigation to /signup.",
                    "Return to Sign In, click '<- Back to home' -> verify navigation to /.",
                ],
                test_data="N/A",
                expected_result="Each link navigates to its respective destination page accurately.",
                pass_fail_criteria="Pass: All navigation links redirect to the correct routes.\nFail: Any link is non-functional or routes incorrectly.",
            ),
        ],
    )
    groups.append(g10)

    # =========================================================================
    # Group 11: Session Management & Route Protection
    # =========================================================================
    g11 = TestGroup(
        number=11,
        title="Session Management & Route Protection",
        test_cases=[
            TestCase(
                id="TC083",
                description="Authenticated user can access protected portal routes",
                preconditions="User is authenticated and on the portal dashboard.",
                steps=[
                    "Sign in with valid organization credentials.",
                    "Navigate to protected routes: /organization-profile, /document-submission, /budget-request, /liquidation-reporting, /ypop.",
                    "Observe whether each page loads.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: NewTest@1234",
                expected_result="Each protected route loads successfully and renders the appropriate authenticated workspace without redirecting to Sign In.",
                pass_fail_criteria="Pass: Protected routes are accessible after authentication.\nFail: Protected routes redirect to Sign In or show error.",
            ),
            TestCase(
                id="TC084",
                description="Unauthenticated user is redirected from protected routes",
                preconditions="User is not authenticated (no active session).",
                steps=[
                    "Open a clean browser window or private window.",
                    "Attempt to navigate directly to /dashboard or /budget-request.",
                    "Observe the result.",
                ],
                test_data="URL: /dashboard",
                expected_result="The system blocks unauthenticated access and immediately redirects the user to the Sign In page (/signin).",
                pass_fail_criteria="Pass: Unauthenticated user is redirected to Sign In.\nFail: Protected workspace is accessible without authentication.",
            ),
            TestCase(
                id="TC085",
                description="Sign out terminates session and redirects to Sign In",
                preconditions="User is currently authenticated in the portal.",
                steps=[
                    "Click the user profile avatar/menu in the portal header.",
                    "Click 'Sign Out'.",
                    "Observe the redirect and authentication state.",
                ],
                test_data="N/A",
                expected_result="The user session is cleared and the browser redirects to the Sign In page (/signin). The portal header is no longer accessible.",
                pass_fail_criteria="Pass: User is signed out and redirected to Sign In.\nFail: User remains authenticated or is not redirected.",
            ),
            TestCase(
                id="TC086",
                description="Signed-out user cannot access protected routes via browser back button",
                preconditions="User has just signed out from the portal.",
                steps=[
                    "Sign out from the portal.",
                    "Click the browser's Back button.",
                    "Observe the result.",
                ],
                test_data="N/A",
                expected_result="The browser does not reload the protected portal state; the system redirects the user to the Sign In page.",
                pass_fail_criteria="Pass: Protected routes cannot be accessed via Back button after signing out.\nFail: Portal remains accessible via browser Back button.",
            ),
            TestCase(
                id="TC087",
                description="Session persists after browser page refresh",
                preconditions="User is authenticated on the portal dashboard.",
                steps=[
                    "Sign in with valid credentials.",
                    "Verify successful authentication (dashboard is displayed).",
                    "Refresh the browser page (F5 / Ctrl+R).",
                    "Observe whether the user remains authenticated.",
                ],
                test_data="N/A",
                expected_result="After refreshing the page, the user remains authenticated and the portal dashboard continues to display without requiring re-login.",
                pass_fail_criteria="Pass: Session persists across page refresh.\nFail: User is logged out or redirected to Sign In after refresh.",
            ),
            TestCase(
                id="TC088",
                description="Session persists after closing and reopening browser tab",
                preconditions="User is authenticated.",
                steps=[
                    "Sign in with valid credentials.",
                    "Close the browser tab (not the entire browser application).",
                    "Open a new tab and navigate to /dashboard.",
                    "Observe whether the user is still authenticated.",
                ],
                test_data="N/A",
                expected_result="The user remains authenticated and the portal dashboard loads without requiring re-authentication.",
                pass_fail_criteria="Pass: Session persists across browser tabs.\nFail: User is prompted to sign in again.",
            ),
            TestCase(
                id="TC089",
                description="Password recovery session isolates user from portal access",
                preconditions="User is in an active password recovery session (opened link from reset email).",
                steps=[
                    "Click a valid password reset link from email.",
                    "While on the reset password page, attempt to navigate to /dashboard or /budget-request.",
                    "Observe the result.",
                ],
                test_data="URL: /dashboard",
                expected_result="The system redirects the user back to /reset-password. Access to portal features remains blocked until the password is updated or recovery is explicitly canceled.",
                pass_fail_criteria="Pass: Recovery session isolates user to password reset flow only.\nFail: User can access authenticated portal features during password recovery.",
            ),
            TestCase(
                id="TC090",
                description="Simultaneous multiple browser tab sign-in sync",
                preconditions="User has valid credentials.",
                steps=[
                    "Open the Sign In page in Tab 1 and Tab 2.",
                    "Sign in with valid credentials on Tab 1.",
                    "Switch to Tab 2 and refresh.",
                    "Observe whether Tab 2 reflects the authenticated state.",
                ],
                test_data="Email: ytracetestorg@gmail.com\nPassword: NewTest@1234",
                expected_result="Tab 2 recognizes the authenticated session and redirects to the portal dashboard without requiring a second sign-in.",
                pass_fail_criteria="Pass: Authenticated session is shared across tabs.\nFail: Tab 2 does not reflect the authenticated state.",
            ),
            TestCase(
                id="TC091",
                description="Whitespace-only input in required text fields",
                preconditions="User is on a form with required text fields.",
                steps=[
                    "Enter only whitespace (spaces) in a required text field.",
                    "Attempt to submit the form.",
                ],
                test_data="Field value: '   ' (spaces only)",
                expected_result="A validation message is displayed indicating the field is required. Whitespace-only input is treated as empty.",
                pass_fail_criteria="Pass: Whitespace-only input is treated as empty and validation is triggered.\nFail: Whitespace-only input is accepted as valid.",
            ),
            TestCase(
                id="TC092",
                description="Very long organization name boundary handling",
                preconditions="User is on Step 1 (Organization Details).",
                steps=[
                    "Enter an extremely long organization name (e.g. 300 characters of repeated text).",
                    "Click 'Continue to account details'.",
                ],
                test_data="Organization Name: 300 characters of valid text",
                expected_result="The system handles the long name gracefully (either accepts within maximum bounds or displays a length constraint message) without UI distortion, freezing, or crash.",
                pass_fail_criteria="Pass: System handles long input gracefully.\nFail: System crashes, freezes, or produces unhandled error.",
            ),
        ],
    )
    groups.append(g11)

    # =========================================================================
    # Group 12: Responsive Web Authentication Across Viewports
    # =========================================================================
    g12 = TestGroup(
        number=12,
        title="Responsive Web Authentication Across Viewports",
        test_cases=[
            TestCase(
                id="TC093",
                description="Verify Authentication Views (Sign In, Sign Up, Password Reset) on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /signin on desktop browser.",
                    "Verify card layout, Pasig City / PCYDO branding logos, form fields, and submit button.",
                    "Navigate to /signup and /reset-password.",
                    "Verify desktop layout aesthetics, tab navigation order, and visual focus states.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Authentication cards center cleanly with ample margins, crisp municipal branding, legible typography, and no clipped input labels. Tab navigation cycles seamlessly through all fields.",
                pass_fail_criteria="Pass: Desktop layout displays cleanly with centered auth card and accessible controls.\nFail: Card is distorted, branding is misaligned, or form inputs overflow.",
            ),
            TestCase(
                id="TC094",
                description="Verify Authentication Views on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /signin, /signup, and /reset-password on tablet viewport.",
                    "Interact with organization name, email, password, and URN input fields.",
                    "Verify virtual keyboard appearance does not obscure active input or submit button.",
                    "Verify interactive controls remain large enough and sufficiently separated for reliable touch interaction.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Auth card adapts to tablet width. Interactive controls for inputs, checkboxes, and buttons remain comfortably accessible for touch input. Page scrolls smoothly when virtual keyboard is active.",
                pass_fail_criteria="Pass: Tablet layout adapts smoothly without horizontal overflow or obscured buttons.\nFail: Content clipped horizontally, or inputs inaccessible when keyboard is active.",
            ),
            TestCase(
                id="TC095",
                description="Verify Authentication Views on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone).",
                steps=[
                    "Navigate to /signin, /signup, and /reset-password on mobile phone viewport.",
                    "Verify single-column stacked layout, full-width buttons, and font legibility (>=16px to prevent iOS auto-zoom).",
                    "Verify password visibility toggle icon accessibility on touch.",
                    "Submit invalid credentials and verify mobile toast/error alert renders within viewport.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Authentication pages display in a responsive single-column layout. Inputs span full usable width with proper padding. Submit button is easily reachable in the thumb zone, and error alerts remain visible without horizontal scrolling.",
                pass_fail_criteria="Pass: Mobile phone layout is fully responsive, touch-friendly, and has zero horizontal overflow.\nFail: Horizontal scroll bar appears, text is truncated, or buttons are unclickable.",
            ),
        ],
    )
    groups.append(g12)

    # =========================================================================
    # Group 13: Google Account Authentication & Organization Onboarding Flow
    # =========================================================================
    g13 = TestGroup(
        number=13,
        title="Google Account Authentication & Organization Onboarding Flow",
        test_cases=[
            TestCase(
                id="TC096",
                description="Google account authentication entry to /google-onboarding for first-time user",
                preconditions="User authenticates via Google OAuth for the first time without an existing organization profile.",
                steps=[
                    "Navigate to /signin.",
                    "Click 'Continue with Google' button.",
                    "Authenticate using valid Google account credentials.",
                    "Observe post-authentication redirect.",
                ],
                test_data="Google OAuth Credentials (first-time organization user).",
                expected_result="Google authentication completes successfully. System identifies missing organization profile and redirects user directly to /google-onboarding. User session is active.",
                pass_fail_criteria="Pass: First-time Google user is routed cleanly to /google-onboarding with active session.\nFail: User is stuck on sign-in, redirected to generic error, or logged out.",
            ),
            TestCase(
                id="TC097",
                description="Brand-new Google user completes organization onboarding profile save without authorization error",
                preconditions="User is on /google-onboarding with authenticated session.",
                steps=[
                    "Fill in Organization Name, Major Classification, Contact Details, District, Barangay, Head of Organization details, and Centers of Youth Participation.",
                    "Click 'Complete Organization Onboarding' / 'Save Profile'.",
                    "Observe save execution and toast feedback.",
                ],
                test_data="Organization: 'Pasig Innovators Youth Council', District: 1, Barangay: Kapasigan.",
                expected_result="Organization profile saves successfully without authorization failure. A success toast confirms onboarding completion and user is redirected to Dashboard.",
                pass_fail_criteria="Pass: Initial profile saves cleanly without permission errors.\nFail: Profile save fails with permission error.",
            ),
            TestCase(
                id="TC098",
                description="Local onboarding draft persists when browser tab is switched and user returns",
                preconditions="User is entering onboarding form data on /google-onboarding.",
                steps=[
                    "Enter partial organization information (e.g. Organization Name, Head of Organization name, Contact number).",
                    "Switch to a different browser tab and perform actions for 30 seconds.",
                    "Return to the /google-onboarding browser tab.",
                    "Observe whether entered form data remains intact.",
                ],
                test_data="Form fields: Organization Name, Head of Organization, Contact Number.",
                expected_result="All entered form fields remain intact. Local onboarding draft persistence preserves unsaved user input across tab switching.",
                pass_fail_criteria="Pass: Form values are preserved when switching back to tab.\nFail: Form resets or loses entered values.",
            ),
            TestCase(
                id="TC099",
                description="Local onboarding draft persists through page and component remounts",
                preconditions="User has partially filled onboarding form on /google-onboarding.",
                steps=[
                    "Enter form data across multiple sections.",
                    "Navigate internally or cause component remount, then return to /google-onboarding.",
                    "Inspect form fields.",
                ],
                test_data="Partially filled onboarding fields.",
                expected_result="Onboarding workspace restores all previously entered form fields from local storage draft state.",
                pass_fail_criteria="Pass: Draft data restores reliably upon remount.\nFail: Form clears upon remount.",
            ),
            TestCase(
                id="TC100",
                description="Failed onboarding profile save preserves entered form values without wiping inputs",
                preconditions="User is submitting onboarding form on /google-onboarding while simulated network disruption occurs.",
                steps=[
                    "Fill complete onboarding form.",
                    "Trigger form submission during transient network disruption.",
                    "Observe error feedback and form field values.",
                ],
                test_data="Complete onboarding data under simulated network failure.",
                expected_result="Error notification is displayed informing user of network failure. Crucially, all entered form fields remain populated without being wiped or reset, allowing instant retry.",
                pass_fail_criteria="Pass: Entered values are preserved after submission failure.\nFail: Form inputs are erased on error.",
            ),
            TestCase(
                id="TC101",
                description="Successful onboarding profile save cleans up local draft storage appropriately",
                preconditions="User completes and submits onboarding profile on /google-onboarding.",
                steps=[
                    "Submit complete onboarding form.",
                    "Verify successful transition to Dashboard.",
                    "Inspect local draft storage state.",
                ],
                test_data="Successful onboarding submission.",
                expected_result="Onboarding profile saves successfully and the temporary local draft key is cleanly purged, preventing obsolete draft data from resurfacing.",
                pass_fail_criteria="Pass: Local onboarding draft is purged after successful profile save.\nFail: Stale draft remains active.",
            ),
            TestCase(
                id="TC102",
                description="Official PCYDO URN is not prematurely displayed during onboarding completion",
                preconditions="User completes organization onboarding and lands on the Organization Dashboard.",
                steps=[
                    "Complete onboarding form submission and proceed to Dashboard.",
                    "Inspect the Organization Dashboard header and profile summary cards.",
                    "Navigate to Registration Compliance to view document submission status.",
                    "Observe the displayed organization identification and registration state.",
                ],
                test_data="Newly onboarded organization.",
                expected_result="The organization enters the pending registration flow. The official PCYDO URN is not prematurely displayed or assigned on the Dashboard or profile summary (showing pending/unregistered status until accreditation verification). The user can freely proceed toward normal document submission and registration compliance.",
                pass_fail_criteria="Pass: Official URN is not prematurely displayed and user can continue registration compliance workflow.\nFail: Official URN is prematurely displayed prior to registration verification.",
            ),
            TestCase(
                id="TC103",
                description="Completed Google onboarding transitions to Dashboard with immediate 100% profile completion status",
                preconditions="User completes all onboarding profile sections and lands on /dashboard.",
                steps=[
                    "Observe Dashboard profile completeness widget immediately upon landing.",
                    "Verify there is no stale 'Complete your profile' warning banner.",
                ],
                test_data="Newly onboarded user landing on /dashboard.",
                expected_result="Dashboard immediately displays 100% profile completeness and verified leadership details. No stale 'Incomplete Profile' warning banner is rendered.",
                pass_fail_criteria="Pass: Dashboard reflects 100% completeness immediately upon onboarding completion.\nFail: Stale warning banner or delayed 0% completeness is shown.",
            ),
        ],
    )
    groups.append(g13)

    return groups


def main():
    groups = get_section_01_groups()
    output_filename = "01_YTRACE_Authentication_Access_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="01",
        section_title="Authentication & Access Control Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


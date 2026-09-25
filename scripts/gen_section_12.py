"""
Generator for Section 12: Public Budget Transparency Portal Black-Box Test Cases.
Document: 12_YTRACE_Public_Budget_Transparency_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_12_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Public Page Loading, Fiscal Year Selector & Privacy Isolation
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Public Page Loading, Fiscal Year Selector & Privacy Isolation",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify public access to Budget Transparency page without authentication",
                preconditions="Browser is unauthenticated (Incognito/Guest mode, no user session).",
                steps=[
                    "Navigate to http://localhost:5173/budget-transparency.",
                    "Observe page loading and layout.",
                ],
                test_data="URL: /budget-transparency.",
                expected_result="Page loads immediately without login prompts or redirection. Public navigation bar, Hero banner 'Budget Transparency: Civic Fiscal Openness', and summary metrics are displayed.",
                pass_fail_criteria="Pass: Page is freely accessible to the public without authentication.\nFail: System redirects to login page.",
            ),
            TestCase(
                id="TC002",
                description="Verify Fiscal Year dropdown selector displays available years",
                preconditions="Public user is on the Budget Transparency page.",
                steps=[
                    "Locate Fiscal Year selector dropdown.",
                    "Click dropdown trigger.",
                    "Observe listed years (e.g. 2026, 2025, 2024).",
                ],
                test_data="Fiscal year dropdown.",
                expected_result="Dropdown opens listing configured fiscal years in descending order. Active year is checked or highlighted.",
                pass_fail_criteria="Pass: Dropdown displays available fiscal years accurately.\nFail: Dropdown is empty or missing.",
            ),
            TestCase(
                id="TC003",
                description="Verify switching Fiscal Year reloads public financial metrics",
                preconditions="Public user selects a previous fiscal year (e.g. FY 2025).",
                steps=[
                    "Select FY 2025 from the dropdown.",
                    "Observe KPI values, progression bar, and category breakdown.",
                ],
                test_data="Select FY 2025.",
                expected_result="All metrics update dynamically to reflect the historical appropriations and expenditures of FY 2025 without full-page reload.",
                pass_fail_criteria="Pass: Metrics update cleanly to the selected fiscal year.\nFail: Metrics fail to change or show error.",
            ),
            TestCase(
                id="TC004",
                description="Verify complete isolation: No administrative action controls are visible",
                preconditions="Public user views Budget Transparency portal.",
                steps=[
                    "Inspect all cards, headers, and toolbars on the Public Budget Transparency page.",
                    "Search for buttons such as 'Configure Budget', 'Approve', 'Reject', 'Release', or 'Delete'.",
                ],
                test_data="Public Budget Transparency page.",
                expected_result="No administrative buttons, edit triggers, or configuration modals are present. The interface is strictly read-only for public citizens.",
                pass_fail_criteria="Pass: Administrative controls are completely absent from public view.\nFail: Admin controls or triggers are exposed.",
            ),
            TestCase(
                id="TC005",
                description="Verify data privacy: No sensitive banking or private recipient details are exposed",
                preconditions="Budget has released funds to organizations with check/disbursement numbers.",
                steps=[
                    "Inspect all public financial cards and category tables.",
                    "Verify absence of internal bank account numbers, officer contact numbers, or internal voucher IDs.",
                ],
                test_data="Public data inspection.",
                expected_result="Data is aggregated at the municipal and category level. No private bank credentials or sensitive officer contacts are exposed.",
                pass_fail_criteria="Pass: Sensitive organization banking and personal details are protected.\nFail: Private details leaked in public view.",
            ),
            TestCase(
                id="TC006",
                description="Verify navigation to Budget Transparency via Public Navigation Bar",
                preconditions="Public user is on the Y-TRACE landing page (/).",
                steps=[
                    "Locate 'Budget Transparency' in the main navigation menu.",
                    "Click the link.",
                    "Verify navigation destination.",
                ],
                test_data="Navbar link 'Budget Transparency'.",
                expected_result="User is navigated smoothly to /budget-transparency with active link highlighted in navbar.",
                pass_fail_criteria="Pass: Navbar links directly to public budget transparency.\nFail: Link broken or inactive.",
            ),
            TestCase(
                id="TC007",
                description="Verify official record source and 'Last Updated' timestamp display",
                preconditions="Public user is viewing active fiscal year overview.",
                steps=[
                    "Inspect the metadata subtitle beneath the main title.",
                    "Observe source attribution and last updated date.",
                ],
                test_data="Public metadata display.",
                expected_result="Subtitle clearly states: 'Official LYDO Records · Updated [Date] · Sourced from Pasig City Youth Development Office'.",
                pass_fail_criteria="Pass: Official source attribution and timestamp are visible.\nFail: Source attribution missing.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Public Financial Metrics, Progression Pipeline & Calculations
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Public Financial Metrics, Progression Pipeline & Calculations",
        test_cases=[
            TestCase(
                id="TC008",
                description="Verify Authorized Annual Appropriation KPI card rendering",
                preconditions="Fiscal year 2026 has an authorized municipal allocation of ₱5,000,000.00.",
                steps=[
                    "Inspect the first KPI card 'Authorized Annual Appropriation'.",
                    "Verify formatted currency display.",
                ],
                test_data="Allocation: ₱5,000,000.00.",
                expected_result="Card displays formatted value '₱5,000,000.00' and compact notation '₱5.0M'. Explanatory label indicates total legislated youth fund for the year.",
                pass_fail_criteria="Pass: Authorized annual allocation displays accurately.\nFail: Amount incorrect or blank.",
            ),
            TestCase(
                id="TC009",
                description="Verify Approved Youth Grants KPI card reflects Approved Amount",
                preconditions="Total approved budget requests sum to ₱1,200,000.00.",
                steps=[
                    "Inspect 'Approved Youth Grants' KPI card.",
                    "Verify amount and commitment percentage.",
                ],
                test_data="Approved: ₱1,200,000.00 (24% of ₱5,000,000.00).",
                expected_result="Card displays '₱1,200,000.00' with subtitle indicating '24% of Authorized Budget Committed'.",
                pass_fail_criteria="Pass: Approved grants amount and percentage display correctly.\nFail: Amount incorrect.",
            ),
            TestCase(
                id="TC010",
                description="Verify Disbursed / Released Grants KPI card",
                preconditions="Released funds sum to ₱800,000.00.",
                steps=[
                    "Inspect 'Disbursed Grants' KPI card.",
                    "Observe value and disbursement ratio.",
                ],
                test_data="Released: ₱800,000.00.",
                expected_result="Card displays '₱800,000.00' with ratio indicating 66.7% of approved funds have been disbursed to youth organizations.",
                pass_fail_criteria="Pass: Disbursed grants amount displays accurately.\nFail: Disbursed amount incorrect.",
            ),
            TestCase(
                id="TC011",
                description="Verify Audited Liquidated Funds KPI card",
                preconditions="Liquidated reports sum to ₱500,000.00.",
                steps=[
                    "Inspect 'Audited Liquidations' KPI card.",
                    "Observe clearance rate.",
                ],
                test_data="Liquidated: ₱500,000.00.",
                expected_result="Card displays '₱500,000.00' with clearance subtitle indicating 62.5% of released funds have completed full audit liquidation.",
                pass_fail_criteria="Pass: Liquidated funds KPI displays accurate total.\nFail: Metric incorrect.",
            ),
            TestCase(
                id="TC012",
                description="Verify Available Headroom calculation strictly equals Appropriation minus Approved",
                preconditions="Appropriation = ₱5,000,000.00; Approved = ₱1,200,000.00.",
                steps=[
                    "Inspect 'Remaining Available Funds' / Headroom KPI card.",
                    "Calculate expected balance: ₱5,000,000 - ₱1,200,000 = ₱3,800,000.00.",
                ],
                test_data="Expected Headroom: ₱3,800,000.00.",
                expected_result="Remaining Available Funds card displays EXACTLY ₱3,800,000.00 (76.0% remaining). Headroom correctly accounts for approved commitments before disbursement.",
                pass_fail_criteria="Pass: Public headroom matches Appropriation minus Approved.\nFail: Headroom calculation is incorrect.",
            ),
            TestCase(
                id="TC013",
                description="Verify Public Pipeline Progression Bar rendering",
                preconditions="Appropriation = ₱5.0M. Liquidated = 10%, Active in Field = 6%, Pending Disbursement = 8%, Remaining Headroom = 76%.",
                steps=[
                    "Inspect the horizontal segmented pipeline bar.",
                    "Verify colors for Liquidated (Green), Active in Field (Blue), Pending Disbursement (Amber), and Available (Slate/Light Blue).",
                    "Hover over each segment.",
                ],
                test_data="Public pipeline segments.",
                expected_result="Segments display in logical lifecycle sequence totaling 100%. Tooltips show peso amounts and percentage of total fund.",
                pass_fail_criteria="Pass: Pipeline progression bar renders accurately with interactive tooltips.\nFail: Bar does not render or segments misalign.",
            ),
            TestCase(
                id="TC014",
                description="Verify Public Budget Deficit Warning banner when commitments exceed appropriation",
                preconditions="Approved commitments reach ₱5,200,000.00 against a ₱5,000,000.00 budget.",
                steps=[
                    "Observe public budget overview.",
                    "Inspect warning banner and headroom card.",
                ],
                test_data="Deficit: ₱200,000.00.",
                expected_result="A prominent amber/red advisory banner appears informing citizens: 'Approved youth grant commitments currently exceed annual appropriation by ₱200,000.00 pending supplemental budget authorization.'",
                pass_fail_criteria="Pass: Deficit is transparently disclosed with explanatory advisory banner.\nFail: Deficit is concealed or displays negative values incorrectly.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Purpose Category Distribution, Responsive Layout & Edge States
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Purpose Category Distribution, Responsive Layout & Edge States",
        test_cases=[
            TestCase(
                id="TC015",
                description="Verify Purpose Category Distribution breakdown display",
                preconditions="Approved grants exist across categories: Leadership, Health & Sports, Education.",
                steps=[
                    "Scroll to 'Funding Distribution by Purpose Category' section.",
                    "Inspect category cards / chart slices.",
                    "Verify category names, approved grant totals, and percentage of fund.",
                ],
                test_data="Category breakdown.",
                expected_result="Categories are listed with approved peso amounts, count of funded youth activities, and percentage share of total grants.",
                pass_fail_criteria="Pass: Category distribution section presents accurate figures.\nFail: Categories or amounts missing.",
            ),
            TestCase(
                id="TC016",
                description="Verify category color consistency with administrative portal",
                preconditions="Category 'Health & Sports' has an established color coding in the system design.",
                steps=[
                    "Inspect color badge on 'Health & Sports' card.",
                    "Verify color styling matches system category palette.",
                ],
                test_data="Category colors.",
                expected_result="Category badges utilize unified system color palette ensuring visual consistency across public and administrative portals.",
                pass_fail_criteria="Pass: Category colors match system palette.\nFail: Inconsistent arbitrary colors used.",
            ),
            TestCase(
                id="TC017",
                description="Verify Zero-Data state for fiscal year with no appropriations or requests",
                preconditions="Select a newly initialized fiscal year with 0 budget and 0 requests.",
                steps=[
                    "Select FY 2028 from dropdown.",
                    "Observe page response.",
                ],
                test_data="FY 2028 (empty).",
                expected_result="Overview renders an empty state illustration: 'No Budget Appropriations on Record for FY 2028.' Financial metrics display ₱0.00 or '—' without UI errors.",
                pass_fail_criteria="Pass: Empty year displays graceful zero-data notice without crashing.\nFail: Page crashes or displays NaN.",
            ),
            TestCase(
                id="TC018",
                description="Verify responsive layout on mobile viewport (width: 375px)",
                preconditions="Public user opens /budget-transparency on a smartphone.",
                steps=[
                    "Set browser viewport to 375px width (mobile).",
                    "Scroll through page from Hero to Footer.",
                    "Inspect KPI card stacking, progression bar, and category breakdown.",
                ],
                test_data="Viewport width: 375px.",
                expected_result="All elements stack vertically without horizontal scrollbar. Typography scales appropriately, numbers remain fully readable, and dropdown selector remains easily operable.",
                pass_fail_criteria="Pass: Mobile view is completely responsive and usable.\nFail: Layout overflows horizontally or cuts off text.",
            ),
            TestCase(
                id="TC019",
                description="Verify responsive layout on tablet viewport (width: 768px)",
                preconditions="Public user opens /budget-transparency on an iPad / tablet.",
                steps=[
                    "Set viewport to 768px width.",
                    "Inspect KPI grid (2 columns) and category distribution.",
                ],
                test_data="Viewport width: 768px.",
                expected_result="KPI cards format in a balanced 2x2 grid layout. Progression bar and category distributions fit comfortably.",
                pass_fail_criteria="Pass: Tablet layout adapts cleanly.\nFail: Layout misaligns on tablet.",
            ),
            TestCase(
                id="TC020",
                description="Verify browser refresh maintains selected Fiscal Year",
                preconditions="User switches Fiscal Year to FY 2025.",
                steps=[
                    "Perform browser refresh (Ctrl + R).",
                    "Observe active fiscal year upon reload.",
                ],
                test_data="Selected year: 2025.",
                expected_result="Page restores or maintains the selected fiscal year smoothly without resetting to default current year unexpectedly.",
                pass_fail_criteria="Pass: Selected fiscal year persists or defaults predictably.\nFail: Refresh causes unexpected blank page.",
            ),
            TestCase(
                id="TC021",
                description="Verify SEO and accessibility metadata on Public Budget Transparency page",
                preconditions="Public page is loaded.",
                steps=[
                    "Inspect HTML document head title and meta tags.",
                    "Verify page title contains 'Budget Transparency | Y-TRACE'.",
                    "Verify single primary <h1> heading on page.",
                ],
                test_data="Page HTML inspection.",
                expected_result="Document title is 'Budget Transparency | Y-TRACE'. Meta description accurately summarizes municipal fund transparency. Exactly one <h1> heading is present.",
                pass_fail_criteria="Pass: Title, meta description, and <h1> heading comply with accessibility and SEO.\nFail: Missing title or invalid heading hierarchy.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 6: Responsive Public Transparency Portal Across Viewports
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Responsive Public Transparency Portal Across Viewports",
        test_cases=[
            TestCase(
                id="TC022",
                description="Verify Public Budget Transparency on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /budget-transparency on desktop browser.",
                    "Verify hero municipal appropriation banner, interactive SVG financial charts, and side-by-side funding sources breakdown table.",
                    "Interact with chart slices and verify hover tooltips render smoothly without displacement.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop transparency view spans clean full-width layout. Charts render side-by-side with crisp vector graphics. Financial metric cards display legible large currency figures.",
                pass_fail_criteria="Pass: Desktop layout renders all financial sections with generous margins.\nFail: Visual elements collide or charts overflow horizontally.",
            ),
            TestCase(
                id="TC023",
                description="Verify Public Budget Transparency on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /budget-transparency on tablet viewport.",
                    "Verify 2-column KPI grid and vertical chart stacking.",
                    "Test touch interactions on category distribution cards and fiscal year dropdown.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Financial metrics format in an even 2x2 grid. Touch interactions trigger tooltips accurately. Funding source table scrolls cleanly without breaking page layout.",
                pass_fail_criteria="Pass: Tablet layout adapts cleanly with accessible touch controls.\nFail: Horizontal overflow or unreadable chart tooltips.",
            ),
            TestCase(
                id="TC024",
                description="Verify Public Budget Transparency on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /budget-transparency on mobile phone viewport.",
                    "Verify single-column vertical stack of financial metric cards.",
                    "Verify mobile responsive chart scaling and touch-friendly fiscal year dropdown.",
                    "Inspect table and ensure no horizontal overflow occurs across entire page.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Page elements stack vertically with zero horizontal scroll. Financial metrics are easily readable (>=16px font for currency). Charts scale to mobile width cleanly.",
                pass_fail_criteria="Pass: Mobile phone layout is fully responsive with zero horizontal overflow.\nFail: Page causes horizontal scrolling or chart graphics are cut off.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_12_groups()
    output_filename = "12_YTRACE_Public_Budget_Transparency_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="12",
        section_title="Public Budget Transparency Portal Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

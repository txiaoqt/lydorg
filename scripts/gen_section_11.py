"""
Generator for Section 11: Budget Monitoring & Financial Tracking Black-Box Test Cases.
Document: 11_YTRACE_Budget_Monitoring_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_11_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Annual Budget Configuration & Overview Financial KPIs
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Annual Budget Configuration & Overview Financial KPIs",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify unconfigured annual budget zero-data state display",
                preconditions="A new fiscal year (e.g. 2027) is selected that has no annual allocation configured yet.",
                steps=[
                    "Navigate to Admin Portal -> Budget Monitoring.",
                    "Select FY 2027 from the Fiscal Year dropdown.",
                    "Observe page layout and KPI cards.",
                ],
                test_data="Fiscal Year: 2027 (unconfigured).",
                expected_result="System displays an informational setup banner: 'Annual Budget Not Configured for FY 2027. Click Configure Budget to set total municipal allocation.' Total Budget displays '—', and 'Configure Budget' button is highlighted.",
                pass_fail_criteria="Pass: Unconfigured fiscal year renders clear onboarding prompt without crashing.\nFail: Zero-data state displays errors or NaN values.",
            ),
            TestCase(
                id="TC002",
                description="Verify opening Annual Budget Configuration modal",
                preconditions="Admin is on Budget Monitoring overview.",
                steps=[
                    "Click 'Configure Budget' / 'Settings' button.",
                    "Inspect the modal dialog inputs: Fiscal Year, Total Allocation Amount, Ordinance / Resolution Reference, and Notes.",
                ],
                test_data="N/A",
                expected_result="Configuration modal opens with fiscal year pre-selected. Input fields for Total Allocation and Ordinance Reference are ready for entry.",
                pass_fail_criteria="Pass: Configuration modal opens cleanly with expected fields.\nFail: Modal fails to open.",
            ),
            TestCase(
                id="TC003",
                description="Verify input validation on Annual Budget Configuration (rejection of zero/negative/letters)",
                preconditions="Configuration modal is open.",
                steps=[
                    "Enter Total Allocation: 0 or -100000.",
                    "Attempt to save.",
                    "Enter non-numeric characters.",
                    "Attempt to save.",
                ],
                test_data="Invalid amounts: 0, -100000, 'abc'.",
                expected_result="System blocks saving and displays validation error: 'Total allocation amount must be a positive number.'",
                pass_fail_criteria="Pass: Invalid and non-positive budget amounts are rejected.\nFail: Non-positive budget allocation saves.",
            ),
            TestCase(
                id="TC004",
                description="Verify successful configuration of Annual Budget Allocation",
                preconditions="Configuration modal is open with FY 2026 selected.",
                steps=[
                    "Enter Total Allocation Amount: 5000000 (₱5,000,000.00).",
                    "Enter Ordinance Reference: 'City Ordinance No. 12-2026'.",
                    "Enter Notes: 'Official Pasig City Youth Development Fund'.",
                    "Click 'Save Configuration'.",
                ],
                test_data="Total: ₱5,000,000.00; Ordinance: 'City Ordinance No. 12-2026'.",
                expected_result="Modal closes. Toast confirms 'Annual budget configuration saved.' Total FY Budget KPI card updates immediately to '₱5,000,000.00'. Ordinance reference is displayed in the header subtitle.",
                pass_fail_criteria="Pass: Annual budget is saved and reflected in dashboard KPIs.\nFail: Configuration fails to save or display.",
            ),
            TestCase(
                id="TC005",
                description="Verify switching between multiple configured Fiscal Years",
                preconditions="Allocations exist for FY 2025 (₱4,000,000) and FY 2026 (₱5,000,000).",
                steps=[
                    "Click Fiscal Year dropdown.",
                    "Select FY 2025.",
                    "Observe KPI values and category breakdown.",
                    "Switch back to FY 2026.",
                ],
                test_data="Fiscal years: 2025, 2026.",
                expected_result="Dashboard recalculates metrics seamlessly for the selected fiscal year. FY 2025 displays ₱4.0M baseline; FY 2026 displays ₱5.0M baseline.",
                pass_fail_criteria="Pass: Switching fiscal years updates all metrics and charts accurately.\nFail: Data fails to update or mixes records between years.",
            ),
            TestCase(
                id="TC006",
                description="Verify update/edit of existing Annual Budget Allocation",
                preconditions="FY 2026 has an existing allocation of ₱5,000,000.00.",
                steps=[
                    "Click 'Configure Budget' icon.",
                    "Update Total Allocation Amount to: 6000000 (₱6,000,000.00).",
                    "Save changes.",
                ],
                test_data="Updated allocation: ₱6,000,000.00.",
                expected_result="Total Budget KPI updates to ₱6,000,000.00. Headroom and utilization percentages recalculate instantly against the new ₱6.0M baseline.",
                pass_fail_criteria="Pass: Allocation edit updates baseline and dependent calculations.\nFail: Edit fails or creates duplicate record.",
            ),
            TestCase(
                id="TC007",
                description="Verify Approved Budget KPI card summation across approved requests",
                preconditions="3 budget requests have been approved with Approved Amounts: ₱80,000.00, ₱65,000.00, and ₱95,000.00 (Total: ₱240,000.00).",
                steps=[
                    "Inspect 'Approved Budget' KPI card.",
                    "Verify total amount and count of approved projects.",
                ],
                test_data="Approved requests totaling ₱240,000.00.",
                expected_result="Card displays '₱240,000.00' with subtitle indicating '3 approved project activities'.",
                pass_fail_criteria="Pass: Approved budget aggregates accurately.\nFail: Discrepancy in approved budget total.",
            ),
            TestCase(
                id="TC008",
                description="Verify Released Budget KPI card summation across disbursed requests",
                preconditions="Of the 3 approved requests, 2 have been released with Released Amounts: ₱80,000.00 and ₱65,000.00 (Total: ₱145,000.00).",
                steps=[
                    "Inspect 'Released Budget' KPI card.",
                ],
                test_data="Released disbursements totaling ₱145,000.00.",
                expected_result="Card displays '₱145,000.00' and shows percentage of total budget disbursed.",
                pass_fail_criteria="Pass: Released budget calculates accurately.\nFail: Discrepancy in released total.",
            ),
            TestCase(
                id="TC009",
                description="Verify Liquidated Budget KPI card summation across completed liquidations",
                preconditions="1 project has completed liquidation for ₱80,000.00.",
                steps=[
                    "Inspect 'Liquidated Budget' KPI card.",
                ],
                test_data="Liquidated total: ₱80,000.00.",
                expected_result="Card displays '₱80,000.00' and shows percentage of released funds liquidated.",
                pass_fail_criteria="Pass: Liquidated budget calculates accurately.\nFail: Discrepancy in liquidated total.",
            ),
            TestCase(
                id="TC010",
                description="Verify Remaining Headroom calculation (Positive balance / Healthy status)",
                preconditions="Total Budget: ₱5,000,000.00, Approved Budget: ₱240,000.00.",
                steps=[
                    "Inspect 'Remaining Headroom' KPI card.",
                    "Verify remaining amount and badge color.",
                ],
                test_data="5,000,000 - 240,000 = 4,760,000.",
                expected_result="Card displays '₱4,760,000.00' (95.2% available) with a green 'Healthy' status badge.",
                pass_fail_criteria="Pass: Positive headroom calculates accurately with green badge.\nFail: Miscalculation in remaining headroom.",
            ),
            TestCase(
                id="TC011",
                description="Verify Remaining Headroom DEFICIT calculation (Negative balance / Deficit alert)",
                preconditions="Total Budget: ₱5,000,000.00. Approved Budget exceeds total at ₱5,200,000.00.",
                steps=[
                    "Inspect 'Remaining Headroom' KPI card.",
                    "Verify negative amount and warning indicator.",
                ],
                test_data="Deficit: -₱200,000.00.",
                expected_result="Card switches to red 'Deficit' badge displaying '-₱200,000.00' (Overcommitted by ₱200,000.00) alerting administrators of funding overrun.",
                pass_fail_criteria="Pass: Negative headroom displays explicit Deficit badge and amount.\nFail: Negative balance renders as positive or crashes.",
            ),
            TestCase(
                id="TC012",
                description="Verify Triple-Tier Linear Progression Bar (Approved, Released, Liquidated)",
                preconditions="Total: ₱5.0M, Approved: ₱500K (10%), Released: ₱300K (6%), Liquidated: ₱150K (3%).",
                steps=[
                    "Inspect the horizontal Budget Utilization Progression Bar.",
                    "Verify color segmentation and tooltips for Liquidated (Green), Released (Blue), and Approved (Amber/Teal).",
                ],
                test_data="Tier percentages: 3%, 6%, 10%.",
                expected_result="Progression bar renders proportional color segments clearly illustrating the conversion of approved funds to released disbursements and finalized liquidations.",
                pass_fail_criteria="Pass: Progression bar accurately segments utilization stages.\nFail: Bar segments do not match metrics.",
            ),
            TestCase(
                id="TC013",
                description="Verify Quick Action navigation links to Operational Queues",
                preconditions="Admin is on Budget Monitoring overview.",
                steps=[
                    "Click 'Review Pending Requests' quick link.",
                    "Verify navigation to /admin/budget-utilization.",
                    "Navigate back and click 'Review Liquidations' quick link.",
                    "Verify navigation to /admin/liquidation-monitoring.",
                ],
                test_data="Quick action buttons.",
                expected_result="Links navigate directly to the respective operational pipelines with active review queues.",
                pass_fail_criteria="Pass: Quick actions route correctly to operational pipelines.\nFail: Links are broken.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Purpose Category Breakdown & Donut Visualizations
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Purpose Category Breakdown & Donut Visualizations",
        test_cases=[
            TestCase(
                id="TC014",
                description="Verify Purpose Category Donut Chart slice calculation and tooltip display",
                preconditions="Approved requests belong to 3 categories: Leadership & Governance (₱50,000), Health & Wellness (₱30,000), Education (₱20,000). Total: ₱100,000.00.",
                steps=[
                    "Inspect the Purpose Category Donut Chart.",
                    "Verify slice proportions: Leadership (50%), Health (30%), Education (20%).",
                    "Hover over each chart slice.",
                ],
                test_data="3 categories totaling ₱100,000.00.",
                expected_result="Donut chart renders 3 colored slices. Center text displays total approved budget '₱100,000'. Tooltip on hover shows category name, approved amount, and percentage.",
                pass_fail_criteria="Pass: Donut chart slices and tooltips reflect category distribution.\nFail: Slices do not match amounts or chart fails to render.",
            ),
            TestCase(
                id="TC015",
                description="Verify Donut Chart Top-5 consolidation with 'Other Categories' slice",
                preconditions="Approved requests span 8 different categories.",
                steps=[
                    "Observe the Donut Chart and legend.",
                    "Count visible slices in the chart.",
                ],
                test_data="8 distinct categories.",
                expected_result="Chart renders the top 5 largest categories individually and cleanly consolidates the remaining 3 categories into a single 'Other Categories' slice to maintain visual clarity.",
                pass_fail_criteria="Pass: Slices beyond top 5 consolidate gracefully into 'Other Categories'.\nFail: Chart renders overcrowded illegible slices.",
            ),
            TestCase(
                id="TC016",
                description="Verify percentage display formatting (<1% vs rounded whole numbers)",
                preconditions="A category has approved amount of ₱500 out of a ₱1,000,000 budget (0.05%). Another has ₱250,000 (25%).",
                steps=[
                    "Inspect category breakdown legend.",
                    "Verify percentage text for the 0.05% category and the 25% category.",
                ],
                test_data="0.05% and 25%.",
                expected_result="The 0.05% category displays '<1%' (not '0%'). The 25% category displays '25%'.",
                pass_fail_criteria="Pass: Small non-zero percentages display as '<1%'.\nFail: Small percentages display as 0%.",
            ),
            TestCase(
                id="TC017",
                description="Verify mathematical consistency between Donut Chart center total and Category Table sum",
                preconditions="Multiple categories have approved funds.",
                steps=[
                    "Sum the 'Approved Amount' column across all rows in the Category Breakdown table.",
                    "Compare the sum to the total displayed at the center of the Donut Chart and the main KPI card.",
                ],
                test_data="Category breakdown list.",
                expected_result="The sum of all table rows exactly matches the Donut Chart center value and the Approved Budget KPI card with zero discrepancy.",
                pass_fail_criteria="Pass: Category breakdown sum matches KPI total to the peso.\nFail: Discrepancy between chart and table sums.",
            ),
            TestCase(
                id="TC018",
                description="Verify search and pagination in Category Breakdown table",
                preconditions="Category breakdown table lists multiple categories.",
                steps=[
                    "Type 'Health' in the category table search input.",
                    "Observe filtered rows.",
                    "Clear search and test pagination chevrons ('<' and '>').",
                ],
                test_data="Search: 'Health'.",
                expected_result="Search filters matching category. Pagination chevrons advance and rewind through category records smoothly.",
                pass_fail_criteria="Pass: Search and pagination operate cleanly on category table.\nFail: Filtering or pagination fails.",
            ),
            TestCase(
                id="TC019",
                description="Verify PCYDO YORP Watermark and Table visual transparency aesthetics",
                preconditions="Admin views Budget Monitoring tables (Category Breakdown and Barangay Allocation).",
                steps=[
                    "Inspect Budget Monitoring table UI and container visual design.",
                    "Verify the Budget Monitoring table displays the expected records and columns.",
                    "Verify PCYDO YORP watermark shows subtly through the transparent table body.",
                    "Verify table header rows remain opaque and crisp.",
                    "Verify borders and text typography are fully legible with no duplicate or overlapping watermark artifacts.",
                ],
                test_data="Budget Monitoring table UI.",
                expected_result="PCYDO YORP watermark renders seamlessly in the background. Table content, headers, numbers, and badges maintain crisp contrast and high readability without visual collision.",
                pass_fail_criteria="Pass: Watermark styling displays cleanly with readable table typography.\nFail: Watermark overlaps awkwardly or text contrast is degraded.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Allocation by Barangay & District Hierarchy
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Allocation by Barangay & District Hierarchy",
        test_cases=[
            TestCase(
                id="TC020",
                description="Verify navigating to 'Allocation by Barangay' tab and summary bar",
                preconditions="Admin is on Budget Monitoring module.",
                steps=[
                    "Click 'Allocation by Barangay' tab.",
                    "Inspect summary bar: District 1 vs District 2 total allocations.",
                ],
                test_data="Navigation to Barangay tab.",
                expected_result="Tab displays District 1 and District 2 aggregated allocations, total active barangays, and the comprehensive barangay table.",
                pass_fail_criteria="Pass: Barangay tab loads with district summary bar.\nFail: Tab fails to load.",
            ),
            TestCase(
                id="TC021",
                description="Verify Barangay Table columns (District, Barangay, Org Count, Approved, Released, Liquidated, Share)",
                preconditions="Barangay allocation table is displayed.",
                steps=[
                    "Inspect table column headers.",
                    "Verify columns: District, Barangay, Active Orgs, Approved Budget, Released Funds, Liquidated Funds, and Share of Total Budget (%).",
                ],
                test_data="Barangay table columns.",
                expected_result="All 7 columns render with proper numeric and percentage formatting.",
                pass_fail_criteria="Pass: All barangay table columns render accurately.\nFail: Columns missing or formatted incorrectly.",
            ),
            TestCase(
                id="TC022",
                description="Verify District filter dropdown (District 1, District 2, All Districts)",
                preconditions="Barangays listed across both districts.",
                steps=[
                    "Select 'District 1' from district dropdown.",
                    "Verify only District 1 barangays (e.g. San Nicolas, Kapasigan, Malinao) are listed.",
                    "Select 'District 2'.",
                    "Verify only District 2 barangays (e.g. Pinagbuhatan, Rosario) are listed.",
                    "Select 'All Districts'.",
                ],
                test_data="District filter dropdown.",
                expected_result="Table filters dynamically to the selected district and restores all 30 barangays when 'All Districts' is selected.",
                pass_fail_criteria="Pass: District filter isolates barangays accurately.\nFail: Filtering fails or displays wrong district.",
            ),
            TestCase(
                id="TC023",
                description="Verify Barangay search input",
                preconditions="Barangay table is open.",
                steps=[
                    "Type 'San Nicolas' in the search bar.",
                    "Observe table results.",
                    "Clear search input.",
                ],
                test_data="Search: 'San Nicolas'.",
                expected_result="Table instantly narrows to 'San Nicolas' row with its district badge, org count, and financial totals.",
                pass_fail_criteria="Pass: Search filters barangay accurately.\nFail: Search fails.",
            ),
            TestCase(
                id="TC024",
                description="Verify sorting barangays by Approved Budget and Share percentage",
                preconditions="Barangay table contains financial data.",
                steps=[
                    "Click 'Approved Budget' column header.",
                    "Observe sort direction (Descending -> Ascending).",
                    "Click 'Share (%)' column header.",
                ],
                test_data="Column header sort clicks.",
                expected_result="Table reorders dynamically by the clicked column with visual sort indicator chevron.",
                pass_fail_criteria="Pass: Table sorts accurately on numeric columns.\nFail: Sorting fails or produces wrong order.",
            ),
            TestCase(
                id="TC025",
                description="Verify expanding Barangay row to view Organization breakdown",
                preconditions="Barangay 'San Nicolas' has 2 accredited youth organizations with approved requests.",
                steps=[
                    "Click on the 'San Nicolas' row or click its expand chevron ('>').",
                    "Inspect the sub-table / nested drawer.",
                ],
                test_data="Barangay expand action.",
                expected_result="Row expands to reveal nested table listing organizations within San Nicolas: Organization Name, Activity Title, Approved Amount, and Current Liquidation Status.",
                pass_fail_criteria="Pass: Nested organization breakdown renders cleanly.\nFail: Expansion fails or shows blank sub-table.",
            ),
            TestCase(
                id="TC026",
                description="Verify zero-utilization display for barangays with 0 budget requests",
                preconditions="A barangay has 0 approved budget requests.",
                steps=[
                    "Locate the inactive barangay row in the table.",
                    "Inspect Approved, Released, and Liquidated cells.",
                ],
                test_data="Inactive barangay row.",
                expected_result="Cells display '₱0.00' and Share displays '0.0%'. Expand chevron indicates '0 organizations'.",
                pass_fail_criteria="Pass: Inactive barangay renders clean zero-data state.\nFail: Renders NaN or blank.",
            ),
            TestCase(
                id="TC027",
                description="Verify mathematical consistency: Sum of Barangay Allocations equals Total Approved Budget",
                preconditions="All barangay rows have calculated totals.",
                steps=[
                    "Sum the 'Approved Budget' column across all 30 Pasig City barangays.",
                    "Compare sum to the main 'Approved Budget' KPI card.",
                ],
                test_data="All barangays sum.",
                expected_result="Sum of all barangay allocations exactly equals the municipal Approved Budget total with zero centavo discrepancy.",
                pass_fail_criteria="Pass: Geographic sum matches municipal KPI total.\nFail: Discrepancy between barangay sum and total.",
            ),
            TestCase(
                id="TC028",
                description="Verify Barangay Allocation table pagination",
                preconditions="Table displays 10 barangays per page.",
                steps=[
                    "Click next page chevron ('>').",
                    "Observe page 2 barangays.",
                    "Click previous page chevron ('<').",
                ],
                test_data="Pagination controls.",
                expected_result="Pagination advances and rewinds cleanly without page jumps.",
                pass_fail_criteria="Pass: Pagination functions smoothly.\nFail: Pagination buttons fail.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Public Preview & Snapshot Configuration Page
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Public Preview & Snapshot Configuration Page",
        test_cases=[
            TestCase(
                id="TC029",
                description="Verify navigating to 'Public Preview / Configuration' view",
                preconditions="Administrator is on Budget Monitoring module.",
                steps=[
                    "Click 'Public Preview / Configuration' tab or button.",
                    "Observe view transition to PublicBudgetSnapshotConfigPage.",
                ],
                test_data="Navigation to snapshot configuration.",
                expected_result="PublicBudgetSnapshotConfigPage loads displaying Fiscal Year Source Management, Component Visibility Toggles, General Settings, and Preview Public Page action.",
                pass_fail_criteria="Pass: Configuration page loads with complete controls.\nFail: Page fails to load.",
            ),
            TestCase(
                id="TC030",
                description="Verify Fiscal Year selector for Budget Sources in Configuration Page",
                preconditions="Configuration page is open.",
                steps=[
                    "Click Fiscal Year dropdown in Sources section.",
                    "Select previous or future fiscal year.",
                    "Observe source rows reload.",
                ],
                test_data="Fiscal year selector.",
                expected_result="Sources list reloads to show funding sources registered for the selected fiscal year.",
                pass_fail_criteria="Pass: Budget sources reload according to selected year.\nFail: Sources fail to update.",
            ),
            TestCase(
                id="TC031",
                description="Verify adding a new Funding Source row (Amount & Purpose)",
                preconditions="Configuration page is open.",
                steps=[
                    "Click '+ Add Source' button.",
                    "Inspect the newly added row.",
                    "Enter Amount: 1500000 and Purpose: 'Special Youth Empowerment Grant'.",
                    "Observe Total FY Budget calculation.",
                ],
                test_data="Amount: 1,500,000; Purpose: 'Special Youth Empowerment Grant'.",
                expected_result="New row is added to the list. Total FY Budget recalculates dynamically by adding ₱1,500,000.00 to the total.",
                pass_fail_criteria="Pass: Source row is added and total updates dynamically.\nFail: Add source fails or total does not update.",
            ),
            TestCase(
                id="TC032",
                description="Verify removing a Funding Source row",
                preconditions="Multiple funding sources exist.",
                steps=[
                    "Click 'Remove' (X icon) on a funding source row.",
                    "Observe row removal and updated Total FY Budget.",
                ],
                test_data="Remove source action.",
                expected_result="Target row is removed. Total FY Budget decrements immediately.",
                pass_fail_criteria="Pass: Row is removed and total recalculates.\nFail: Row cannot be removed.",
            ),
            TestCase(
                id="TC033",
                description="Verify toggling Component Visibility switches",
                preconditions="Configuration page is open.",
                steps=[
                    "Locate Component Visibility Toggles section.",
                    "Toggle 'Budget Utilization Progress' switch.",
                    "Toggle 'Show Allocation Breakdown' switch.",
                    "Observe switch state updates.",
                ],
                test_data="Visibility switches.",
                expected_result="Switches toggle between active (checked) and inactive (unchecked) smoothly.",
                pass_fail_criteria="Pass: Switches toggle smoothly.\nFail: Switches fail to toggle.",
            ),
            TestCase(
                id="TC034",
                description="Verify 'Allow Fiscal Year Switch' public toggle",
                preconditions="Configuration page is open.",
                steps=[
                    "Locate 'Allow Fiscal Year Switch' switch under General Settings.",
                    "Toggle switch to ON.",
                    "Toggle switch to OFF.",
                ],
                test_data="Fiscal year switch toggle.",
                expected_result="Switch updates cleanly to enable or disable public visitors from browsing historical fiscal years.",
                pass_fail_criteria="Pass: Toggle state changes cleanly.\nFail: Toggle is locked or unresponsive.",
            ),
            TestCase(
                id="TC035",
                description="Verify Default Fiscal Year selector setting",
                preconditions="Configuration page is open.",
                steps=[
                    "Click 'Default Fiscal Year' select dropdown.",
                    "Select a different year as default.",
                ],
                test_data="Default FY select.",
                expected_result="Selected year becomes the default landing fiscal year for public visitors.",
                pass_fail_criteria="Pass: Default fiscal year is selected.\nFail: Selection fails.",
            ),
            TestCase(
                id="TC036",
                description="Verify 'Save Snapshot Configuration' action",
                preconditions="Modifications made to sources and toggles.",
                steps=[
                    "Click 'Save Configuration' button.",
                    "Observe toast feedback.",
                ],
                test_data="Save action.",
                expected_result="Configuration is saved. Toast confirms: 'Public budget settings saved successfully.'",
                pass_fail_criteria="Pass: Configuration saves with success toast.\nFail: Save fails or throws error.",
            ),
            TestCase(
                id="TC037",
                description="Verify 'Preview Public Page' action link opens public portal in new tab",
                preconditions="Configuration page is open.",
                steps=[
                    "Click 'Preview Public Page' / External link button.",
                    "Observe browser window/tab behavior.",
                ],
                test_data="External preview link.",
                expected_result="Browser opens `/budget-transparency` in a new tab displaying the public view with active configuration settings applied.",
                pass_fail_criteria="Pass: Link opens public budget transparency page in new tab.\nFail: Link is broken.",
            ),
            TestCase(
                id="TC038",
                description="Verify Back navigation from Configuration page returns to Budget Monitoring Overview",
                preconditions="Admin is on PublicBudgetSnapshotConfigPage.",
                steps=[
                    "Click 'Back' (ArrowLeft icon) button in header.",
                    "Observe view transition.",
                ],
                test_data="Back navigation.",
                expected_result="View transitions back to Budget Monitoring Overview smoothly.",
                pass_fail_criteria="Pass: Back navigation returns to overview.\nFail: Back button fails or exits module.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Zero-Data States, Persistence, Standardized Export & RBAC
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Zero-Data States, Persistence, Standardized Export & RBAC",
        test_cases=[
            TestCase(
                id="TC039",
                description="Verify zero-data state when fiscal year has 0 budget requests",
                preconditions="A fiscal year is configured with ₱3,000,000 allocation but has 0 budget requests submitted.",
                steps=[
                    "Select the fiscal year on Budget Monitoring overview.",
                    "Observe Approved Budget, Released Budget, and Liquidated Budget KPI cards.",
                ],
                test_data="Configured year with zero requests.",
                expected_result="Approved Budget displays ₱0.00, Released displays ₱0.00, Liquidated displays ₱0.00. Remaining Headroom displays full ₱3,000,000.00 (100% available). No division-by-zero errors occur.",
                pass_fail_criteria="Pass: Zero requests state calculates cleanly without NaN or crashes.\nFail: Displays NaN or throws division by zero.",
            ),
            TestCase(
                id="TC040",
                description="Verify compact currency formatting for large numbers in KPI cards",
                preconditions="Annual budget is configured with large amount (e.g. ₱25,000,000.00).",
                steps=[
                    "Inspect Total Budget card.",
                    "Observe compact notation and full peso formatting.",
                ],
                test_data="₱25,000,000.00.",
                expected_result="Card displays ₱25.0M in compact badge while full value ₱25,000,000.00 is preserved in details.",
                pass_fail_criteria="Pass: Compact notation formats correctly.\nFail: Large numbers overflow or glitch.",
            ),
            TestCase(
                id="TC041",
                description="Verify standardized Admin Export Dialog for Budget Monitoring (PDF, Excel, CSV with paper sizes & orientation)",
                preconditions="Admin is on Budget Monitoring overview.",
                steps=[
                    "Click 'Export Report' button.",
                    "Verify export modal opens with format options: PDF, Excel (.xlsx), CSV.",
                    "For PDF, verify paper size selector (A4, Short 8.5x11, Long 8.5x13, Legal, A3, Tabloid) and orientation toggle (Portrait, Landscape).",
                    "Confirm export generation.",
                ],
                test_data="Export modal options.",
                expected_result="Standardized export modal opens cleanly. Generating export produces complete financial report with accurate FY Summary, authorized allocations, disbursements, and category splits.",
                pass_fail_criteria="Pass: Standardized export dialog generates accurate PDF/Excel/CSV files.\nFail: Export errors out or generates empty file.",
            ),
            TestCase(
                id="TC042",
                description="Verify persistence of budget monitoring calculations across page refresh",
                preconditions="Allocations and requests are active for FY 2026.",
                steps=[
                    "Perform browser hard reload (Ctrl + F5).",
                    "Verify KPI cards, headroom, progression bar, and category chart.",
                ],
                test_data="Page reload.",
                expected_result="All financial calculations, headroom metrics, and chart slices reload identically without loss.",
                pass_fail_criteria="Pass: Metrics persist across reloads.\nFail: Metrics reset or fail to load.",
            ),
            TestCase(
                id="TC043",
                description="Verify role-based access control: Organization users cannot access Admin Budget Monitoring",
                preconditions="Organization user attempts to access /admin/budget-monitoring.",
                steps=[
                    "Paste URL /admin/budget-monitoring in address bar while logged in as organization user.",
                ],
                test_data="Unauthorized URL access.",
                expected_result="Access is blocked. User is redirected to organization dashboard (/dashboard) or shown an Access Denied message.",
                pass_fail_criteria="Pass: Access restrictions block non-admin access.\nFail: Organization user can view admin monitoring.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Responsive Budget Monitoring Tabs & Admin Desktop-Only Gate
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Responsive Budget Monitoring Tabs & Admin Desktop-Only Gate",
        test_cases=[
            TestCase(
                id="TC044",
                description="Verify Budget Monitoring Tabs on Desktop Viewport (>= 1024px, e.g. 1920x1080)",
                preconditions="Admin opens Desktop browser at >= 1024px resolution.",
                steps=[
                    "Sign in as Admin and navigate to /admin/budget-monitoring.",
                    "Verify 4 KPI metric cards in a row, side-by-side utilization and category breakdown charts.",
                    "Switch to 'Allocation by Barangay' tab and verify wide data table with expandable district rows.",
                    "Switch to 'Public Preview / Configuration' tab and verify source funding table and live preview pane.",
                ],
                test_data="Viewport: >= 1024px (Desktop Full HD).",
                expected_result="Desktop layout displays all three tabs with generous spacing. KPI cards align in a 4-column row. Charts render crisp SVG visuals. Zero gating screens appear.",
                pass_fail_criteria="Pass: Desktop layout renders all metric cards, charts, and tables cleanly.\nFail: Charts wrap awkwardly or columns overlap.",
            ),
            TestCase(
                id="TC045",
                description="Verify Admin Desktop-Only Gate on Tablet Viewport (< 1024px, e.g. 768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait, width < 1024px).",
                steps=[
                    "Navigate to /admin/budget-monitoring on tablet viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport: 768x1024 (width < 1024px).",
                expected_result="Admin Desktop-Only Gate warning screen is displayed ('Desktop Experience Required'). The complex financial monitoring dashboards and charts are gated from narrow tablet screens.",
                pass_fail_criteria="Pass: Gate blocks admin monitoring on tablet portrait < 1024px.\nFail: Cramped interface renders or breaks.",
            ),
            TestCase(
                id="TC046",
                description="Verify Admin Desktop-Only Gate on Mobile Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /admin/budget-monitoring on mobile phone viewport.",
                    "Observe screen content.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Admin Desktop-Only Gate screen is displayed informing the user that administrative financial management requires a desktop viewport (>= 1024px).",
                pass_fail_criteria="Pass: Mobile phone viewport displays desktop-only warning gate.\nFail: Mobile phone renders broken chart layout.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_11_groups()
    output_filename = "11_YTRACE_Budget_Monitoring_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="11",
        section_title="Budget Monitoring & Financial Tracking Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()

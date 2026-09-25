"""
Generator for Section 16: Public Information Portal Black-Box Test Cases.
Document: 16_YTRACE_Public_Information_Portal_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_16_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: Landing Page (Home) & Hero Engagement
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="Landing Page (Home) & Hero Engagement",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify public access and loading of Y-TRACE Landing Page (/)",
                preconditions="Unauthenticated citizen accesses the Y-TRACE website.",
                steps=[
                    "Navigate to http://localhost:5173/.",
                    "Observe page loading, Announcement Bar, Navbar, Hero section, and Footer.",
                ],
                test_data="URL: /",
                expected_result="Landing page loads cleanly without authentication barriers. Announcement bar, logo, main navigation links (Home, About, Forms & Templates, News Releases, FAQs, Contacts), and primary Call-To-Action buttons are rendered.",
                pass_fail_criteria="Pass: Landing page loads completely with all global navigation components.\nFail: Page crashes, redirects to login, or renders blank.",
            ),
            TestCase(
                id="TC002",
                description="Verify Hero section Call-to-Action (CTA) navigation for new and existing users",
                preconditions="Citizen is on the landing page.",
                steps=[
                    "Click 'Register Organization' / 'Create Account' primary CTA button.",
                    "Observe navigation destination.",
                    "Navigate back to landing page.",
                    "Click 'Sign In' secondary CTA button.",
                    "Observe navigation destination.",
                ],
                test_data="Landing page CTAs.",
                expected_result="'Register Organization' navigates to /signup. 'Sign In' navigates to /signin.",
                pass_fail_criteria="Pass: CTA buttons direct to correct authentication routes.\nFail: Links are broken or navigate to wrong routes.",
            ),
            TestCase(
                id="TC003",
                description="Verify Public Statistics Counter display on Landing Page",
                preconditions="Landing page is loaded.",
                steps=[
                    "Scroll to the Key Metrics / Statistics section.",
                    "Verify display of public metrics: Registered Youth Organizations, Total Grants Released, Active Programs, Accredited Barangays.",
                ],
                test_data="Landing page stats.",
                expected_result="Statistics counters display formatted numbers and clear labels describing municipal youth achievements.",
                pass_fail_criteria="Pass: Statistics counters render formatted metrics without error.\nFail: Counters display NaN or fail to render.",
            ),
            TestCase(
                id="TC004",
                description="Verify Announcements & Advisories carousel / ticker on Landing Page",
                preconditions="Landing page is loaded with active announcements.",
                steps=[
                    "Observe the announcement banner or latest updates section.",
                    "Click next/previous controls or observe ticker rotation.",
                    "Click an announcement item.",
                ],
                test_data="Announcements on landing page.",
                expected_result="Announcements display with title, date, and badge. Clicking an item navigates to the detailed news release.",
                pass_fail_criteria="Pass: Announcements render and link to full release.\nFail: Announcements carousel is broken.",
            ),
            TestCase(
                id="TC005",
                description="Verify responsive layout of Landing Page on mobile viewport (375px)",
                preconditions="Citizen visits landing page on a smartphone.",
                steps=[
                    "Set browser viewport to 375px width.",
                    "Inspect hamburger menu toggle, hero typography, button stacking, and footer links.",
                ],
                test_data="Viewport width: 375px.",
                expected_result="Desktop navbar collapses into a mobile hamburger menu. Hero headline and CTAs stack vertically without horizontal overflow.",
                pass_fail_criteria="Pass: Mobile layout is responsive without horizontal clipping.\nFail: Layout overflows or hamburger menu is missing.",
            ),
            TestCase(
                id="TC006",
                description="Verify mobile hamburger navigation drawer opens and navigates",
                preconditions="Landing page is on mobile viewport.",
                steps=[
                    "Click the mobile hamburger menu icon.",
                    "Observe navigation drawer opening.",
                    "Click 'About' link in drawer.",
                ],
                test_data="Mobile hamburger menu.",
                expected_result="Drawer slides open displaying all public navigation links. Clicking 'About' navigates to /about and closes drawer.",
                pass_fail_criteria="Pass: Mobile drawer operates smoothly.\nFail: Drawer fails to open or links are unresponsive.",
            ),
            TestCase(
                id="TC007",
                description="Verify Global Footer component links and copyright notices",
                preconditions="Landing page is scrolled to bottom.",
                steps=[
                    "Inspect footer layout.",
                    "Verify presence of Pasig City Government seal, LYDO office mandate, links to Privacy Policy, Terms of Service, Site Map, and Contact Us.",
                ],
                test_data="Footer inspection.",
                expected_result="Footer renders municipal branding, copyright statement, and functional links to all informational and legal pages.",
                pass_fail_criteria="Pass: Footer renders complete branding and functional links.\nFail: Footer missing or contains broken links.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: About / Advocacy & Mandate Information
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="About / Advocacy & Mandate Information",
        test_cases=[
            TestCase(
                id="TC008",
                description="Verify loading of About & Advocacy page (/about)",
                preconditions="Public citizen clicks 'About' in navigation bar or footer.",
                steps=[
                    "Navigate to /about.",
                    "Inspect page layout: Hero banner, PCYDO Mandate, Mission, Vision, and Core Objectives.",
                ],
                test_data="URL: /about",
                expected_result="Page loads displaying official Pasig City Youth Development Office mandate under Republic Act 10742, mission, and vision.",
                pass_fail_criteria="Pass: About page renders official mandate and institutional information.\nFail: Page fails to load.",
            ),
            TestCase(
                id="TC009",
                description="Verify Four-Step Portal Process overview cards on About page",
                preconditions="Citizen is on /about page.",
                steps=[
                    "Scroll to 'How Y-TRACE Works' / 'The Process' section.",
                    "Inspect the 4 step cards: 1. Learn the Process, 2. Access Official Forms, 3. Apply Online, 4. Track Your Application.",
                ],
                test_data="Process overview cards.",
                expected_result="All 4 cards render with distinctive icons, clear explanatory descriptions, and step sequence numbering.",
                pass_fail_criteria="Pass: Four-step process is clearly explained.\nFail: Step cards missing or out of order.",
            ),
            TestCase(
                id="TC010",
                description="Verify Core Programs and Youth Development Agenda sections",
                preconditions="Citizen is on /about page.",
                steps=[
                    "Scroll through the youth priority areas (Governance, Education, Health, Environment, Livelihood).",
                    "Verify descriptions and visual cards.",
                ],
                test_data="Youth development agenda.",
                expected_result="All municipal youth program pillars are detailed with consistent typography and thematic icons.",
                pass_fail_criteria="Pass: Program sections render accurately.\nFail: Content is cut off or missing.",
            ),
            TestCase(
                id="TC011",
                description="Verify 'Apply Online' CTA on About page navigates to Registration",
                preconditions="Citizen is on /about page.",
                steps=[
                    "Click 'Apply Online' / 'Register Your Organization' button.",
                    "Observe destination route.",
                ],
                test_data="Apply CTA button.",
                expected_result="User is navigated to /signup to begin organization registration.",
                pass_fail_criteria="Pass: CTA directs to registration workflow.\nFail: Link broken.",
            ),
            TestCase(
                id="TC012",
                description="Verify 'Access Official Forms' CTA on About page navigates to Templates catalog",
                preconditions="Citizen is on /about page.",
                steps=[
                    "Click 'Access Official Forms' / 'Download Templates' link.",
                    "Observe destination route.",
                ],
                test_data="Forms CTA button.",
                expected_result="User is navigated to /public-templates to view active forms and guidelines.",
                pass_fail_criteria="Pass: CTA directs to public templates.\nFail: Link broken.",
            ),
            TestCase(
                id="TC013",
                description="Verify responsive layout of About page on tablet and smartphone viewports",
                preconditions="About page is loaded.",
                steps=[
                    "Resize viewport to 768px (tablet) and 375px (mobile).",
                    "Verify grid cards reflow into single or dual column layout without horizontal clipping.",
                ],
                test_data="Viewport sizes: 768px, 375px.",
                expected_result="Cards adapt responsively without horizontal overflow. All text remains readable and images maintain aspect ratio.",
                pass_fail_criteria="Pass: Page adapts responsively across viewports.\nFail: Layout overflows horizontally.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Frequently Asked Questions (FAQs) & Searchable Accordion
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Frequently Asked Questions (FAQs) & Searchable Accordion",
        test_cases=[
            TestCase(
                id="TC014",
                description="Verify loading of FAQs page (/faqs) and default category view",
                preconditions="Citizen navigates to /faqs.",
                steps=[
                    "Observe page layout.",
                    "Verify search bar, category filter dropdown/tabs (All, Getting Started, Documents, Budget, Portal), and accordion questions.",
                ],
                test_data="URL: /faqs",
                expected_result="FAQs page loads displaying search input, category filters, and list of collapsible questions.",
                pass_fail_criteria="Pass: FAQs page loads with complete accordion controls.\nFail: Page fails to load.",
            ),
            TestCase(
                id="TC015",
                description="Verify expanding and collapsing FAQ accordion items",
                preconditions="FAQs page is open with collapsed questions.",
                steps=[
                    "Click on question: 'What is Y-TRACE?'.",
                    "Observe accordion expansion.",
                    "Click the question again.",
                    "Observe accordion collapse.",
                ],
                test_data="Question item: 'What is Y-TRACE?'.",
                expected_result="Clicking question expands it, revealing the detailed answer text. Clicking again collapses the answer smoothly.",
                pass_fail_criteria="Pass: Accordion expands and collapses as expected.\nFail: Accordion is unresponsive.",
            ),
            TestCase(
                id="TC016",
                description="Verify category filtering on FAQs page",
                preconditions="FAQs page is open.",
                steps=[
                    "Select Category: 'Documents'.",
                    "Verify visible questions relate only to document submission.",
                    "Select Category: 'Budget'.",
                    "Verify questions relate to budget requests and liquidation.",
                    "Select 'All'.",
                ],
                test_data="Categories: Documents, Budget, All.",
                expected_result="List filters immediately to show questions belonging to the selected category. 'All' restores complete FAQ list.",
                pass_fail_criteria="Pass: Category filter operates accurately.\nFail: Filtering fails or displays mismatched questions.",
            ),
            TestCase(
                id="TC017",
                description="Verify keyword search in FAQs",
                preconditions="FAQs page is open.",
                steps=[
                    "Type 'liquidation' in FAQ search input.",
                    "Observe filtered questions.",
                    "Clear search input.",
                ],
                test_data="Search query: 'liquidation'.",
                expected_result="Only questions containing 'liquidation' in their title or answer text remain visible. Clearing restores full list.",
                pass_fail_criteria="Pass: Search filters matching FAQ entries dynamically.\nFail: Search fails or shows unrelated questions.",
            ),
            TestCase(
                id="TC018",
                description="Verify empty state when FAQ search yields no matching questions",
                preconditions="FAQs page is open.",
                steps=[
                    "Type 'nonexistentquery12345' into search bar.",
                    "Observe list body.",
                ],
                test_data="Search: 'nonexistentquery12345'.",
                expected_result="System displays empty state message: 'No questions found matching your search. Try adjusting keywords or contact our office.'",
                pass_fail_criteria="Pass: Empty search state renders helpful fallback message.\nFail: Page displays error or broken view.",
            ),
            TestCase(
                id="TC019",
                description="Verify 'Still Have Questions?' contact button on FAQs page",
                preconditions="Citizen is at the bottom of the FAQs page.",
                steps=[
                    "Locate 'Still have questions? Get in touch with our team' callout.",
                    "Click 'Contact Us' button.",
                    "Observe destination route.",
                ],
                test_data="Contact CTA on FAQs.",
                expected_result="User is navigated smoothly to /contacts.",
                pass_fail_criteria="Pass: Button directs to contact page.\nFail: Link is broken.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Office Contacts, Geolocation Map & Public Directory
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Office Contacts, Geolocation Map & Public Directory",
        test_cases=[
            TestCase(
                id="TC020",
                description="Verify loading of Contacts page (/contacts) and official office information",
                preconditions="Citizen navigates to /contacts.",
                steps=[
                    "Observe page hero and contact cards.",
                    "Verify official office details: Address (Temporary Pasig City Hall), Phone ((02) 8643-7632), Email (lydo@pasigcity.gov.ph).",
                ],
                test_data="URL: /contacts",
                expected_result="Contacts page loads displaying official address, hotline, official email, and office hours.",
                pass_fail_criteria="Pass: Official office details are displayed accurately.\nFail: Page fails to load or details missing.",
            ),
            TestCase(
                id="TC021",
                description="Verify interactive Leaflet Map rendering on Contacts page",
                preconditions="Contacts page is loaded.",
                steps=[
                    "Observe the map container.",
                    "Verify marker is placed at the Pasig City Hall coordinates.",
                    "Use zoom in (+) and zoom out (-) controls.",
                    "Click on the map marker.",
                ],
                test_data="Map interaction.",
                expected_result="Leaflet map renders satellite/street tiles without broken gray boxes. Clicking the marker displays popup with official office address.",
                pass_fail_criteria="Pass: Interactive map renders and responds to controls.\nFail: Map fails to load or marker is missing.",
            ),
            TestCase(
                id="TC022",
                description="Verify telephone link (tel:) and email link (mailto:) on Contacts page",
                preconditions="Contacts page is loaded.",
                steps=[
                    "Click the phone number '(02) 8643-7632'.",
                    "Click the email address 'lydo@pasigcity.gov.ph'.",
                ],
                test_data="Contact links.",
                expected_result="Phone link triggers tel: protocol. Email link triggers mailto: protocol pre-populated with official recipient.",
                pass_fail_criteria="Pass: Protocol links trigger dialer and mail client.\nFail: Links are plain text or malformed.",
            ),
            TestCase(
                id="TC023",
                description="Verify responsive layout of Contacts page on mobile viewport",
                preconditions="Contacts page is opened on 375px viewport.",
                steps=[
                    "Observe map height and contact card stacking.",
                    "Verify contact details fit cleanly without horizontal overflow.",
                ],
                test_data="Viewport width: 375px.",
                expected_result="Map adjusts height (180px) for mobile. Contact cards stack cleanly with readable typography.",
                pass_fail_criteria="Pass: Mobile layout adapts smoothly.\nFail: Layout overflows horizontally.",
            ),
            TestCase(
                id="TC024",
                description="Verify 'Frequently Asked Questions' secondary button on Contacts page",
                preconditions="Citizen is on /contacts.",
                steps=[
                    "Click 'View FAQs' button.",
                    "Observe destination route.",
                ],
                test_data="FAQs button.",
                expected_result="User is navigated to /faqs.",
                pass_fail_criteria="Pass: Button directs to FAQs page.\nFail: Link broken.",
            ),
            TestCase(
                id="TC025",
                description="Verify Public Inquiry Submission modal trigger from Contacts page",
                preconditions="Citizen is on /contacts.",
                steps=[
                    "Click 'Send an Inquiry' / 'Submit Inquiry' button.",
                    "Observe modal opening.",
                ],
                test_data="Send inquiry button.",
                expected_result="Public inquiry submission modal opens ready for input.",
                pass_fail_criteria="Pass: Inquiry modal opens cleanly.\nFail: Button fails to trigger modal.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Site Map Directory, Legal Policies & SEO Compliance
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Site Map Directory, Legal Policies & SEO Compliance",
        test_cases=[
            TestCase(
                id="TC026",
                description="Verify loading of Site Map page (/site-map) and directory sections",
                preconditions="Citizen navigates to /site-map via footer or URL.",
                steps=[
                    "Inspect page layout.",
                    "Verify two primary directory sections: 'Public Website' and 'Organization Portal'.",
                ],
                test_data="URL: /site-map",
                expected_result="Site Map loads displaying categorized lists of all public and authenticated system links.",
                pass_fail_criteria="Pass: Site Map renders complete site architecture.\nFail: Page fails to load.",
            ),
            TestCase(
                id="TC027",
                description="Verify all public links in Site Map lead to valid destinations (Zero Dead Ends)",
                preconditions="Citizen is on Site Map page.",
                steps=[
                    "Click each link under 'Public Website': Home, About, Forms & Templates, News Releases, FAQs, Contacts, Privacy Policy, Terms of Service, Site Map.",
                    "Verify that each link resolves to a live page without 404 error.",
                ],
                test_data="Public Site Map links.",
                expected_result="All public links navigate to their respective pages with valid page render and accessible content. No broken links or dead ends exist.",
                pass_fail_criteria="Pass: 100% of public sitemap links resolve to valid destinations.\nFail: Any sitemap link returns 404.",
            ),
            TestCase(
                id="TC028",
                description="Verify Organization Portal links in Site Map direct to authentication for unauthenticated visitors",
                preconditions="Unauthenticated citizen clicks 'Dashboard' or 'Budget Requests' link under 'Organization Portal' section on Site Map.",
                steps=[
                    "Click 'Dashboard' link.",
                    "Observe system navigation response.",
                ],
                test_data="Portal link on Site Map.",
                expected_result="Because the visitor is unauthenticated, the system redirects cleanly to /signin with a login prompt.",
                pass_fail_criteria="Pass: Protected portal links safely route unauthenticated visitors to sign in.\nFail: Protected views leak or crash without auth.",
            ),
            TestCase(
                id="TC029",
                description="Verify Terms of Service page (/terms) content and effective date display",
                preconditions="Citizen navigates to /terms.",
                steps=[
                    "Inspect page content.",
                    "Verify title 'Terms of Service', effective date, terms clauses, and back navigation.",
                ],
                test_data="URL: /terms",
                expected_result="Terms of Service page renders complete legal terms, user responsibilities, account guidelines, and explicit effective date.",
                pass_fail_criteria="Pass: Terms of Service page displays complete legal text.\nFail: Page is blank or text truncated.",
            ),
            TestCase(
                id="TC030",
                description="Verify Privacy Policy page (/privacy) compliance with RA 10173 (Data Privacy Act of 2012)",
                preconditions="Citizen navigates to /privacy.",
                steps=[
                    "Inspect page content.",
                    "Verify explicit citation of Republic Act No. 10173, data collection scope, data retention, user rights, and DPO contact details.",
                ],
                test_data="URL: /privacy",
                expected_result="Privacy Policy explicitly references RA 10173, describes youth organization data handling, retention policies, and provides DPO contact information.",
                pass_fail_criteria="Pass: Privacy policy meets statutory RA 10173 disclosure requirements.\nFail: Policy lacks mandatory statutory disclosures.",
            ),
            TestCase(
                id="TC031",
                description="Verify 404 Not Found fallback page for invalid public URLs",
                preconditions="Citizen enters an invalid URL: http://localhost:5173/this-page-does-not-exist.",
                steps=[
                    "Navigate to invalid URL.",
                    "Observe fallback error page.",
                    "Click 'Back to Home' / 'Return Home' button.",
                ],
                test_data="Invalid URL: /this-page-does-not-exist.",
                expected_result="NotFound page renders friendly 404 message: 'Page Not Found'. Clicking 'Back to Home' returns user safely to landing page.",
                pass_fail_criteria="Pass: 404 page renders gracefully and provides recovery navigation.\nFail: Browser shows unhandled error or white screen.",
            ),
            TestCase(
                id="TC032",
                description="Verify SEO, OpenGraph, and title tags across Public Information Portal pages",
                preconditions="Citizen visits /, /about, /faqs, /contacts, /site-map, /terms, /privacy.",
                steps=[
                    "Inspect HTML <title> and <meta name='description'> tags on each public page.",
                ],
                test_data="Public page HTML headers.",
                expected_result="Each page has a unique, descriptive <title> tag (e.g. 'About | Y-TRACE', 'FAQs | Y-TRACE') and valid meta descriptions.",
                pass_fail_criteria="Pass: All public pages have unique descriptive title and meta tags.\nFail: Title tags missing or generic.",
            ),
        ],
    )
    groups.append(g5)

    # =========================================================================
    # Group 6: Responsive Public Information Portal Across Viewports
    # =========================================================================
    g6 = TestGroup(
        number=6,
        title="Responsive Public Information Portal Across Viewports",
        test_cases=[
            TestCase(
                id="TC033",
                description="Verify Public Information Portal (Landing, About, FAQs, Contacts) on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate through public pages: /, /about, /faqs, /contacts, /site-map, /terms, /privacy.",
                    "Verify full-width hero section, desktop navbar with horizontal navigation links, and multi-column statistics counter.",
                    "Verify desktop footer displaying 4 organized columns of municipal information and legal links.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Public pages render with generous desktop margins (max-w-7xl), crisp typography, balanced grid layouts, and zero clipped graphics or awkward line wraps.",
                pass_fail_criteria="Pass: Desktop public portal displays with premium layout aesthetics and full navigation.\nFail: Sections collide or layout breaks on desktop.",
            ),
            TestCase(
                id="TC034",
                description="Verify Public Information Portal on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate through /, /about, /faqs, /contacts on tablet viewport.",
                    "Verify tablet navigation bar, 2-column FAQ accordion grid, and touch-friendly contact form inputs.",
                    "Inspect footer layout wrapping on tablet screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="Navbar adapts gracefully. FAQ accordions expand and collapse smoothly on touch. Contact form inputs maintain comfortable 44px tap targets. Footer wraps cleanly into 2 columns.",
                pass_fail_criteria="Pass: Tablet public views adapt smoothly with responsive touch interactions.\nFail: Horizontal scrollbar appears or touch targets are too small.",
            ),
            TestCase(
                id="TC035",
                description="Verify Public Information Portal on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to / on mobile phone viewport.",
                    "Verify hamburger menu button in mobile navbar.",
                    "Tap hamburger button and verify slide-out or full-screen mobile navigation menu.",
                    "Navigate to /faqs, /contacts, and /site-map on phone viewport and inspect vertical stacking.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="Mobile navigation hamburger menu toggles reliably. Hero CTAs stack vertically within thumb zone. FAQs, contact form, and footer stack cleanly with zero horizontal overflow.",
                pass_fail_criteria="Pass: Mobile phone interface renders full-featured navigation and zero horizontal overflow.\nFail: Hamburger menu fails to open or horizontal scroll breaks layout.",
            ),
        ],
    )
    groups.append(g6)

    return groups


def main():
    groups = get_section_16_groups()
    output_filename = "16_YTRACE_Public_Information_Portal_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="16",
        section_title="Public Information Portal Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


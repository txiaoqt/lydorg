"""
Generator for Section 14: News Releases & Public Content Black-Box Test Cases.
Document: 14_YTRACE_News_Releases_Content_Black_Box_Test_Cases.docx
"""

import sys
from pathlib import Path
from test_doc_builder import TestCase, TestGroup, build_test_suite_document


def get_section_14_groups() -> list[TestGroup]:
    groups = []

    # =========================================================================
    # Group 1: News Release Authoring, Banner Upload & Content Validation
    # =========================================================================
    g1 = TestGroup(
        number=1,
        title="News Release Authoring, Banner Upload & Content Validation",
        test_cases=[
            TestCase(
                id="TC001",
                description="Verify opening of 'Create News Release' modal in Admin Portal",
                preconditions="Administrator navigates to Admin Portal -> News Releases.",
                steps=[
                    "Click '+ New Release' action button.",
                    "Inspect the opened dialog.",
                    "Verify input fields: Title, Summary, Body Content, Date, Category, Banner Image Dropzone, Facebook URL, and Visibility Status.",
                ],
                test_data="N/A",
                expected_result="Dialog opens cleanly with all authoring fields, calendar date picker, and file dropzones initialized.",
                pass_fail_criteria="Pass: Authoring modal opens with all required input fields.\nFail: Modal fails to open or is missing fields.",
            ),
            TestCase(
                id="TC002",
                description="Verify required field validation on empty news release submission",
                preconditions="Create News Release modal is open.",
                steps=[
                    "Leave Title, Summary, and Body Content blank.",
                    "Click 'Publish'.",
                ],
                test_data="Blank form fields.",
                expected_result="Submission is blocked. Validation highlights Title, Summary, and Body as required fields.",
                pass_fail_criteria="Pass: Form enforces required text fields.\nFail: Empty release submits without error.",
            ),
            TestCase(
                id="TC003",
                description="Verify upload of valid banner image (JPEG, PNG, WebP <5MB)",
                preconditions="News release form is open.",
                steps=[
                    "Click 'Upload Banner Image'.",
                    "Select valid image file 'pasig_youth_summit_banner.jpg' (size: 2.1 MB).",
                    "Observe image preview thumbnail.",
                ],
                test_data="File: 'pasig_youth_summit_banner.jpg', size: 2.1 MB.",
                expected_result="Banner image uploads and displays preview thumbnail in the form. Filename, formatted size ('2.1 MB'), and 'Replace' / 'Remove' actions appear.",
                pass_fail_criteria="Pass: Valid image uploads cleanly with preview thumbnail.\nFail: Image upload errors or fails to preview.",
            ),
            TestCase(
                id="TC004",
                description="Verify rejection of non-image file format for banner upload",
                preconditions="News release form is open.",
                steps=[
                    "Attempt to upload a PDF or text file ('document.pdf') into the banner image slot.",
                    "Observe validation alert.",
                ],
                test_data="File: 'document.pdf'.",
                expected_result="Upload is blocked immediately: 'Only image files (JPEG, PNG, WebP) can be uploaded as banner.'",
                pass_fail_criteria="Pass: Non-image formats are rejected.\nFail: Non-image file is accepted as banner.",
            ),
            TestCase(
                id="TC005",
                description="Verify rejection of oversized banner image (>5MB)",
                preconditions="News release form is open.",
                steps=[
                    "Attempt to upload an image exceeding 5MB (e.g. 6.8 MB high-res photo).",
                    "Observe validation alert.",
                ],
                test_data="File size: 6.8 MB.",
                expected_result="Upload is blocked: 'Banner image file size must not exceed 5MB.'",
                pass_fail_criteria="Pass: Images exceeding 5MB are blocked.\nFail: Oversized image uploads.",
            ),
            TestCase(
                id="TC006",
                description="Verify removal and replacement of uploaded banner image",
                preconditions="Form has an uploaded banner image.",
                steps=[
                    "Click 'Remove Image' (Trash icon) on the thumbnail.",
                    "Verify image is cleared and dropzone restored.",
                    "Upload new image 'new_banner.png'.",
                ],
                test_data="Replacement image: 'new_banner.png'.",
                expected_result="Old image is cleared cleanly. New image uploads and updates thumbnail preview.",
                pass_fail_criteria="Pass: Image removal and replacement operate smoothly.\nFail: Image cannot be removed or updated.",
            ),
            TestCase(
                id="TC007",
                description="Verify release date picker selection and calendar navigation",
                preconditions="News release form is open.",
                steps=[
                    "Click Release Date calendar input.",
                    "Navigate through months and select target date.",
                    "Verify date formatting in input.",
                ],
                test_data="Selected date: 2026-09-18.",
                expected_result="Calendar popover opens. Date is selected and formatted cleanly (e.g. 'September 18, 2026').",
                pass_fail_criteria="Pass: Date picker allows accurate date selection and formatting.\nFail: Date selection crashes or formats improperly.",
            ),
        ],
    )
    groups.append(g1)

    # =========================================================================
    # Group 2: Facebook URL Embedding, Supporting Attachments & Categorization
    # =========================================================================
    g2 = TestGroup(
        number=2,
        title="Facebook URL Embedding, Supporting Attachments & Categorization",
        test_cases=[
            TestCase(
                id="TC008",
                description="Verify validation of valid Facebook post URL",
                preconditions="News release form is open.",
                steps=[
                    "Enter Facebook URL: 'https://www.facebook.com/PasigYouthDevelopment/posts/1029384756'.",
                    "Observe validation response.",
                ],
                test_data="URL: 'https://www.facebook.com/PasigYouthDevelopment/posts/1029384756'.",
                expected_result="URL is accepted with green checkmark indicator confirming valid Facebook post format.",
                pass_fail_criteria="Pass: Valid Facebook post URL is accepted.\nFail: Valid URL is flagged as invalid.",
            ),
            TestCase(
                id="TC009",
                description="Verify rejection of invalid or malformed Facebook URL",
                preconditions="News release form is open.",
                steps=[
                    "Enter URL: 'https://twitter.com/pasig' or 'http://not-a-valid-url'.",
                    "Observe validation error.",
                ],
                test_data="Invalid URL: 'https://twitter.com/pasig'.",
                expected_result="Field highlights red with error: 'Please enter a valid Facebook post URL (e.g. https://www.facebook.com/...)'",
                pass_fail_criteria="Pass: Non-Facebook or malformed URLs are rejected.\nFail: Invalid URL is accepted.",
            ),
            TestCase(
                id="TC010",
                description="Verify upload of PDF supporting attachment for news release",
                preconditions="News release form is open.",
                steps=[
                    "Locate Supporting Documents / Attachments section.",
                    "Upload valid PDF 'Official_Press_Statement.pdf' (size: 1.2 MB).",
                    "Observe attachment item list.",
                ],
                test_data="File: 'Official_Press_Statement.pdf'.",
                expected_result="PDF uploads and is listed under attachments with filename, size, and remove action.",
                pass_fail_criteria="Pass: Attachment uploads and displays in list.\nFail: Attachment upload fails.",
            ),
            TestCase(
                id="TC011",
                description="Verify category selection from existing categories",
                preconditions="News release form is open.",
                steps=[
                    "Click Category dropdown.",
                    "Select 'Advisory'.",
                ],
                test_data="Category: 'Advisory'.",
                expected_result="Category 'Advisory' is selected and displayed on the card.",
                pass_fail_criteria="Pass: Category dropdown functions correctly.\nFail: Category selection fails.",
            ),
            TestCase(
                id="TC012",
                description="Verify creating a new Custom Category for news articles",
                preconditions="News release form is open.",
                steps=[
                    "Click '+ Add Category'.",
                    "Type 'Youth Opportunities'.",
                    "Save new category.",
                ],
                test_data="New category: 'Youth Opportunities'.",
                expected_result="New category is registered and assigned to the article. It becomes selectable for future releases.",
                pass_fail_criteria="Pass: Custom category is created and assigned.\nFail: Category creation fails.",
            ),
            TestCase(
                id="TC013",
                description="Verify removal of attached supporting document",
                preconditions="An attachment is listed in the form.",
                steps=[
                    "Click 'Remove' (X icon) on the attachment card.",
                ],
                test_data="Remove attachment action.",
                expected_result="Attachment is removed from the form list immediately.",
                pass_fail_criteria="Pass: Attachment is removed cleanly.\nFail: Attachment persists.",
            ),
        ],
    )
    groups.append(g2)

    # =========================================================================
    # Group 3: Publication Lifecycle: Draft, Publish, Unpublish & Preview
    # =========================================================================
    g3 = TestGroup(
        number=3,
        title="Publication Lifecycle: Draft, Publish, Unpublish & Preview",
        test_cases=[
            TestCase(
                id="TC014",
                description="Verify 'Save as Draft' workflow for news release",
                preconditions="Admin fills in Title: 'Upcoming SK Election Guidelines 2026' and selects Visibility: 'Draft'.",
                steps=[
                    "Click 'Save as Draft'.",
                    "Observe table in Admin Portal -> News Releases.",
                ],
                test_data="Article with status 'draft'.",
                expected_result="Modal closes with toast 'Draft saved.' Article appears in table with status badge 'Draft'. It is NOT visible to the public.",
                pass_fail_criteria="Pass: Article saves as Draft and displays draft badge.\nFail: Draft save fails.",
            ),
            TestCase(
                id="TC015",
                description="Verify 'Publish Now' action transitions article to 'Published'",
                preconditions="Article exists in Draft status.",
                steps=[
                    "In Admin table, click 'Publish' on the draft article row.",
                    "Confirm publication.",
                ],
                test_data="Draft article.",
                expected_result="Status pill updates to green 'Published'. Article becomes live and visible on public news catalog.",
                pass_fail_criteria="Pass: Status updates to Published.\nFail: Publication fails.",
            ),
            TestCase(
                id="TC016",
                description="Verify 'Hide / Unpublish' action sets visibility to 'Hidden' and removes article from public catalog",
                preconditions="Article is in 'Published' status.",
                steps=[
                    "In Admin table, click 'Hide' / 'Unpublish' on the published article row.",
                    "Confirm action.",
                ],
                test_data="Published article.",
                expected_result="Status pill updates to neutral 'Hidden'. Article disappears immediately from the public catalog.",
                pass_fail_criteria="Pass: Article visibility transitions to Hidden and disappears from public catalog.\nFail: Article remains visible to public.",
            ),
            TestCase(
                id="TC017",
                description="Verify News Article Preview dialog in Admin Portal",
                preconditions="Article is in Draft or Published state.",
                steps=[
                    "Click 'Preview' (Eye icon) on table row.",
                    "Inspect opened NewsPreviewDialog.",
                    "Verify rendering of banner image, title, author, date, body formatting, and attachments.",
                ],
                test_data="Article preview.",
                expected_result="Preview dialog renders the complete article exactly as public readers will see it.",
                pass_fail_criteria="Pass: Preview dialog renders realistic article reader view.\nFail: Preview fails or displays broken layout.",
            ),
            TestCase(
                id="TC018",
                description="Verify editing an existing news release",
                preconditions="Article exists in table.",
                steps=[
                    "Click 'Edit' (Pencil icon) on row.",
                    "Update Title and Excerpt.",
                    "Click 'Save Changes'.",
                ],
                test_data="Updated text fields.",
                expected_result="Article updates successfully in real time without creating duplicate records.",
                pass_fail_criteria="Pass: Article updates cleanly.\nFail: Edit fails.",
            ),
            TestCase(
                id="TC019",
                description="Verify deleting a news release with confirmation safeguard",
                preconditions="Article exists in Admin table.",
                steps=[
                    "Click 'Delete' (Trash icon) on row.",
                    "Observe confirmation alert dialog.",
                    "Confirm deletion.",
                ],
                test_data="Delete target article.",
                expected_result="Confirmation dialog prompts admin. Upon confirmation, article is permanently removed. Toast confirms deletion.",
                pass_fail_criteria="Pass: Article is deleted cleanly upon confirmation.\nFail: Deletion fails or executes without confirmation.",
            ),
            TestCase(
                id="TC020",
                description="Verify status persistence across page refresh in Admin table",
                preconditions="Article is in 'Hidden' status.",
                steps=[
                    "Refresh Admin Portal page (Ctrl + F5).",
                    "Inspect table row.",
                ],
                test_data="Page refresh.",
                expected_result="Article remains in 'Hidden' status with all metadata intact.",
                pass_fail_criteria="Pass: Status persists reliably across refreshes.\nFail: Status resets.",
            ),
        ],
    )
    groups.append(g3)

    # =========================================================================
    # Group 4: Public Article Reader, Search, Category Filters & Visibility Rules
    # =========================================================================
    g4 = TestGroup(
        number=4,
        title="Public Article Reader, Search, Category Filters & Visibility Rules",
        test_cases=[
            TestCase(
                id="TC021",
                description="Verify public news listing (/news-releases) shows only 'Published' articles",
                preconditions="System has 1 Published article, 1 Draft article, and 1 Hidden article recorded in Admin portal.",
                steps=[
                    "In unauthenticated Incognito window, navigate to http://localhost:5173/news-releases.",
                    "Inspect visible news cards.",
                ],
                test_data="Public news page.",
                expected_result="ONLY the Published article is visible. The Draft and Hidden articles DO NOT appear in the listing.",
                pass_fail_criteria="Pass: Only published articles are exposed publicly.\nFail: Draft or hidden articles are visible to public.",
            ),
            TestCase(
                id="TC022",
                description="Verify public search by title and keyword in news releases",
                preconditions="Multiple published articles exist.",
                steps=[
                    "Type 'Election' into search bar on /news-releases.",
                    "Observe filtered cards.",
                ],
                test_data="Search: 'Election'.",
                expected_result="Grid filters to display only articles matching 'Election' in title or summary.",
                pass_fail_criteria="Pass: Search filters public articles accurately.\nFail: Search fails or shows unrelated articles.",
            ),
            TestCase(
                id="TC023",
                description="Verify public category filter pills",
                preconditions="Articles span categories 'Advisory', 'Press Release', 'Events'.",
                steps=[
                    "Click 'Advisory' category pill.",
                    "Click 'Events' category pill.",
                    "Click 'All' pill.",
                ],
                test_data="Category pills.",
                expected_result="Grid updates instantly to show articles matching the active category pill.",
                pass_fail_criteria="Pass: Category filtering functions smoothly.\nFail: Wrong articles display.",
            ),
            TestCase(
                id="TC024",
                description="Verify opening public Article Reader view (/news-releases/:newsReleaseId)",
                preconditions="Public user clicks on a news card on /news-releases.",
                steps=[
                    "Click news card for 'Upcoming SK Election Guidelines 2026'.",
                    "Observe navigation to full article page.",
                    "Inspect cover banner image, article title, date, author tag, and full body content.",
                ],
                test_data="Article ID.",
                expected_result="Article Reader view opens displaying high-resolution banner image, formatted typography, metadata attribution, and complete text body.",
                pass_fail_criteria="Pass: Reader renders complete article cleanly.\nFail: Reader fails to load or content is truncated.",
            ),
            TestCase(
                id="TC025",
                description="Verify Facebook source post link button in Article Reader",
                preconditions="Article has an associated Facebook post URL.",
                steps=[
                    "In Article Reader, locate 'View on Facebook' / 'Official Facebook Post' button.",
                    "Click button.",
                ],
                test_data="Facebook link button.",
                expected_result="Link opens the official Facebook post in a new browser tab with rel='noopener noreferrer'.",
                pass_fail_criteria="Pass: Link directs to Facebook post in new tab safely.\nFail: Link broken or opens in same tab.",
            ),
            TestCase(
                id="TC026",
                description="Verify downloading supporting attachments from Article Reader",
                preconditions="Article has attached PDF 'Official_Press_Statement.pdf'.",
                steps=[
                    "Locate Downloads / Attachments section on article page.",
                    "Click 'Download Statement' button.",
                ],
                test_data="Attachment download.",
                expected_result="Browser downloads the attached PDF file with its original filename.",
                pass_fail_criteria="Pass: Attachment downloads cleanly.\nFail: Download fails.",
            ),
            TestCase(
                id="TC027",
                description="Verify direct URL access to Draft/Hidden article by unauthenticated user is blocked",
                preconditions="Article ID corresponds to a Draft or Hidden release.",
                steps=[
                    "In Incognito window, paste direct URL /news-releases/[draft-article-id].",
                    "Observe system response.",
                ],
                test_data="Draft article direct URL.",
                expected_result="System displays 404 Not Found or 'Article Unavailable' notice. The draft content is NOT disclosed.",
                pass_fail_criteria="Pass: Unpublished articles are protected against direct URL access.\nFail: Draft content is accessible to public.",
            ),
        ],
    )
    groups.append(g4)

    # =========================================================================
    # Group 5: Responsive News Feeds & Article Reader Across Viewports
    # =========================================================================
    g5 = TestGroup(
        number=5,
        title="Responsive News Feeds & Article Reader Across Viewports",
        test_cases=[
            TestCase(
                id="TC028",
                description="Verify News Feeds and Article Reader on Desktop Viewport (1920x1080)",
                preconditions="Tester opens Desktop browser at 1920x1080 resolution.",
                steps=[
                    "Navigate to /news-releases on desktop browser.",
                    "Verify 3-column news card grid, featured banner article hero, and category filter pill bar.",
                    "Click an article to open Article Reader.",
                    "Verify desktop typography, readable body column width, and side-by-side attachments panel.",
                ],
                test_data="Viewport: 1920x1080 (Desktop Full HD).",
                expected_result="Desktop layout displays news articles in a balanced 3-column grid. Article reader maintains comfortable reading line length (max-w-4xl) with crisp high-resolution header images.",
                pass_fail_criteria="Pass: Desktop layout renders all cards and article contents with generous margins.\nFail: Cards are misaligned or images overflow container.",
            ),
            TestCase(
                id="TC029",
                description="Verify News Feeds and Article Reader on Tablet Viewport (768x1024)",
                preconditions="Tester configures browser viewport to 768x1024 (Tablet Portrait).",
                steps=[
                    "Navigate to /news-releases on tablet viewport.",
                    "Verify news grid wraps cleanly into 2 columns.",
                    "Open Article Reader and test touch-scrolling through full article.",
                    "Tap 'View on Facebook' button on touch screen.",
                ],
                test_data="Viewport: 768x1024 (Tablet Portrait).",
                expected_result="News feed adapts smoothly to 2 columns with touch-friendly cards. Article reader body scales with readable font sizes. External links and download buttons respond reliably to taps.",
                pass_fail_criteria="Pass: Tablet layout adapts cleanly with tap-friendly controls.\nFail: Content overflows horizontally or touch interactions fail.",
            ),
            TestCase(
                id="TC030",
                description="Verify News Feeds and Article Reader on Phone Viewport (390x844)",
                preconditions="Tester configures browser viewport to 390x844 (Mobile Phone Web).",
                steps=[
                    "Navigate to /news-releases on mobile phone viewport.",
                    "Verify single-column vertical news feed, full-width banner thumbnails, and mobile search bar.",
                    "Tap an article card to navigate to Article Reader.",
                    "Verify full-width cover image, comfortable mobile reading line-height, and sticky 'Back to News' button.",
                ],
                test_data="Viewport: 390x844 (Mobile Phone Web).",
                expected_result="News releases render as single-column mobile cards with zero horizontal overflow. Article reader provides pleasant mobile reading typography with easily accessible navigation.",
                pass_fail_criteria="Pass: Mobile phone news interface is fully responsive with zero horizontal scroll.\nFail: Images cause horizontal scroll or back button is unclickable.",
            ),
        ],
    )
    groups.append(g5)

    return groups


def main():
    groups = get_section_14_groups()
    output_filename = "14_YTRACE_News_Releases_Content_Black_Box_Test_Cases.docx"
    output_path = Path(output_filename)
    build_test_suite_document(
        section_number_str="14",
        section_title="News Releases & Public Content Module",
        groups=groups,
        output_path=output_path,
    )
    print(f"Successfully generated: {output_filename} ({sum(len(g.test_cases) for g in groups)} test cases)")


if __name__ == "__main__":
    main()


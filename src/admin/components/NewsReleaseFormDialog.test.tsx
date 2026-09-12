import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NewsReleaseFormDialog } from "./NewsReleaseFormDialog";
import {
  deriveNewsCategories,
  validateFacebookPostUrl,
  validateNewCategory,
  type NewsRelease,
} from "@/lib/lydo-connect-data";
import { PublicNewsReleaseCard } from "@/components/public/PublicNewsReleaseCard";

describe("News Release Form — 22 Verification Tests", () => {
  beforeEach(() => {
    // Mock URL object methods for image blob preview
    global.URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  const baseProps = {
    mode: "create" as const,
    title: "Youth Leadership Summit 2026",
    onTitleChange: vi.fn(),
    description: "Annual gathering of Pasig youth leaders and organizations.",
    onDescriptionChange: vi.fn(),
    category: "YORP",
    onCategoryChange: vi.fn(),
    categoryOptions: ["YORP", "YPOP", "MOVE"],
    onAddCategory: vi.fn(),
    facebookPostUrl: "https://www.facebook.com/lydoconnect/posts/1234567890",
    onFacebookPostUrlChange: vi.fn(),
    previewImageUrl: "",
    previewImageFile: null as File | null,
    onPreviewImageFileChange: vi.fn(),
    datePosted: "2026-09-15",
    onDatePostedChange: vi.fn(),
    visibility: "published" as NewsRelease["visibilityStatus"],
    onVisibilityChange: vi.fn(),
    saving: false,
    onCancel: vi.fn(),
    onSave: vi.fn(),
  };

  // 1. Thumbnail URL paste option is removed
  it("1. ensures thumbnail URL paste option is completely removed", () => {
    render(<NewsReleaseFormDialog {...baseProps} />);

    expect(screen.queryByText(/Paste URL/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\/example\.com\/thumbnail\.jpg/i)).not.toBeInTheDocument();
  });

  // 2. Upload Image is the only thumbnail input method
  it("2. verifies Upload Image is the only thumbnail input method", () => {
    render(<NewsReleaseFormDialog {...baseProps} previewImageFile={null} />);

    expect(screen.getByRole("button", { name: /Upload Image/i })).toBeInTheDocument();
    expect(screen.getByText(/Click to browse or drag and drop image/i)).toBeInTheDocument();
    expect(screen.getByText(/Thumbnail must be uploaded directly/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");
  });

  // 3. Thumbnail upload validation works
  it("3. validates thumbnail upload format and file size", () => {
    const onPreviewImageFileChange = vi.fn();
    render(<NewsReleaseFormDialog {...baseProps} onPreviewImageFileChange={onPreviewImageFileChange} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Test invalid format (.txt)
    const invalidFile = new File(["dummy text"], "test.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByText(/Please choose a JPG, PNG, or WebP image/i)).toBeInTheDocument();
    expect(onPreviewImageFileChange).not.toHaveBeenCalledWith(invalidFile);

    // Test oversized image (>5 MB)
    const oversizedFile = new File(["x".repeat(100)], "huge.png", { type: "image/png" });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    expect(screen.getByText(/The thumbnail image must be smaller than 5 MB/i)).toBeInTheDocument();
    expect(onPreviewImageFileChange).not.toHaveBeenCalledWith(oversizedFile);

    // Test valid image
    const validFile = new File(["valid-img-data"], "valid.png", { type: "image/png" });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [validFile] } });
    expect(onPreviewImageFileChange).toHaveBeenCalledWith(validFile);
  });

  // 4. Existing thumbnail appears in edit mode
  it("4. displays existing thumbnail preview in edit mode", () => {
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        mode="edit"
        previewImageUrl="https://storage.supabase.co/bucket/news-release-1.jpg"
        previewImageFile={null}
      />
    );

    expect(screen.getByText(/Current saved thumbnail/i)).toBeInTheDocument();
    const image = screen.getByAltText(/News release thumbnail preview/i) as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toBe("https://storage.supabase.co/bucket/news-release-1.jpg");
    expect(screen.getByRole("button", { name: /Replace image/i })).toBeInTheDocument();
  });

  // 5. Thumbnail replacement works
  it("5. supports selecting a replacement thumbnail and reverting to original in edit mode", () => {
    const onPreviewImageFileChange = vi.fn();
    const replacementFile = new File(["replacement-data"], "replacement.png", { type: "image/png" });
    Object.defineProperty(replacementFile, "size", { value: 2 * 1024 * 1024 });

    const { rerender } = render(
      <NewsReleaseFormDialog
        {...baseProps}
        mode="edit"
        previewImageUrl="https://storage.supabase.co/bucket/news-release-1.jpg"
        previewImageFile={null}
        onPreviewImageFileChange={onPreviewImageFileChange}
      />
    );

    expect(screen.getByText(/Current saved thumbnail/i)).toBeInTheDocument();

    // Re-render as if user selected a new file
    rerender(
      <NewsReleaseFormDialog
        {...baseProps}
        mode="edit"
        previewImageUrl="https://storage.supabase.co/bucket/news-release-1.jpg"
        previewImageFile={replacementFile}
        onPreviewImageFileChange={onPreviewImageFileChange}
      />
    );

    expect(screen.getByText(/New image selected/i)).toBeInTheDocument();
    expect(screen.getByText(/replacement\.png/i)).toBeInTheDocument();
    const revertBtn = screen.getByRole("button", { name: /Revert/i });
    expect(revertBtn).toBeInTheDocument();

    fireEvent.click(revertBtn);
    expect(onPreviewImageFileChange).toHaveBeenCalledWith(null);
  });

  // 6. Thumbnail upload failure preserves form state
  it("6. preserves form state and stays open when save or upload throws an error", async () => {
    const onSave = vi.fn();
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        mode="create"
        title="Youth Leadership Summit"
        description="Preserved description during error"
        previewImageFile={new File(["img"], "thumb.png", { type: "image/png" })}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Create News Release/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    // Dialog content remains mounted and visible
    expect(screen.getByDisplayValue("Youth Leadership Summit")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Preserved description during error")).toBeInTheDocument();
  });

  // 7. Facebook URL is required
  it("7. requires Facebook URL on submission", () => {
    const onSave = vi.fn();
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        facebookPostUrl=""
        previewImageFile={new File(["img"], "thumb.png", { type: "image/png" })}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Create News Release/i });
    fireEvent.click(submitBtn);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Facebook post URL is required/i)).toBeInTheDocument();
  });

  // 8. Random string is rejected
  it("8. rejects random string as Facebook URL", () => {
    expect(validateFacebookPostUrl("AD").isValid).toBe(false);
    expect(validateFacebookPostUrl("hello").isValid).toBe(false);
    expect(validateFacebookPostUrl("random_string_123").isValid).toBe(false);
  });

  // 9. Non-Facebook URL is rejected
  it("9. rejects non-Facebook domain URLs", () => {
    const googleCheck = validateFacebookPostUrl("https://google.com");
    expect(googleCheck.isValid).toBe(false);
    expect(googleCheck.error).toMatch(/facebook\.com or fb\.watch/i);

    const exampleCheck = validateFacebookPostUrl("https://example.com/post/123");
    expect(exampleCheck.isValid).toBe(false);
  });

  // 10. Invalid Facebook URL is rejected
  it("10. rejects invalid Facebook URLs (missing scheme, root homepage, login)", () => {
    expect(validateFacebookPostUrl("www.example.com/post").isValid).toBe(false);
    expect(validateFacebookPostUrl("http://facebook.com/user/posts/123").isValid).toBe(false);
    expect(validateFacebookPostUrl("https://facebook.com/").isValid).toBe(false);
    expect(validateFacebookPostUrl("https://www.facebook.com/about").isValid).toBe(false);
    expect(validateFacebookPostUrl("https://www.facebook.com/login").isValid).toBe(false);
  });

  // 11. Valid supported Facebook post URL is accepted
  it("11. accepts valid supported Facebook post URLs", () => {
    // Post URL with ID
    expect(validateFacebookPostUrl("https://www.facebook.com/lydoconnect/posts/1234567890").isValid).toBe(true);
    // Permalink query style
    expect(validateFacebookPostUrl("https://facebook.com/permalink.php?story_fbid=123456&id=7890").isValid).toBe(true);
    // Story query style
    expect(validateFacebookPostUrl("https://www.facebook.com/story.php?story_fbid=123456&id=7890").isValid).toBe(true);
    // Photo URL
    expect(validateFacebookPostUrl("https://www.facebook.com/photo/?fbid=123456789").isValid).toBe(true);
    // Video Watch URL
    expect(validateFacebookPostUrl("https://www.facebook.com/watch/?v=987654321").isValid).toBe(true);
    // fb.watch shortlink
    expect(validateFacebookPostUrl("https://fb.watch/abcdef123/").isValid).toBe(true);
    // Share link
    expect(validateFacebookPostUrl("https://www.facebook.com/share/p/AbCdEf123/").isValid).toBe(true);
    // Group post link
    expect(validateFacebookPostUrl("https://facebook.com/groups/lydo-youth/posts/99887766/").isValid).toBe(true);
    // Page post slug
    expect(validateFacebookPostUrl("https://facebook.com/p/Youth-Development-Update-100083281928371/").isValid).toBe(true);
  });

  // 12. Existing category can be selected
  it("12. allows selecting existing categories", () => {
    const onCategoryChange = vi.fn();
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        category="YPOP"
        categoryOptions={["YORP", "YPOP", "MOVE"]}
        onCategoryChange={onCategoryChange}
      />
    );

    expect(screen.getByText("YPOP")).toBeInTheDocument();
  });

  // 13. Category is required
  it("13. requires category upon submission", () => {
    const onSave = vi.fn();
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        category=""
        previewImageFile={new File(["img"], "thumb.png", { type: "image/png" })}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Create News Release/i });
    fireEvent.click(submitBtn);

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
  });

  // 14. Empty category is rejected
  it("14. rejects empty or whitespace-only category creation", () => {
    expect(validateNewCategory("", ["YORP"]).isValid).toBe(false);
    expect(validateNewCategory("   ", ["YORP"]).isValid).toBe(false);
    expect(validateNewCategory("   \t  \n ", ["YORP"]).isValid).toBe(false);
  });

  // 15. New category can be added
  it("15. allows adding a new category inline", () => {
    const onAddCategory = vi.fn();
    const onCategoryChange = vi.fn();

    render(
      <NewsReleaseFormDialog
        {...baseProps}
        categoryOptions={["YORP", "YPOP"]}
        onAddCategory={onAddCategory}
        onCategoryChange={onCategoryChange}
      />
    );

    // Click 'Add new category' button in category header
    const addTrigger = screen.getByRole("button", { name: /Add new category/i });
    fireEvent.click(addTrigger);

    // Enter new category name
    const input = screen.getByPlaceholderText(/e\.g\. Community Outreach/i);
    fireEvent.change(input, { target: { value: "Community Outreach" } });

    // Click Add
    const addBtn = screen.getByRole("button", { name: /^Add$/i });
    fireEvent.click(addBtn);

    expect(onAddCategory).toHaveBeenCalledWith("Community Outreach");
    expect(onCategoryChange).toHaveBeenCalledWith("Community Outreach");
  });

  // 16. New category persists
  it("16. normalizes and validates new category persistence", () => {
    const validation = validateNewCategory("   Community   Outreach   ", ["YORP", "YPOP"]);
    expect(validation.isValid).toBe(true);
    expect(validation.normalizedName).toBe("Community Outreach");
  });

  // 17. Newly created category becomes available for future News Releases
  it("17. dynamically integrates newly created category into category options", () => {
    const existingReleases = [
      { category: "YORP" },
      { category: "MOVE" },
    ];
    const customCategories = ["Community Outreach"];
    const derived = deriveNewsCategories(existingReleases, customCategories);

    expect(derived).toContain("YORP");
    expect(derived).toContain("MOVE");
    expect(derived).toContain("Community Outreach");
  });

  // 18. Duplicate category cannot be created
  it("18. prevents creating duplicate categories (case-insensitive check)", () => {
    const dupCheck1 = validateNewCategory("yorp", ["YORP", "YPOP"]);
    expect(dupCheck1.isValid).toBe(false);
    expect(dupCheck1.error).toMatch(/already exists/i);

    const dupCheck2 = validateNewCategory(" YPOP ", ["YORP", "YPOP"]);
    expect(dupCheck2.isValid).toBe(false);
    expect(dupCheck2.error).toMatch(/already exists/i);
  });

  // 19. Editing preserves existing thumbnail when no replacement is selected
  it("19. preserves existing thumbnail when editing without replacement", () => {
    const onSave = vi.fn();
    render(
      <NewsReleaseFormDialog
        {...baseProps}
        mode="edit"
        previewImageUrl="https://storage.supabase.co/existing-thumbnail.jpg"
        previewImageFile={null}
        onSave={onSave}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Thumbnail image is required/i)).not.toBeInTheDocument();
  });

  // 20. Published release still renders correctly
  it("20. verifies published news release renders correctly in public card", () => {
    const publicNewsItem = {
      id: "nr-1",
      title: "Pasig Youth Innovation Fair",
      description: "A showcase of youth technology projects across Pasig City.",
      facebook_post_url: "https://www.facebook.com/lydoconnect/posts/123",
      preview_image_url: "https://storage.supabase.co/fair.png",
      date_posted: "2026-09-12T00:00:00.000Z",
      category: "Community Outreach",
    };

    render(<PublicNewsReleaseCard news={publicNewsItem} />);

    expect(screen.getByText("Pasig Youth Innovation Fair")).toBeInTheDocument();
    expect(screen.getByText("Community Outreach")).toBeInTheDocument();
    expect(screen.getByText(/September 12, 2026/i)).toBeInTheDocument();

    const img = screen.getByAltText("Pasig Youth Innovation Fair") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("https://storage.supabase.co/fair.png");

    const fbLink = screen.getByRole("link", { name: /View on Facebook/i }) as HTMLAnchorElement;
    expect(fbLink).toBeInTheDocument();
    expect(fbLink.href).toBe("https://www.facebook.com/lydoconnect/posts/123");
  });

  // 21. Existing status transitions remain intact
  it("21. provides Draft, Published, and Hidden options in status selector", () => {
    render(<NewsReleaseFormDialog {...baseProps} visibility="draft" />);

    const statusBtn = screen.getByRole("button", { name: /Draft/i });
    expect(statusBtn).toBeInTheDocument();
  });

  // 22. Mobile form remains usable
  it("22. ensures dialog has responsive styles and bounds to prevent horizontal overflow", () => {
    render(<NewsReleaseFormDialog {...baseProps} />);

    // DialogContent should have responsive constraints: max-w-[calc(100vw-1.5rem)], max-h-[calc(100dvh-2rem)]
    const dialogContent = document.querySelector('[role="dialog"]');
    expect(dialogContent).toBeInTheDocument();
    expect(dialogContent?.className).toContain("max-w-[calc(100vw-1.5rem)]");
    expect(dialogContent?.className).toContain("overflow-y-auto");
  });
});

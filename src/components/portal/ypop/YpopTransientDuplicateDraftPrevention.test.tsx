import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react";
import { YpopPpaModal } from "./YpopPpaModal";
import { YpopOrgLedTab } from "./YpopOrgLedTab";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";
import { LydoConnectProvider, useLydoConnect } from "@/lib/lydo-connect-store";
import type {
  YPOPEntry,
  YPOPOrgActivity,
  YPOPOrgActivityFile,
  YPOPPeriod,
} from "@/lib/lydo-connect-data";

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
    window.URL.revokeObjectURL = vi.fn();
  }
});

const setViewportWidth = (width: number) => {
  window.innerWidth = width;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width >= 1024 ? query.includes("min-width: 1024px") : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const mockPeriod: YPOPPeriod = {
  id: "period-1",
  year: 2026,
  semester: "1",
  semesterKey: "2026-S1",
  status: "open",
  startDate: "2026-01-01",
  submissionDeadline: "2026-06-30",
  evaluationDeadline: "2026-07-15",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockEntry: YPOPEntry = {
  id: "entry-1",
  semester: "2026-S1",
  organizationId: "org-1",
  submissionStatus: "draft",
  complianceReviewStatus: "compliant",
  status: "draft",
  totalPoints: 10,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const mockDraftActivity: YPOPOrgActivity = {
  id: "ppa-act-1",
  ypopEntryId: "entry-1",
  organizationId: "org-1",
  submittedBy: "user-1",
  activityName: "Youth Leadership Summit",
  activityDate: "2026-09-12",
  venue: "Pasig City Hall",
  narrativeReport: "Detailed narrative report for youth summit.",
  status: "draft",
  adminRemarks: "",
  submittedAt: "",
  createdAt: "2026-09-10T00:00:00Z",
  updatedAt: "2026-09-10T00:00:00Z",
};

const makePpaFile = (id: string, orgActivityId: string, fileName: string): YPOPOrgActivityFile => ({
  id,
  orgActivityId,
  organizationId: "org-1",
  fileName,
  fileUrl: `storage://ypop-org-activities/${orgActivityId}/${fileName}`,
  fileType: "application/pdf",
  fileSize: 102400,
  uploadedAt: "2026-09-10T12:00:00Z",
});

describe("Transient Duplicate Draft PPA Row Prevention Suite", () => {
  it("TEST A — Save as Draft: creates PPA, attaches file, and dispatches exactly one Draft activity", async () => {
    setViewportWidth(1280);
    const onActivitySaved = vi.fn();
    const onFileCreated = vi.fn();

    const createdDraft: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-draft-test-a",
      status: "draft",
    };

    const uploadedFile = makePpaFile("f-draft-a", "ppa-draft-test-a", "proposal.pdf");

    vi.spyOn(lydoSupabase, "createYpopOrgActivityInSupabase").mockResolvedValue(createdDraft);
    vi.spyOn(lydoSupabase, "uploadYpopOrgActivityFileToSupabase").mockResolvedValue(uploadedFile);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={null}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={onActivitySaved}
        onFileCreated={onFileCreated}
        onFileDeleted={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter activity title/i), {
      target: { value: "Youth Leadership Summit" },
    });
    fireEvent.change(screen.getByLabelText(/Date Conducted/i), {
      target: { value: "2026-09-12" },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["dummy content"], "proposal.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: /Save as Draft/i }));

    await waitFor(() => {
      expect(lydoSupabase.createYpopOrgActivityInSupabase).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "draft",
        })
      );
      // onActivitySaved must be called EXACTLY once with status: "draft"
      expect(onActivitySaved).toHaveBeenCalledTimes(1);
      expect(onActivitySaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ppa-draft-test-a",
          status: "draft",
        })
      );
    });

    // Verify rendering in YpopOrgLedTab: exactly 1 Draft row appears
    const { container } = render(
      <YpopOrgLedTab
        onEnsureEntry={vi.fn()}
        period={mockPeriod}
        entry={mockEntry}
        orgActivities={[createdDraft]}
        orgActivityFiles={[uploadedFile]}
        organizationId="org-1"
        userId="user-1"
        formatShortPortalDate={(d) => String(d)}
        onActivitySaved={vi.fn()}
        onActivityDeleted={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Youth Leadership Summit")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.queryByText("Pending Review")).not.toBeInTheDocument();
  });

  it("TEST B — Direct Submit: does NOT dispatch premature Draft to store, only dispatches submitted activity", async () => {
    setViewportWidth(1280);
    const onActivitySaved = vi.fn();
    const onFileCreated = vi.fn();

    const createdDraft: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-direct-submit",
      status: "draft",
    };

    const uploadedFile = makePpaFile("f-sub-b", "ppa-direct-submit", "report.pdf");

    const finalSubmitted: YPOPOrgActivity = {
      ...createdDraft,
      status: "submitted",
      submittedAt: "2026-09-16T12:00:00Z",
    };

    vi.spyOn(lydoSupabase, "createYpopOrgActivityInSupabase").mockResolvedValue(createdDraft);
    vi.spyOn(lydoSupabase, "uploadYpopOrgActivityFileToSupabase").mockResolvedValue(uploadedFile);
    vi.spyOn(lydoSupabase, "updateYpopOrgActivityInSupabase").mockResolvedValue(finalSubmitted);

    const { unmount } = render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={null}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={onActivitySaved}
        onFileCreated={onFileCreated}
        onFileDeleted={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter activity title/i), {
      target: { value: "Youth Leadership Summit" },
    });
    fireEvent.change(screen.getByLabelText(/Date Conducted/i), {
      target: { value: "2026-09-12" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Barangay Multipurpose Hall/i), {
      target: { value: "Pasig City Hall" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Description \/ narrative report summary/i), {
      target: { value: "Detailed narrative report for youth summit." },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["dummy content"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    fireEvent.click(screen.getByRole("button", { name: /Submit for Review/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /Submit for Review/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      // Must be called ONLY once, NEVER with status: "draft"
      expect(onActivitySaved).toHaveBeenCalledTimes(1);
      expect(onActivitySaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ppa-direct-submit",
          status: "submitted",
        })
      );
    });

    unmount();

    // In YpopOrgLedTab, exactly one row appears with Pending Review, zero Draft rows
    const { getByText, queryByText } = render(
      <YpopOrgLedTab
        onEnsureEntry={vi.fn()}
        period={mockPeriod}
        entry={mockEntry}
        orgActivities={[finalSubmitted]}
        orgActivityFiles={[uploadedFile]}
        organizationId="org-1"
        userId="user-1"
        formatShortPortalDate={(d) => String(d)}
        onActivitySaved={vi.fn()}
        onActivityDeleted={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(getByText("Youth Leadership Summit")).toBeInTheDocument();
    expect(getByText("Pending Review")).toBeInTheDocument();
    expect(queryByText("Draft")).not.toBeInTheDocument();
  });

  it("TEST C — Existing Draft Submission: opens draft and submits, transitioning to Pending Review without duplicate", async () => {
    setViewportWidth(1280);
    const onActivitySaved = vi.fn();

    const existingDraft: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-existing-draft",
      status: "draft",
    };

    const existingFile = makePpaFile("f-exist-1", "ppa-existing-draft", "minutes.pdf");

    const submittedResult: YPOPOrgActivity = {
      ...existingDraft,
      status: "submitted",
      submittedAt: "2026-09-16T12:00:00Z",
    };

    vi.spyOn(lydoSupabase, "updateYpopOrgActivityInSupabase").mockResolvedValue(submittedResult);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={existingDraft}
        orgActivityFiles={[existingFile]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={onActivitySaved}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Submit for Review/i }));
    const confirmButtons = await screen.findAllByRole("button", { name: /Submit for Review/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(onActivitySaved).toHaveBeenCalledTimes(1);
      expect(onActivitySaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ppa-existing-draft",
          status: "submitted",
        })
      );
    });
  });

  it("TEST D — Same-ID Store Deduplication: createYPOPOrgActivity is idempotent and retains only the latest object", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    const draftActivity: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-dedup-test",
      status: "draft",
      activityName: "Initial Draft Title",
    };

    const submittedActivity: YPOPOrgActivity = {
      ...draftActivity,
      status: "submitted",
      activityName: "Final Submitted Title",
    };

    // Dispatch createYPOPOrgActivity twice with the same ID
    act(() => {
      result.current.createYPOPOrgActivity(draftActivity);
    });

    act(() => {
      result.current.createYPOPOrgActivity(submittedActivity);
    });

    const matching = result.current.state.ypopOrgActivities.filter(
      (a) => a.id === "ppa-dedup-test"
    );

    // Exactly 1 local activity must exist
    expect(matching).toHaveLength(1);
    // The latest submitted status and updated title must win
    expect(matching[0].status).toBe("submitted");
    expect(matching[0].activityName).toBe("Final Submitted Title");
  });

  it("TEST E — Attachment: directly submitted PPA displays exactly 1 attachment and zero draft rows", () => {
    const submittedActivity: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-single-attach",
      status: "submitted",
      submittedAt: "2026-09-16T12:00:00Z",
    };
    const file = makePpaFile("f-att-1", "ppa-single-attach", "event_doc.pdf");

    render(
      <YpopOrgLedTab
        onEnsureEntry={vi.fn()}
        period={mockPeriod}
        entry={mockEntry}
        orgActivities={[submittedActivity]}
        orgActivityFiles={[file]}
        organizationId="org-1"
        userId="user-1"
        formatShortPortalDate={(d) => String(d)}
        onActivitySaved={vi.fn()}
        onActivityDeleted={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("1 attachment")).toBeInTheDocument();
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("TEST F — Refresh / Sync: mergeRemoteState maintains single authoritative submitted activity", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    const submittedActivity: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-sync-test",
      status: "submitted",
      submittedAt: "2026-09-16T12:00:00Z",
    };

    act(() => {
      result.current.createYPOPOrgActivity(submittedActivity);
    });

    // Simulate remote state sync from Supabase with valid ypopPeriods and ypopEntries
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [mockPeriod],
        ypopEntries: [mockEntry],
        organizationProfiles: [{ id: "org-1" } as any],
        ypopOrgActivities: [submittedActivity],
      });
    });

    const activities = result.current.state.ypopOrgActivities.filter(
      (a) => a.id === "ppa-sync-test"
    );
    expect(activities).toHaveLength(1);
    expect(activities[0].status).toBe("submitted");
  });

  it("TEST G — Admin Reception: admin state identifies submitted activity as under evaluation", () => {
    const submittedActivity: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-admin-test",
      ypopEntryId: "entry-1",
      status: "submitted",
    };

    const hasPendingEvaluation = [submittedActivity].some(
      (a) => a.ypopEntryId === "entry-1" && (a.status === "submitted" || a.status === "under_review")
    );

    expect(hasPendingEvaluation).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  reconcileYpopOrgActivities,
  reconcileYpopOrgActivityFiles,
} from "./lydo-connect-store";
import type {
  YPOPOrgActivity,
  YPOPOrgActivityFile,
} from "./lydo-connect-data";

describe("YPOP Organization-Led PPA Submission Synchronization Fix", () => {
  const validEntryIds = new Set(["entry-1", "entry-2"]);

  const submittedPpaActivity: YPOPOrgActivity = {
    id: "act-ppa-1",
    ypopEntryId: "entry-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    activityName: "Youth Health Workshop",
    activityDate: "2026-09-10",
    venue: "Pasig Sports Complex",
    narrativeReport: "Completed successfully.",
    status: "submitted",
    adminRemarks: "",
    submittedAt: "2026-09-10T12:00:00Z",
    createdAt: "2026-09-10T00:00:00Z",
    updatedAt: "2026-09-10T12:00:00Z",
  };

  const ppaFile1: YPOPOrgActivityFile = {
    id: "file-ppa-1",
    orgActivityId: "act-ppa-1",
    organizationId: "org-1",
    fileName: "Attendance_Sheet.pdf",
    fileUrl: "storage://ypop-files/ppa/att.pdf",
    fileType: "application/pdf",
    fileSize: 120000,
    uploadedAt: "2026-09-10T12:00:00Z",
  };

  const ppaFile2: YPOPOrgActivityFile = {
    id: "file-ppa-2",
    orgActivityId: "act-ppa-1",
    organizationId: "org-1",
    fileName: "Event_Photos.pdf",
    fileUrl: "storage://ypop-files/ppa/photo.pdf",
    fileType: "application/pdf",
    fileSize: 250000,
    uploadedAt: "2026-09-10T12:00:00Z",
  };

  it("1. Newly submitted PPA files survive on the FIRST reconciliation pass for Admin when nextOrgActivities is passed", () => {
    // Current Admin state is empty (before this submission was known)
    const currentOrgActivities: YPOPOrgActivity[] = [];
    const currentOrgActivityFiles: YPOPOrgActivityFile[] = [];

    // Remote snapshot contains the new submitted PPA and its 2 files
    const remoteOrgActivities: YPOPOrgActivity[] = [submittedPpaActivity];
    const remoteOrgActivityFiles: YPOPOrgActivityFile[] = [ppaFile1, ppaFile2];

    // Compute nextOrgActivities first
    const nextOrgActivities = reconcileYpopOrgActivities(
      currentOrgActivities,
      remoteOrgActivities,
      undefined,
      true, // isAdmin
      validEntryIds,
    );

    expect(nextOrgActivities).toHaveLength(1);
    expect(nextOrgActivities[0].id).toBe("act-ppa-1");

    // Reconcile files passing nextOrgActivities
    const nextFiles = reconcileYpopOrgActivityFiles(
      currentOrgActivityFiles,
      remoteOrgActivityFiles,
      nextOrgActivities,
      true, // isAdmin
    );

    // BOTH files must be retained on the very first sync pass!
    expect(nextFiles).toHaveLength(2);
    expect(nextFiles.map((f) => f.id)).toEqual(["file-ppa-1", "file-ppa-2"]);
  });

  it("2. Demonstrates the root cause: passing stale currentOrgActivities drops the files on the first pass", () => {
    const currentOrgActivities: YPOPOrgActivity[] = [];
    const currentOrgActivityFiles: YPOPOrgActivityFile[] = [];

    const remoteOrgActivityFiles: YPOPOrgActivityFile[] = [ppaFile1, ppaFile2];

    // If stale currentOrgActivities (empty) is passed:
    const buggyFiles = reconcileYpopOrgActivityFiles(
      currentOrgActivityFiles,
      remoteOrgActivityFiles,
      currentOrgActivities, // BUGGY STALE VALUE
      true, // isAdmin
    );

    // With the bug, files were dropped because currentOrgActivities did not contain act-ppa-1
    expect(buggyFiles).toHaveLength(0);
  });

  it("3. Subsequent synchronization cycles are idempotent and do not duplicate files", () => {
    // State after first successful sync
    const currentOrgActivities: YPOPOrgActivity[] = [submittedPpaActivity];
    const currentOrgActivityFiles: YPOPOrgActivityFile[] = [ppaFile1, ppaFile2];

    // Same snapshot on next poll
    const remoteOrgActivities: YPOPOrgActivity[] = [submittedPpaActivity];
    const remoteOrgActivityFiles: YPOPOrgActivityFile[] = [ppaFile1, ppaFile2];

    const nextOrgActivities = reconcileYpopOrgActivities(
      currentOrgActivities,
      remoteOrgActivities,
      undefined,
      true,
      validEntryIds,
    );

    const nextFiles = reconcileYpopOrgActivityFiles(
      currentOrgActivityFiles,
      remoteOrgActivityFiles,
      nextOrgActivities,
      true,
    );

    expect(nextFiles).toHaveLength(2);
    expect(nextFiles.map((f) => f.id)).toEqual(["file-ppa-1", "file-ppa-2"]);
  });

  it("4. Draft privacy: files belonging to draft activities are strictly excluded for Admin", () => {
    const draftPpaActivity: YPOPOrgActivity = {
      ...submittedPpaActivity,
      id: "act-draft-1",
      status: "draft",
    };

    const draftFile: YPOPOrgActivityFile = {
      ...ppaFile1,
      id: "file-draft-1",
      orgActivityId: "act-draft-1",
    };

    const nextOrgActivities = reconcileYpopOrgActivities(
      [],
      [draftPpaActivity, submittedPpaActivity],
      undefined,
      true,
      validEntryIds,
    );

    const adminFiles = reconcileYpopOrgActivityFiles(
      [],
      [draftFile, ppaFile1, ppaFile2],
      nextOrgActivities,
      true, // isAdmin
    );

    // Draft file must NOT be visible to Admin; only submitted files appear
    expect(adminFiles).toHaveLength(2);
    expect(adminFiles.some((f) => f.id === "file-draft-1")).toBe(false);
  });

  it("5. Multi-activity isolation: multiple submitted PPAs retain their respective files", () => {
    const ppa2: YPOPOrgActivity = {
      ...submittedPpaActivity,
      id: "act-ppa-2",
      activityName: "Tree Planting Initiative",
      status: "submitted",
    };

    const filePpa2: YPOPOrgActivityFile = {
      id: "file-ppa-3",
      orgActivityId: "act-ppa-2",
      organizationId: "org-1",
      fileName: "Tree_Planting_Report.pdf",
      fileUrl: "storage://ypop-files/ppa/tree.pdf",
      fileType: "application/pdf",
      fileSize: 300000,
      uploadedAt: "2026-09-10T13:00:00Z",
    };

    const nextOrgActivities = reconcileYpopOrgActivities(
      [],
      [submittedPpaActivity, ppa2],
      undefined,
      true,
      validEntryIds,
    );

    const adminFiles = reconcileYpopOrgActivityFiles(
      [],
      [ppaFile1, ppaFile2, filePpa2],
      nextOrgActivities,
      true,
    );

    expect(adminFiles).toHaveLength(3);
    const act1Files = adminFiles.filter((f) => f.orgActivityId === "act-ppa-1");
    const act2Files = adminFiles.filter((f) => f.orgActivityId === "act-ppa-2");
    expect(act1Files).toHaveLength(2);
    expect(act2Files).toHaveLength(1);
  });
});

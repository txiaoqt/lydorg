import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  formatActivityActionLabel,
  formatDocumentActivityLabel,
  RecentActivityList,
} from "./RecentActivityPreview";
import { UserPortalDocumentWorkspaceView } from "../portal/UserPortalDocumentWorkspaceView";
import type { ActivityLog } from "@/lib/lydo-connect-data";

describe("Recent Activity Scoping and User-Facing Copy Suite", () => {
  const mockTemplates = [
    { id: "doc-cbl", name: "Constitution and By-Laws", isRequired: true, isActive: true },
    { id: "doc-form-b", name: "NYC YORP Registration Form (Form B)", isRequired: true, isActive: true },
    { id: "doc-officers", name: "YORP Directory of Officers and Adviser", isRequired: true, isActive: true },
    { id: "doc-form-a", name: "Pasig City YORP Registration Form (Form A)", isRequired: true, isActive: true },
  ];

  describe("formatActivityActionLabel & formatDocumentActivityLabel", () => {
    it("formats document submissions dynamically with requirement names", () => {
      const logSubmitted = {
        action: "submitted",
        metadata: { documentTypeName: "Constitution and By-Laws" },
      };
      expect(formatDocumentActivityLabel(logSubmitted, mockTemplates)).toBe(
        "Constitution and By-Laws submitted for review"
      );

      const logApproved = {
        action: "approved",
        metadata: { documentTypeName: "NYC YORP Registration Form (Form B)" },
      };
      expect(formatDocumentActivityLabel(logApproved, mockTemplates)).toBe(
        "NYC YORP Registration Form (Form B) approved"
      );

      const logRevision = {
        action: "needs_revision",
        metadata: { documentTypeName: "YORP Directory of Officers and Adviser" },
      };
      expect(formatDocumentActivityLabel(logRevision, mockTemplates)).toBe(
        "YORP Directory of Officers and Adviser needs revision"
      );

      const logRejected = {
        action: "rejected",
        metadata: { documentTypeName: "Pasig City YORP Registration Form (Form A)" },
      };
      expect(formatDocumentActivityLabel(logRejected, mockTemplates)).toBe(
        "Pasig City YORP Registration Form (Form A) rejected"
      );
    });

    it("resolves requirement name from relatedId when metadata is not provided", () => {
      const log = {
        action: "approved_green",
        relatedId: "doc-cbl",
      };
      expect(formatDocumentActivityLabel(log, mockTemplates)).toBe(
        "Constitution and By-Laws approved"
      );
    });

    it("extracts document names from standard notification descriptions", () => {
      expect(
        formatActivityActionLabel(
          "The admin requested revisions for Constitution and By-Laws. Remarks: Missing dry seal."
        )
      ).toBe("Constitution and By-Laws needs revision");

      expect(
        formatActivityActionLabel(
          "Your registration document 'NYC YORP Registration Form (Form B)' has been approved by the admin."
        )
      ).toBe("NYC YORP Registration Form (Form B) approved");

      expect(
        formatActivityActionLabel(
          "Organization account permanently suspended due to rejected registration document: Constitution and By-Laws."
        )
      ).toBe("Constitution and By-Laws rejected");
    });

    it("formats batch documents and generic document actions cleanly", () => {
      expect(formatActivityActionLabel("submitted_batch_document_review")).toBe(
        "Batch Documents Submitted"
      );
      expect(formatActivityActionLabel("batch_submitted")).toBe("Batch Documents Submitted");
      expect(formatActivityActionLabel("reviewed_documents")).toBe("Documents Reviewed");
      expect(formatActivityActionLabel("approved_documents")).toBe("Documents Approved");
      expect(formatActivityActionLabel("document_review_decision_updated")).toBe(
        "Document Reviewed"
      );
    });

    it("formats liquidation and budget activities with natural user-facing phrases", () => {
      expect(formatActivityActionLabel("completed_liquidation_report")).toBe(
        "Liquidation Report Completed"
      );
      expect(formatActivityActionLabel("reviewed_liquidation_report")).toBe(
        "Liquidation Report Reviewed"
      );
      expect(formatActivityActionLabel("approved_liquidation_report")).toBe(
        "Liquidation Report Approved"
      );
      expect(formatActivityActionLabel("submitted_liquidation_report")).toBe(
        "Liquidation Report Submitted"
      );

      expect(formatActivityActionLabel("submitted_budget_request")).toBe(
        "Budget Request Submitted"
      );
      expect(formatActivityActionLabel("approved_budget_request")).toBe(
        "Budget Request Approved"
      );
      expect(formatActivityActionLabel("budget_released")).toBe("Budget Released");
    });

    it("does not expose internal technical system jargon", () => {
      const technicalWords = [
        "admin_notification_dispatched",
        "notification_dispatched",
        "rpc_trigger_execution",
        "database_sync",
      ];

      for (const word of technicalWords) {
        const formatted = formatActivityActionLabel(word);
        expect(formatted).not.toContain("Admin Notification Dispatched");
        expect(formatted).not.toMatch(/\b(RPC|Trigger|Database|API)\b/);
      }
    });
  });

  describe("Document Submission Recent Activity Isolation", () => {
    it("renders document activities and displays requirement names in Document Workspace", () => {
      const mockSubmissionLogs = [
        {
          id: "log-1",
          action: "submitted",
          metadata: { documentTypeName: "Constitution and By-Laws" },
          createdAt: "2026-08-06T03:33:00Z",
        },
        {
          id: "log-2",
          action: "approved",
          metadata: { documentTypeName: "NYC YORP Registration Form (Form B)" },
          createdAt: "2026-08-05T03:33:00Z",
        },
      ];

      render(
        <UserPortalDocumentWorkspaceView
          currentProfile={{ id: "org-1" }}
          templateDocuments={mockTemplates}
          templatesById={{}}
          docFiles={[]}
          submissionLogs={mockSubmissionLogs}
          navigate={vi.fn()}
          userRouteMap={{}}
        />
      );

      expect(
        screen.getByText("Constitution and By-Laws submitted for review")
      ).toBeInTheDocument();
      expect(
        screen.getByText("NYC YORP Registration Form (Form B) approved")
      ).toBeInTheDocument();
      expect(screen.queryByText("Admin Notification Dispatched")).not.toBeInTheDocument();
      expect(screen.queryByText("Completed Liquidation Report")).not.toBeInTheDocument();
    });

    it("renders clean empty state when no document activity exists", () => {
      render(
        <UserPortalDocumentWorkspaceView
          currentProfile={{ id: "org-1" }}
          templateDocuments={mockTemplates}
          templatesById={{}}
          docFiles={[]}
          submissionLogs={[]}
          navigate={vi.fn()}
          userRouteMap={{}}
        />
      );

      expect(screen.getByText("No recent activity.")).toBeInTheDocument();
    });
  });
});

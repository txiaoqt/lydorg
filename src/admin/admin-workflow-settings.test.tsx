import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeWorkflowItemTiming,
  shouldNotifyOrganization,
  shouldNotifyAdmin,
  shouldLogActivityType,
  validateSystemSettingValue,
  getEffectiveSystemSetting,
  DEFAULT_SYSTEM_SETTINGS_VALUES,
  ADMIN_SETTING_DEFINITIONS_BY_KEY,
} from "@/lib/admin-system-settings";
import { matchesLiquidationStatusFilter } from "@/admin/components/LiquidationReportsTable";

describe("Admin System Settings — Workflow Functional Suite", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("1. Review Reminders (workflow.review_reminder_enabled & workflow.review_reminder_days)", () => {
    it("flags submission as reminder due when enabled and age exceeds review_reminder_days", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
      const result = computeWorkflowItemTiming(fiveDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 3,
          "workflow.escalate_after_days": 7,
          "workflow.overdue_indicators_enabled": true,
        },
      });

      expect(result.ageInDays).toBe(5);
      expect(result.isReminderDue).toBe(true);
      expect(result.isEscalated).toBe(false);
      expect(result.riskLabel).toBe("Needs Attention");
    });

    it("suppresses reminder due flag when review_reminder_enabled is false", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
      const result = computeWorkflowItemTiming(fiveDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": false,
          "workflow.review_reminder_days": 3,
          "workflow.escalate_after_days": 7,
          "workflow.overdue_indicators_enabled": true,
        },
      });

      expect(result.ageInDays).toBe(5);
      expect(result.isReminderDue).toBe(false);
      expect(result.isEscalated).toBe(false);
      expect(result.riskLabel).toBe("On Track");
    });

    it("dynamically respects custom review_reminder_days thresholds (e.g. 5 vs 10)", () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // With 5 days threshold -> should be reminder due
      const result5 = computeWorkflowItemTiming(sevenDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 5,
          "workflow.escalate_after_days": 14,
        },
      });
      expect(result5.isReminderDue).toBe(true);
      expect(result5.riskLabel).toBe("Needs Attention");

      // With 10 days threshold -> should NOT yet be reminder due
      const result10 = computeWorkflowItemTiming(sevenDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 10,
          "workflow.escalate_after_days": 14,
        },
      });
      expect(result10.isReminderDue).toBe(false);
      expect(result10.riskLabel).toBe("On Track");
    });
  });

  describe("2. Escalation Threshold (workflow.escalate_after_days)", () => {
    it("marks submissions exceeding escalate_after_days as escalated/urgent", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
      const result = computeWorkflowItemTiming(eightDaysAgo, {
        customSettings: {
          "workflow.review_reminder_enabled": true,
          "workflow.review_reminder_days": 3,
          "workflow.escalate_after_days": 7,
          "workflow.overdue_indicators_enabled": true,
        },
      });

      expect(result.ageInDays).toBe(8);
      expect(result.isEscalated).toBe(true);
      expect(result.isOverdue).toBe(true);
      expect(result.riskLabel).toBe("Overdue");
    });

    it("dynamically changes escalation state when threshold is adjusted (e.g. 7 -> 10)", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();

      // At 7 days threshold -> escalated
      const result7 = computeWorkflowItemTiming(eightDaysAgo, {
        customSettings: {
          "workflow.escalate_after_days": 7,
          "workflow.overdue_indicators_enabled": true,
        },
      });
      expect(result7.isEscalated).toBe(true);

      // At 10 days threshold -> not yet escalated
      const result10 = computeWorkflowItemTiming(eightDaysAgo, {
        customSettings: {
          "workflow.escalate_after_days": 10,
          "workflow.overdue_indicators_enabled": true,
        },
      });
      expect(result10.isEscalated).toBe(false);
    });
  });

  describe("3. Overdue Indicators (workflow.overdue_indicators_enabled)", () => {
    it("shows overdue riskLabel when overdue_indicators_enabled is true for past deadline items", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const result = computeWorkflowItemTiming(yesterday, {
        isDeadline: true,
        customSettings: {
          "workflow.overdue_indicators_enabled": true,
        },
      });

      expect(result.isOverdue).toBe(true);
      expect(result.riskLabel).toBe("Overdue");
    });

    it("suppresses overdue indicator when overdue_indicators_enabled is false", () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const result = computeWorkflowItemTiming(yesterday, {
        isDeadline: true,
        customSettings: {
          "workflow.overdue_indicators_enabled": false,
        },
      });

      expect(result.isOverdue).toBe(false);
      expect(result.riskLabel).toBe("Needs Attention");
    });

    it("matchesLiquidationStatusFilter respects overdueEnabled toggle", () => {
      const pastDeadline = new Date(Date.now() - 86400000).toISOString();
      expect(matchesLiquidationStatusFilter("submitted", "overdue", pastDeadline, true)).toBe(true);
      expect(matchesLiquidationStatusFilter("submitted", "overdue", pastDeadline, false)).toBe(false);
    });
  });

  describe("4. Organization Notification Switches (shouldNotifyOrganization)", () => {
    it("controls Needs Revision in-app notifications (workflow.notify_org_on_needs_revision)", () => {
      expect(shouldNotifyOrganization("needs_revision", { "workflow.notify_org_on_needs_revision": true })).toBe(true);
      expect(shouldNotifyOrganization("needs_revision", { "workflow.notify_org_on_needs_revision": false })).toBe(false);
    });

    it("controls Approval in-app notifications (workflow.notify_org_on_approved)", () => {
      expect(shouldNotifyOrganization("approved", { "workflow.notify_org_on_approved": true })).toBe(true);
      expect(shouldNotifyOrganization("approved", { "workflow.notify_org_on_approved": false })).toBe(false);
    });

    it("controls Disapproval / Rejection in-app notifications (workflow.notify_org_on_rejected)", () => {
      expect(shouldNotifyOrganization("rejected", { "workflow.notify_org_on_rejected": true })).toBe(true);
      expect(shouldNotifyOrganization("rejected", { "workflow.notify_org_on_rejected": false })).toBe(false);
    });

    it("controls Resubmission acknowledgement in-app notifications (workflow.notify_org_on_resubmitted)", () => {
      expect(shouldNotifyOrganization("resubmitted", { "workflow.notify_org_on_resubmitted": true })).toBe(true);
      expect(shouldNotifyOrganization("resubmitted", { "workflow.notify_org_on_resubmitted": false })).toBe(false);
    });
  });

  describe("5. Threshold Validation Rules", () => {
    it("validates review_reminder_days range (1 to 90)", () => {
      expect(validateSystemSettingValue("workflow.review_reminder_days", 1).valid).toBe(true);
      expect(validateSystemSettingValue("workflow.review_reminder_days", 90).valid).toBe(true);
      expect(validateSystemSettingValue("workflow.review_reminder_days", 0).valid).toBe(false);
      expect(validateSystemSettingValue("workflow.review_reminder_days", -5).valid).toBe(false);
      expect(validateSystemSettingValue("workflow.review_reminder_days", 91).valid).toBe(false);
    });

    it("validates escalate_after_days range (1 to 180)", () => {
      expect(validateSystemSettingValue("workflow.escalate_after_days", 1).valid).toBe(true);
      expect(validateSystemSettingValue("workflow.escalate_after_days", 180).valid).toBe(true);
      expect(validateSystemSettingValue("workflow.escalate_after_days", 0).valid).toBe(false);
      expect(validateSystemSettingValue("workflow.escalate_after_days", -1).valid).toBe(false);
      expect(validateSystemSettingValue("workflow.escalate_after_days", 181).valid).toBe(false);
    });
  });

  describe("6. Audit Logging Independence", () => {
    it("activity logging remains active even when workflow notifications are disabled", () => {
      // Activity logging is controlled by audit settings, not workflow notifications
      expect(shouldLogActivityType("approval")).toBe(true);
      expect(shouldLogActivityType("needs_revision")).toBe(true);
      expect(shouldLogActivityType("rejection")).toBe(true);
    });
  });

  describe("7. Transactional Email Independence", () => {
    it("send_workflow_emails remains the master transactional email switch", () => {
      const emailEnabledDef = ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.send_workflow_emails");
      expect(emailEnabledDef).toBeDefined();
      expect(emailEnabledDef?.defaultValue).toBe(true);
    });
  });

  describe("8. Workflow Settings Defaults & Metadata", () => {
    it("defines all 8 workflow settings with valid metadata and defaults", () => {
      const workflowKeys = [
        "workflow.review_reminder_enabled",
        "workflow.review_reminder_days",
        "workflow.escalate_after_days",
        "workflow.overdue_indicators_enabled",
        "workflow.notify_org_on_needs_revision",
        "workflow.notify_org_on_approved",
        "workflow.notify_org_on_rejected",
        "workflow.notify_org_on_resubmitted",
      ] as const;

      workflowKeys.forEach((key) => {
        const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(key);
        expect(def).toBeDefined();
        expect(def?.category).toBe("workflow");
        expect(DEFAULT_SYSTEM_SETTINGS_VALUES[key]).toBeDefined();
      });

      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.review_reminder_enabled"]).toBe(true);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.review_reminder_days"]).toBe(3);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.escalate_after_days"]).toBe(7);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.overdue_indicators_enabled"]).toBe(true);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.notify_org_on_needs_revision"]).toBe(true);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.notify_org_on_approved"]).toBe(true);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.notify_org_on_rejected"]).toBe(true);
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["workflow.notify_org_on_resubmitted"]).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ADMIN_SETTING_DEFINITIONS_BY_KEY,
  DEFAULT_SYSTEM_SETTINGS_VALUES,
  validateSystemSettingValue,
} from "./admin-system-settings";
import {
  buildGmailComposeUrl,
  buildInquiryGmailAccountChooserUrl,
} from "./inquiry-reply-url";

describe("Y-TRACE Inquiry Reply Workflow & Settings (Google Account Chooser Flow)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. System Settings Registry & Cleaned-up Settings", () => {
    it("email.inquiry_reply_email is completely removed from System Settings registry", () => {
      const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.inquiry_reply_email" as any);
      expect(def).toBeUndefined();
      expect((DEFAULT_SYSTEM_SETTINGS_VALUES as any)["email.inquiry_reply_email"]).toBeUndefined();
    });

    it("email.reply_to_email remains intact for automated transactional emails", () => {
      const replyToDef = ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.reply_to_email");
      expect(replyToDef).toBeDefined();
      expect(replyToDef?.key).toBe("email.reply_to_email");
      expect(replyToDef?.defaultValue).toBe("lydo@pasigcity.gov.ph");
      expect(DEFAULT_SYSTEM_SETTINGS_VALUES["email.reply_to_email"]).toBe("lydo@pasigcity.gov.ph");
    });

    it("No Gmail account selector, index, or credentials field exists in Admin System Settings", () => {
      expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.gmail_account" as any)).toBeUndefined();
      expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.gmail_user" as any)).toBeUndefined();
      expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.gmail_account_index" as any)).toBeUndefined();
      expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.gmail_authuser" as any)).toBeUndefined();
      expect(ADMIN_SETTING_DEFINITIONS_BY_KEY.get("email.inquiry_reply_email" as any)).toBeUndefined();
    });
  });

  describe("2. Gmail Compose URL Generation Helper (buildGmailComposeUrl)", () => {
    it("generates correct Gmail compose URL encoding recipient and subject without fake from or authuser param", () => {
      const recipient = "user@example.com";
      const subject = "Inquiry Regarding YPOP";
      const body = "Hello, here are the details.";

      const composeUrl = buildGmailComposeUrl({
        recipientEmail: recipient,
        subject,
        body,
      });

      expect(composeUrl).toBe(
        "https://mail.google.com/mail/?view=cm&fs=1&to=user%40example.com&su=Re%3A%20Inquiry%20Regarding%20YPOP&body=Hello%2C%20here%20are%20the%20details."
      );
      expect(composeUrl).not.toContain("/u/0");
      expect(composeUrl).not.toContain("/u/1");
      expect(composeUrl).not.toContain("authuser");
      expect(composeUrl).not.toContain("from=");
      expect(composeUrl).not.toContain("sender=");
    });

    it("preserves already prefixed 'Re:' in subject without duplicating", () => {
      const composeUrl = buildGmailComposeUrl({
        recipientEmail: "test@example.com",
        subject: "Re: Follow up on submission",
      });

      expect(composeUrl).toContain("su=Re%3A%20Follow%20up%20on%20submission");
      expect(composeUrl).not.toContain("Re%3A%20Re%3A");
    });

    it("omits body query parameter if body is empty or whitespace", () => {
      const composeUrl = buildGmailComposeUrl({
        recipientEmail: "test@example.com",
        subject: "General Question",
        body: "   ",
      });

      expect(composeUrl).toBe(
        "https://mail.google.com/mail/?view=cm&fs=1&to=test%40example.com&su=Re%3A%20General%20Question"
      );
      expect(composeUrl).not.toContain("body=");
    });
  });

  describe("3. Google Account Chooser URL Builder (buildInquiryGmailAccountChooserUrl)", () => {
    it("wraps the Gmail compose URL in Google Account Chooser continue destination with service=mail", () => {
      const recipient = "juan@pasigyouth.org";
      const subject = "YPOP Guidelines";
      const body = "Thank you for reaching out.";

      const chooserUrl = buildInquiryGmailAccountChooserUrl({
        recipientEmail: recipient,
        subject,
        body,
      });

      expect(chooserUrl.startsWith("https://accounts.google.com/AccountChooser?service=mail&continue=")).toBe(true);

      const urlObj = new URL(chooserUrl);
      expect(urlObj.origin).toBe("https://accounts.google.com");
      expect(urlObj.pathname).toBe("/AccountChooser");
      expect(urlObj.searchParams.get("service")).toBe("mail");

      const continueTarget = urlObj.searchParams.get("continue");
      expect(continueTarget).toBeDefined();

      const decodedComposeUrl = new URL(continueTarget!);
      expect(decodedComposeUrl.origin).toBe("https://mail.google.com");
      expect(decodedComposeUrl.pathname).toBe("/mail/");
      expect(decodedComposeUrl.searchParams.get("view")).toBe("cm");
      expect(decodedComposeUrl.searchParams.get("fs")).toBe("1");
      expect(decodedComposeUrl.searchParams.get("to")).toBe("juan@pasigyouth.org");
      expect(decodedComposeUrl.searchParams.get("su")).toBe("Re: YPOP Guidelines");
      expect(decodedComposeUrl.searchParams.get("body")).toBe("Thank you for reaching out.");
    });

    it("ensures no hardcoded /u/0 or /u/1 in the Account Chooser or inner compose URL", () => {
      const chooserUrl = buildInquiryGmailAccountChooserUrl({
        recipientEmail: "submitter@pasigcity.ph",
        subject: "Accreditation",
      });

      expect(chooserUrl).not.toContain("/u/0");
      expect(chooserUrl).not.toContain("/u/1");
      expect(chooserUrl).not.toContain("authuser");
    });
  });
});


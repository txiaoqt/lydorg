import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSignupDraft,
  isGmailFormat,
  isValidEmailFormat,
  loadSignupDraft,
  saveSignupDraft,
  SIGNUP_DRAFT_KEY,
  type SignupDraft,
} from "./email-validation";

describe("email-validation and registration draft persistence", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("saves and loads non-sensitive registration draft", () => {
    const draft: SignupDraft = {
      organizationName: "Pasig Youth Council",
      isExistingOrganization: true,
      organizationIdentifierNumber: "PCYDO-2026-0001",
      email: "leader@gmail.com",
      contactNumber: "09123456789",
      district: "District I",
      barangayId: "barangay-kapitolyo",
      agreedToPolicies: true,
    };

    saveSignupDraft(draft);
    const loaded = loadSignupDraft();
    expect(loaded).toEqual(draft);
  });

  it("normalizes email to lowercase and strips whitespace when saving draft", () => {
    const draft: SignupDraft = {
      organizationName: "Kabataan",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      email: "  USER@GMAIL.COM  ",
      contactNumber: "09998887777",
      district: "District II",
      barangayId: "barangay-santolan",
      agreedToPolicies: true,
    };

    saveSignupDraft(draft);
    const loaded = loadSignupDraft();
    expect(loaded?.email).toBe("user@gmail.com");
  });

  it("returns null when no draft is stored", () => {
    expect(loadSignupDraft()).toBeNull();
  });

  it("clears registration draft from sessionStorage", () => {
    saveSignupDraft({
      organizationName: "Test Org",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      email: "test@gmail.com",
      contactNumber: "09123456789",
      district: "District I",
      barangayId: "barangay-bagong-ilog",
      agreedToPolicies: true,
    });

    expect(window.sessionStorage.getItem(SIGNUP_DRAFT_KEY)).not.toBeNull();
    clearSignupDraft();
    expect(window.sessionStorage.getItem(SIGNUP_DRAFT_KEY)).toBeNull();
    expect(loadSignupDraft()).toBeNull();
  });

  it("validates Gmail formats synchronously without network requests", () => {
    expect(isGmailFormat("test@gmail.com")).toBe(true);
    expect(isGmailFormat("test.user+tag@gmail.com")).toBe(true);
    expect(isGmailFormat("test@yahoo.com")).toBe(false);
    expect(isGmailFormat("invalid-email")).toBe(false);
    expect(isGmailFormat("")).toBe(false);
  });

  it("validates standard email formats", () => {
    expect(isValidEmailFormat("test@domain.com")).toBe(true);
    expect(isValidEmailFormat("user.name+tag@sub.domain.org")).toBe(true);
    expect(isValidEmailFormat("invalid")).toBe(false);
    expect(isValidEmailFormat("@domain.com")).toBe(false);
  });
});

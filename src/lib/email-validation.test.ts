import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSignupEmail, PENDING_SIGNUP_EMAIL_KEY } from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("checkSignupEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("returns available when input email is empty", async () => {
    const result = await checkSignupEmail("");
    expect(result).toBe("available");
  });

  it("returns registered when server check_signup_email_status reports registered (confirmed account)", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "registered", error: null } as any;
      return { data: true, error: null } as any;
    });

    const result = await checkSignupEmail("xxfaker4@gmail.com");
    expect(result).toBe("registered");
  });

  it("returns unconfirmed when check_signup_email_status reports unconfirmed AND session matches", async () => {
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "haha@gmail.com");
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "unconfirmed", error: null } as any;
      return { data: true, error: null } as any;
    });

    const result = await checkSignupEmail("haha@gmail.com");
    expect(result).toBe("unconfirmed");
  });

  it("returns registered when check_signup_email_status reports unconfirmed but session has no matching pending registration", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "unconfirmed", error: null } as any;
      return { data: true, error: null } as any;
    });

    const result = await checkSignupEmail("haha@gmail.com");
    expect(result).toBe("registered");
  });

  it("returns registered when fallback is_signup_email_registered is true and not resuming registration", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: null, error: { message: "function not found" } } as any;
      if (name === "is_signup_email_registered") return { data: true, error: null } as any;
      return { data: null, error: null } as any;
    });

    const result = await checkSignupEmail("registered@gmail.com");
    expect(result).toBe("registered");
  });

  it("returns unconfirmed when fallback is_signup_email_registered is true and matches sessionStorage", async () => {
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, "pending@gmail.com");
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: null, error: { message: "function not found" } } as any;
      if (name === "is_signup_email_registered") return { data: true, error: null } as any;
      return { data: null, error: null } as any;
    });

    const result = await checkSignupEmail("pending@gmail.com");
    expect(result).toBe("unconfirmed");
  });

  it("returns unconfirmed when fallback is_signup_email_registered is true and explicit isResumingRegistration option is provided", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: null, error: { message: "function not found" } } as any;
      if (name === "is_signup_email_registered") return { data: true, error: null } as any;
      return { data: null, error: null } as any;
    });

    const result = await checkSignupEmail("pending@gmail.com", { isResumingRegistration: true });
    expect(result).toBe("unconfirmed");
  });

  it("returns available when auth user does not exist in Supabase", async () => {
    vi.spyOn(supabase!, "rpc").mockImplementation(async (name) => {
      if (name === "check_signup_email_status") return { data: "available", error: null } as any;
      if (name === "is_signup_email_registered") return { data: false, error: null } as any;
      return { data: false, error: null } as any;
    });

    const result = await checkSignupEmail("new@gmail.com");
    expect(result).toBe("available");
  });

  it("returns error when Supabase RPC encounters an error", async () => {
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: null, error: { message: "Network failure" } } as any);

    const result = await checkSignupEmail("user@gmail.com");
    expect(result).toBe("error");
  });
});


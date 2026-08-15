import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSignupEmail } from "./email-validation";
import { supabase } from "@/lib/supabase";

describe("checkSignupEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available when input email is empty", async () => {
    const result = await checkSignupEmail("");
    expect(result).toBe("available");
  });

  it("returns registered when a confirmed organization profile exists", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "org-123" }, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabase!, "from").mockImplementation(mockFrom as any);

    const result = await checkSignupEmail("test@gmail.com");
    expect(result).toBe("registered");
  });

  it("returns unconfirmed when an auth user exists but has no confirmed profile", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabase!, "from").mockImplementation(mockFrom as any);
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: true, error: null } as any);

    const result = await checkSignupEmail("pending@gmail.com");
    expect(result).toBe("unconfirmed");
  });

  it("returns available when neither confirmed profile nor auth user exists", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(supabase!, "from").mockImplementation(mockFrom as any);
    vi.spyOn(supabase!, "rpc").mockResolvedValue({ data: false, error: null } as any);

    const result = await checkSignupEmail("new@gmail.com");
    expect(result).toBe("available");
  });
});

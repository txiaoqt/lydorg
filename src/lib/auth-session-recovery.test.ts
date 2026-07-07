import { describe, expect, it } from "vitest";
import { clearSupabaseAuthStorage, isInvalidRefreshTokenError } from "./auth-session-recovery";

describe("Supabase session recovery", () => {
  it("recognizes invalid refresh-token failures only", () => {
    expect(isInvalidRefreshTokenError(new Error("Invalid Refresh Token: Refresh Token Not Found"))).toBe(true);
    expect(isInvalidRefreshTokenError({ message: "refresh_token_not_found" })).toBe(true);
    expect(isInvalidRefreshTokenError(new Error("Failed to fetch"))).toBe(false);
  });

  it("removes the project auth key and chunked companions", () => {
    localStorage.setItem("sb-project-auth-token", "stale");
    localStorage.setItem("sb-project-auth-token.0", "chunk");
    localStorage.setItem("unrelated", "keep");
    clearSupabaseAuthStorage("sb-project-auth-token");
    expect(localStorage.getItem("sb-project-auth-token")).toBeNull();
    expect(localStorage.getItem("sb-project-auth-token.0")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
});


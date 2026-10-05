import { describe, expect, it } from "vitest";
import { shouldRetryQuery, toQueryError } from "./query-client";

describe("query retry policy", () => {
  it("does not repeat deterministic Supabase schema, query, or authorization failures", () => {
    expect(shouldRetryQuery(0, Object.assign(new Error("column budget_requests.seed_source_year does not exist"), { code: "42703", status: 400 }))).toBe(false);
    expect(shouldRetryQuery(0, Object.assign(new Error("Invalid JWT"), { status: 401 }))).toBe(false);
    expect(shouldRetryQuery(0, Object.assign(new Error("failed to parse filter"), { code: "PGRST100" }))).toBe(false);
    expect(shouldRetryQuery(0, new Error("column is not found in the schema cache"))).toBe(false);
    expect(shouldRetryQuery(0, toQueryError({ message: "column budget_requests.seed_source_year does not exist", code: "42703" }))).toBe(false);
  });

  it("retries one transient network or server failure", () => {
    expect(shouldRetryQuery(0, Object.assign(new Error("Service unavailable"), { status: 503 }))).toBe(true);
    expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetryQuery(0, toQueryError({ message: "Timed out acquiring a connection from the pool", code: "PGRST003" }))).toBe(true);
  });

  it("does not retry unknown application errors or retry the same failure twice", () => {
    expect(shouldRetryQuery(0, new Error("The operation is not allowed in this state."))).toBe(false);
    expect(shouldRetryQuery(1, Object.assign(new Error("Failed to fetch"), { status: 503 }))).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { clearProposalDraft, readProposalDraft, writeProposalDraft } from "./budget-proposal-draft-storage";

describe("budget proposal draft storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("keeps typed answers per org until cleared", () => {
    writeProposalDraft("desktop:org-1", { proposalForm: { projectTitle: "Seminar" } });
    expect(readProposalDraft("desktop:org-1")).toEqual({ proposalForm: { projectTitle: "Seminar" } });
    expect(readProposalDraft("desktop:org-2")).toBeNull();
    clearProposalDraft("desktop:org-1");
    expect(readProposalDraft("desktop:org-1")).toBeNull();
  });

  it("never breaks the form when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceeded"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("SecurityError"); });
    expect(() => writeProposalDraft("x", {})).not.toThrow();
    expect(readProposalDraft("x")).toBeNull();
  });
});

import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const unlock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/revision-unlock-api", () => ({ unlockSubmissionRevision: unlock }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
import { RevisionUnlockPanel } from "./RevisionUnlockPanel";

const expired = { status: "needs_revision", revisionDueAt: "2026-10-01T00:00:00.000Z", revisionLocked: true, revisionLockedAt: "2026-10-01T00:00:00.000Z" };

beforeEach(() => unlock.mockReset());

it("renders nothing when the submission is not locked", () => {
  const { container } = render(<RevisionUnlockPanel entityType="budget_request" entityId="b1" onUnlocked={vi.fn()}
    item={{ ...expired, revisionUnlockedAt: "2026-10-02T00:00:00.000Z" }} />);
  expect(container).toBeEmptyDOMElement();
});

it("unlocks an expired revision after confirmation", async () => {
  const result = { revisionLocked: false, revisionLockedAt: null, revisionUnlockedAt: "2026-11-07T00:00:00.000Z" };
  unlock.mockResolvedValue(result);
  const onUnlocked = vi.fn();
  render(<RevisionUnlockPanel entityType="budget_request" entityId="b1" item={expired} onUnlocked={onUnlocked} />);
  fireEvent.click(screen.getByRole("button", { name: /Unlock Resubmission/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Unlock Resubmission" }));
  await waitFor(() => expect(onUnlocked).toHaveBeenCalledWith(result));
  expect(unlock).toHaveBeenCalledWith("budget_request", "b1");
});

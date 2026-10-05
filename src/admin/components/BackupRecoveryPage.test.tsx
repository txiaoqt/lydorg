import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BackupRecoveryPage } from "./BackupRecoveryPage";
import { BackupControlError, fetchBackupRuns, requestBackup, type BackupRun, type BackupRunsResult, backupStatusLabel } from "@/lib/admin-backup-recovery";
import { ADMIN_PERMISSION_GROUPS, ADMIN_PERMISSION_TOTAL_COUNT, hasAdminNavPermission } from "@/lib/admin-permissions";

const mocks = vi.hoisted(() => ({ user: { id: "test-admin", roleCode: "super_admin", permissionCodes: [] as string[] }, toast: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/lib/admin-backup-recovery", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/admin-backup-recovery")>(), fetchBackupRuns: vi.fn(), requestBackup: vi.fn() }));
const run: BackupRun = { id: 12, runNumber: 3, status: "completed", conclusion: "success", event: "workflow_dispatch", createdAt: "2026-10-05T04:00:00Z",
  updatedAt: "2026-10-05T04:05:00Z", htmlUrl: "https://github.com/example/backup-repo/actions/runs/12", headSha: "a".repeat(40), headBranch: "main" };
const data = (runs: BackupRun[] = [run], extra = {}): BackupRunsResult => ({ runs, activeBackup: false, requestPending: false, dispatchEnabled: true, ...extra });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><BackupRecoveryPage /></QueryClientProvider>);
  return { ...view, client };
}
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.user = { id: "test-admin", roleCode: "super_admin", permissionCodes: [] };
  vi.mocked(fetchBackupRuns).mockResolvedValue(data()); vi.mocked(requestBackup).mockResolvedValue({ accepted: true, runId: 13, auditStatus: "recorded" }); });
describe("Backup & Recovery page", () => {
  it("super admin can see the page and nav through bypass", async () => {
    mount(); expect(await screen.findByRole("heading", { name: "Latest Backup" })).toBeInTheDocument();
    expect(hasAdminNavPermission([], "backup-recovery", "super_admin")).toBe(true);
  });
  it("view-only admin can view history but cannot trigger a backup", async () => {
    mocks.user = { ...mocks.user, roleCode: "admin", permissionCodes: ["backup_recovery_view"] }; mount();
    expect(await screen.findByRole("button", { name: "Create Backup Now" })).toBeDisabled();
    expect(hasAdminNavPermission(mocks.user.permissionCodes, "backup-recovery", "admin")).toBe(true);
    expect(requestBackup).not.toHaveBeenCalled();
  });
  it("denies page and nav access without view even if manage is present", () => {
    mocks.user = { ...mocks.user, roleCode: "admin", permissionCodes: ["backup_recovery_manage"] }; mount();
    expect(screen.getByRole("alert")).toHaveTextContent("do not have permission");
    expect(fetchBackupRuns).not.toHaveBeenCalled(); expect(hasAdminNavPermission(mocks.user.permissionCodes, "backup-recovery", "admin")).toBe(false);
  });
  it("adds both permissions to Administration and updates the derived total", () => {
    const items = ADMIN_PERMISSION_GROUPS.find(group => group.code === "administration")!.items;
    expect(items.map(item => item.code)).toEqual(expect.arrayContaining(["backup_recovery_view", "backup_recovery_manage"]));
    expect(ADMIN_PERMISSION_TOTAL_COUNT).toBe(15);
  });
  it("manage admin opens the existing confirmation pattern; cancel never dispatches", async () => {
    mocks.user = { ...mocks.user, roleCode: "admin", permissionCodes: ["backup_recovery_view", "backup_recovery_manage"] }; mount();
    fireEvent.click(await screen.findByRole("button", { name: "Create Backup Now" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Create a new backup?"); expect(requestBackup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(requestBackup).not.toHaveBeenCalled();
  });
  it("accepted dispatch refreshes the list, shows Queued, and stops at Verified completion", async () => {
    const { client, unmount } = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Create Backup Now" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create Backup" }));
    await waitFor(() => expect(requestBackup).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchBackupRuns).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Queued")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Create Backup Now" })).toBeDisabled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Backup requested" }));
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([{ ...run, id: 13, runNumber: 4, htmlUrl: run.htmlUrl.replace('12','13') }]));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByText("Queued")).not.toBeInTheDocument());
    expect(screen.getAllByText("Verified Backup")).toHaveLength(2);
    unmount(); client.clear();
  });
  it("active workflow disables creation and cancelled/failed/success conclusions have accurate labels", async () => {
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([{ ...run, status: "in_progress", conclusion: null }], { activeBackup: true }));
    const { unmount, client } = mount();
    expect(await screen.findByRole("button", { name: "Create Backup Now" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("A backup is already in progress."); expect(requestBackup).not.toHaveBeenCalled();
    expect(backupStatusLabel({ status: "queued", conclusion: null })).toBe("Queued");
    expect(backupStatusLabel({ status: "completed", conclusion: "cancelled" })).toBe("Cancelled");
    unmount(); client.clear();
  });
  it.each([['success', 'Verified Backup'], ['failure', 'Failed']])("displays %s workflow results accurately", async (conclusion, label) => {
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([{ ...run, conclusion }])); mount();
    expect(await screen.findAllByText(label)).toHaveLength(2);
  });
  it("shows loading without a fake success state", () => {
    vi.mocked(fetchBackupRuns).mockReturnValue(new Promise(() => {})); mount();
    expect(screen.getByRole("status")).toHaveTextContent("Loading backup history"); expect(screen.queryByText("Verified Backup")).not.toBeInTheDocument();
  });
  it("shows an empty history without implying a completed backup", async () => {
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([])); mount();
    expect(await screen.findByText("No backup yet")).toBeInTheDocument(); expect(screen.queryByText("Verified Backup")).not.toBeInTheDocument();
  });
  it.each(['not_configured', 'github_unavailable', 'forbidden'])("handles %s safely", async code => {
    vi.mocked(fetchBackupRuns).mockRejectedValue(new BackupControlError(code)); mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(new BackupControlError(code).message);
    expect(screen.queryByRole("button", { name: "Create Backup Now" })).not.toBeInTheDocument();
  });
  it("server dispatch gate stays disabled until manually enabled", async () => {
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([], { dispatchEnabled: false })); mount();
    expect(await screen.findByRole("button", { name: "Create Backup Now" })).toBeDisabled(); expect(requestBackup).not.toHaveBeenCalled();
  });
  it("conflicting dispatch is handled without retries and refreshes authoritative status", async () => {
    vi.mocked(requestBackup).mockRejectedValue(new BackupControlError("active_backup")); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Create Backup Now" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create Backup" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "A backup is already in progress." })));
    expect(requestBackup).toHaveBeenCalledTimes(1);
  });
  it("hides recovery controls and never renders raw exceptions or secrets", async () => {
    vi.mocked(fetchBackupRuns).mockRejectedValue(new Error("fake-github-token fake-r2-key fake-service-key postgres://fake:password@invalid")); mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Backup service is unavailable");
    expect(screen.queryByRole("heading", { name: "Recovery" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore Backup" })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/fake-github-token|fake-r2-key|fake-service-key|postgres:\/\//);
  });
  it("polls active runs every 12 seconds and removes the interval on unmount", async () => {
    const intervals = vi.spyOn(globalThis, "setInterval"), clears = vi.spyOn(globalThis, "clearInterval");
    vi.mocked(fetchBackupRuns).mockResolvedValue(data([{ ...run, status: "in_progress", conclusion: null }], { activeBackup: true }));
    const { unmount, client } = mount();
    await screen.findByText(/A backup is already in progress/);
    const index = intervals.mock.calls.findIndex(([, delay]) => delay === 12_000);
    expect(index).toBeGreaterThanOrEqual(0);
    const handle = intervals.mock.results[index].value;
    unmount(); client.clear();
    expect(clears).toHaveBeenCalledWith(handle);
    intervals.mockRestore(); clears.mockRestore();
  });
});

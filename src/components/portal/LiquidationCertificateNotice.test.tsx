import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidationCertificateNotice } from "./LiquidationCertificateNotice";
import { certificateInput } from "@/test/fixtures/liquidation-certificate";

const { generate, save } = vi.hoisted(() => ({ generate: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/liquidation-certificate-pdf", () => ({ generateLiquidationCertificatePdf: generate }));
beforeEach(() => { vi.clearAllMocks(); generate.mockResolvedValue({ save }); });
const action = () => screen.getByRole("button", { name: "Download certificate of budget liquidation" });

describe("liquidation certificate notice", () => {
  it("turns the completion message into a working organization-specific download", async () => {
    render(<LiquidationCertificateNotice {...certificateInput()} />);
    expect(screen.getByText("Congratulations! Your budget has been successfully liquidated.")).toBeInTheDocument();
    fireEvent.click(action());
    await waitFor(() => expect(save).toHaveBeenCalledWith("budget-liquidation-certificate-example-youth-organization-example-liquidation-1.pdf"));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ organizationName: "Example Youth Organization", releasedAmount: 12500 }));
  });

  it("shows progress and prevents concurrent duplicate downloads", async () => {
    let finish!: (value: { save: typeof save }) => void;
    generate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<LiquidationCertificateNotice {...certificateInput()} />);
    fireEvent.click(action());
    fireEvent.click(action());
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    expect(action()).toBeDisabled();
    expect(screen.getByText("Preparing your certificate…")).toBeInTheDocument();
    await act(async () => finish({ save }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("reports failure without leaking the underlying error and permits an explicit retry", async () => {
    generate.mockRejectedValueOnce(new Error("private-internal-detail"));
    render(<LiquidationCertificateNotice {...certificateInput()} />);
    fireEvent.click(action());
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be prepared");
    expect(screen.queryByText(/private-internal-detail/)).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(action());
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });

  it("cancels a pending download when the organization changes", async () => {
    let finish!: (value: { save: typeof save }) => void;
    generate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const input = certificateInput();
    const view = render(<LiquidationCertificateNotice {...input} />);
    fireEvent.click(action());
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    view.rerender(<LiquidationCertificateNotice {...input} organization={{ ...input.organization!, id: "another-org" }} />);
    await act(async () => finish({ save }));
    expect(save).not.toHaveBeenCalled();
    expect(action()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("organization details could not be verified");
  });

  it.each(["unmount", "status change", "report change"])("cancels a pending download after %s", async change => {
    let finish!: (value: { save: typeof save }) => void;
    generate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const input = certificateInput();
    const view = render(<LiquidationCertificateNotice {...input} />);
    fireEvent.click(action());
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    if (change === "unmount") view.unmount();
    else view.rerender(<LiquidationCertificateNotice {...input} report={{
      ...input.report,
      ...(change === "status change" ? { status: "needs_revision" as const } : { id: "another-report" }),
    }} />);
    await act(async () => finish({ save }));
    expect(save).not.toHaveBeenCalled();
  });

  it("waits for the final liquidation status and explains missing certificate metadata", () => {
    const input = certificateInput();
    const view = render(<LiquidationCertificateNotice {...input} report={{ ...input.report, status: "approved_for_ftf_green" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    view.rerender(<LiquidationCertificateNotice {...input} report={{ ...input.report, completedAt: "" }} />);
    expect(action()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("completion date is missing");
    expect(generate).not.toHaveBeenCalled();
  });
});

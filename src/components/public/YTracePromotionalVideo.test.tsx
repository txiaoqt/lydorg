import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import YTracePromotionalVideo from "./YTracePromotionalVideo";

let notifyIntersection: IntersectionObserverCallback;
let played: HTMLMediaElement[];
let paused: HTMLMediaElement[];

beforeEach(() => {
  played = [];
  paused = [];
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    played.push(this);
    this.dispatchEvent(new Event("play"));   // like a browser: the element reports it is playing
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    paused.push(this);
    this.dispatchEvent(new Event("pause"));
  });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { notifyIntersection = callback; }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function showPreview(isIntersecting = true) {
  act(() => notifyIntersection([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
  return screen.getByTestId("promotional-video-preview") as HTMLVideoElement;
}

describe("Y-TRACE promotional video", () => {
  it("opens a separate player from zero every time and preserves the preview's position", () => {
    render(<YTracePromotionalVideo />);
    const preview = showPreview();
    expect(preview.muted).toBe(true);
    expect(preview.loop).toBe(true);
    expect(preview.controls).toBe(false);
    preview.currentTime = 17;

    fireEvent.click(screen.getByRole("button", { name: "Watch Y-TRACE Overview" }));
    const expanded = screen.getByLabelText("Y-TRACE promotional video") as HTMLVideoElement;
    expect(expanded).not.toBe(preview);
    expect(expanded.currentTime).toBe(0);
    expect(expanded.muted).toBe(false);
    expect(expanded.controls).toBe(true);
    expect(expanded.loop).toBe(false);
    expect(preview.currentTime).toBe(17);
    expect(paused).toContain(preview);
    expanded.currentTime = 43;

    fireEvent.click(screen.getByRole("button", { name: "Close video" }));
    expect(screen.queryByLabelText("Y-TRACE promotional video")).not.toBeInTheDocument();
    expect(paused).toContain(expanded);
    expect(preview.currentTime).toBe(17);
    expect(played.at(-1)).toBe(preview);

    fireEvent.click(screen.getByRole("button", { name: "Watch Y-TRACE Overview" }));
    const reopened = screen.getByLabelText("Y-TRACE promotional video") as HTMLVideoElement;
    expect(reopened).not.toBe(expanded);
    expect(reopened.currentTime).toBe(0);
    expect(preview.currentTime).toBe(17);
  });

  it("loads near the viewport and respects a manual pause when the preview re-enters view", () => {
    render(<YTracePromotionalVideo />);
    const preview = screen.getByTestId("promotional-video-preview") as HTMLVideoElement;
    expect(preview).not.toHaveAttribute("src");
    showPreview();
    expect(preview).toHaveAttribute("src");
    expect(played.at(-1)).toBe(preview);

    fireEvent.click(screen.getByRole("button", { name: "Pause video preview" }));
    expect(paused.at(-1)).toBe(preview);
    showPreview(false);
    const playCount = played.length;
    showPreview();
    expect(played).toHaveLength(playCount);
    fireEvent.click(screen.getByRole("button", { name: "Play video preview" }));
    expect(played.at(-1)).toBe(preview);
    expect(played.length).toBeGreaterThan(playCount);
  });

  it("shows the play icon when the browser blocks autoplay", () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => Promise.reject(new Error("NotAllowedError")));
    render(<YTracePromotionalVideo />);
    showPreview();
    expect(screen.getByRole("button", { name: "Play video preview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause video preview" })).not.toBeInTheDocument();
  });

  it("lets the user retry a failed expanded video without changing preview progress", () => {
    render(<YTracePromotionalVideo />);
    const preview = showPreview();
    preview.currentTime = 26;
    fireEvent.click(screen.getByRole("button", { name: "Watch Y-TRACE Overview" }));
    const expanded = screen.getByLabelText("Y-TRACE promotional video") as HTMLVideoElement;
    fireEvent.error(expanded);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load the video");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    const replacement = screen.getByLabelText("Y-TRACE promotional video") as HTMLVideoElement;
    expect(replacement).not.toBe(expanded);
    expect(replacement.currentTime).toBe(0);
    expect(preview.currentTime).toBe(26);
  });

  it("opens from the control row and returns keyboard focus to that control", async () => {
    render(<YTracePromotionalVideo />);
    const preview = showPreview();
    preview.currentTime = 21;
    const opener = screen.getByRole("button", { name: "Expand Y-TRACE Overview" });
    fireEvent.click(opener);
    const expanded = screen.getByLabelText("Y-TRACE promotional video") as HTMLVideoElement;
    expect(expanded.currentTime).toBe(0);
    expect(preview.currentTime).toBe(21);
    fireEvent.click(screen.getByRole("button", { name: "Close video" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

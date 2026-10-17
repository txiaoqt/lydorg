import React, { lazy, Suspense } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RouteChunkBoundary } from "./RouteChunkBoundary";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("shows Suspense during a slow cold chunk and renders after it arrives", async () => {
  let resolve!: (module: { default: () => React.ReactNode }) => void;
  const Page = lazy(() => new Promise<{ default: () => React.ReactNode }>(r => { resolve = r; }));
  render(<RouteChunkBoundary><Suspense fallback={<p>Loading</p>}><Page /></Suspense></RouteChunkBoundary>);
  expect(screen.getByText("Loading")).toBeInTheDocument();
  await act(async () => resolve({ default: () => <p>Ready</p> }));
  expect(screen.getByText("Ready")).toBeInTheDocument();
});
it.each(["Failed to fetch dynamically imported module", "Importing a module script failed.", "Loading chunk 123 failed."])("offers explicit recovery for %s without automatically reloading", async message => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const reload = vi.fn(); const Page = lazy(async () => { throw new Error(message); });
  render(<RouteChunkBoundary onReload={reload}><Suspense fallback={<p>Loading</p>}><Page /></Suspense></RouteChunkBoundary>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load this page");
  expect(reload).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("unsaved input");
  fireEvent.click(screen.getByRole("button", { name: "Reload page" })); expect(reload).toHaveBeenCalledTimes(1);
});
it("does not misclassify application errors as chunk failures", () => {
  expect(() => RouteChunkBoundary.getDerivedStateFromError(new Error("authorization failure"))).toThrow("authorization failure");
});

import { Component, type ReactNode } from "react";

export class RouteChunkBoundary extends Component<{ children: ReactNode; onReload?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (!/loading chunk|chunkloaderror|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(message)) throw error;
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Unable to load this page</h1>
        <p>Check your connection, then reload to get the latest app version.</p>
        <p>Reloading may discard unsaved input. Your saved drafts will remain available.</p>
        <button type="button" className="rounded-lg border px-4 py-2" onClick={() => {
          if (this.props.onReload) this.props.onReload();
          else window.location.reload();
        }}>Reload page</button>
      </div>
    );
  }
}

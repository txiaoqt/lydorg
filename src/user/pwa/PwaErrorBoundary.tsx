import { Component, type ErrorInfo, type ReactNode } from "react";

export class PwaErrorBoundary extends Component<
  { children: ReactNode; onDashboard: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Installed PWA interface failed:", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="ytrace-pwa-app pwa-error-screen">
        <section className="pwa-card">
          <h1>Something went wrong</h1>
          <p>Your records are safe. Reload the app or return to Dashboard.</p>
          <div className="pwa-error-actions">
            <button type="button" onClick={() => window.location.reload()}>Retry</button>
            <button type="button" onClick={this.props.onDashboard}>Dashboard</button>
          </div>
        </section>
      </div>
    );
  }
}

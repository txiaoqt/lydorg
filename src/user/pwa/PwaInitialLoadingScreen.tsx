export default function PwaInitialLoadingScreen() {
  return (
    <div className="ytrace-pwa-app pwa-loading-screen" role="status" aria-live="polite">
      <img className="pwa-loading-mark" src="/y-trace-logo.png" alt="Y-TRACE" />
      <p>Loading Y-TRACE...</p>
    </div>
  );
}

const AdminPageLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-admin-surface animate-in fade-in duration-300">
    <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-16 w-16 object-contain" />
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-public-bg-section border-t-public-text-brand" />
  </div>
);

export default AdminPageLoader;

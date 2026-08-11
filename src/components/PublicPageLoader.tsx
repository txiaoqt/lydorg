import BrandLogo from "@/components/BrandLogo";

const PublicPageLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white animate-in fade-in duration-300">
    <BrandLogo showText={false} />
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-public-bg-section border-t-[#0E2F66]" />
  </div>
);

export default PublicPageLoader;

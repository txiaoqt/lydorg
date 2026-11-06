import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicTemplatesCatalog from "@/components/public/PublicTemplatesCatalog";

const PublicTemplates = () => {
  return (
    <div className="public-templates-page min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 sm:px-6 lg:px-[64px]">
        <div className="public-page-hero-body mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">

          {/* Title block */}
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-tnr font-normal leading-[1.1] tracking-[-0.01em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Forms &amp; Templates
            </h1>
            <p className="font-inter text-base font-normal leading-[1.6] text-white/85">
              Official forms, templates, and supporting documents for programs and services provided by the Pasig City Youth Development Office (PCYDO).
            </p>
          </div>

        </div>
      </section>

      {/* Catalog */}
      <section className="bg-background px-4 pb-8 pt-6 sm:px-6 sm:pb-[32px] sm:pt-[32px] lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <PublicTemplatesCatalog compactHeader />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicTemplates;

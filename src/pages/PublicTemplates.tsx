import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicTemplatesCatalog from "@/components/public/PublicTemplatesCatalog";

const PublicTemplates = () => {
  return (
    <div className="public-templates-page min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="templates-hero hero-gradient py-8 sm:py-10 md:py-20">
          <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/60">
              Templates
            </span>
            <h1 className="templates-hero-title mb-3 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:mb-6 sm:text-4xl md:text-5xl">
              Public Templates
            </h1>
            <p className="templates-hero-description mx-auto max-w-[32rem] text-[0.92rem] leading-relaxed text-secondary-foreground/70 sm:text-base md:text-lg">
              Browse and download the latest published forms, compliance templates, and shared reference files from Y-TRACE.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10 md:py-20">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <PublicTemplatesCatalog compactHeader />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default PublicTemplates;

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicTemplatesCatalog from "@/components/public/PublicTemplatesCatalog";

const PublicTemplates = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/60">
              Templates
            </span>
            <h1 className="mb-4 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:mb-6 sm:text-4xl md:text-5xl">
              Public Templates
            </h1>
            <p className="text-sm leading-relaxed text-secondary-foreground/70 sm:text-base md:text-lg">
              Browse and download the latest published forms, compliance templates, and shared reference files from Y-TRACE.
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
            <PublicTemplatesCatalog compactHeader />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default PublicTemplates;

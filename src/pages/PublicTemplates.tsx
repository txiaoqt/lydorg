import { Search } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import PublicTemplatesCatalog from "@/components/public/PublicTemplatesCatalog";

const PublicTemplates = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="public-templates-page min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-5 pt-[120px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[48px] pb-[48px] pt-[64px]">

          {/* Title block */}
          <div className="flex flex-col gap-[16px]">
            <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-public-fs-hero">
              Forms &amp; Templates
            </h1>
            <p className="font-segoe font-normal leading-[120%] text-public-text-neutral-on-neutral text-public-fs-subtitle-sm">
              Browse and download official forms, compliance templates, and document references from PCYDO Pasig City.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-public-border-default bg-white px-[16px]">
            <Search className="h-4 w-4 shrink-0 text-public-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search forms and templates..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default outline-none placeholder:text-public-text-secondary"
            />
          </div>

        </div>
      </section>

      {/* Catalog */}
      <section className="bg-public-bg-section px-5 pb-[32px] pt-[48px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <PublicTemplatesCatalog compactHeader searchTerm={searchTerm} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicTemplates;

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
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">

          {/* Title block */}
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-segoe font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[24px] sm:text-public-fs-hero">
              Forms &amp; Templates
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-xs sm:text-public-fs-subtitle-sm max-w-xl">
              Browse and download official forms, compliance templates, and document references from PCYDO Pasig City.
            </p>
          </div>

          {/* Desktop Search Bar — visible on sm and up */}
          <div className="hidden sm:flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-border bg-card shadow-xs px-[16px]">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search forms and templates..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-foreground outline-hidden placeholder:text-muted-foreground"
            />
          </div>

        </div>
      </section>

      {/* Catalog */}
      <section className="bg-background px-4 pb-8 pt-6 sm:px-6 sm:pb-[32px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <PublicTemplatesCatalog
            compactHeader
            externalSearchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicTemplates;

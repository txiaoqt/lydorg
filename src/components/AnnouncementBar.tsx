import { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";

const AnnouncementBar = () => {
  const [message, setMessage] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("news_releases")
      .select("title")
      .eq("visibility_status", "published")
      .order("date_posted", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.title) setMessage(data.title);
      });
  }, []);

  useEffect(() => {
    if (!message || !bannerRef.current) {
      document.documentElement.style.setProperty("--public-announcement-height", "0px");
      return;
    }

    const updateHeight = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty(
          "--public-announcement-height",
          `${Math.round(height)}px`
        );
      }
    };

    updateHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(bannerRef.current);
    }

    window.addEventListener("resize", updateHeight);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.setProperty("--public-announcement-height", "0px");
    };
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed left-0 right-0 top-0 z-[60] flex min-h-[32px] sm:min-h-[40px] items-center justify-center overflow-hidden bg-public-bg-brand px-3 py-1 sm:px-[10px]"
    >
      <div className="flex min-w-0 max-w-7xl items-center justify-center gap-2 sm:gap-[10px] px-1 sm:px-[10px]">
        <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0 text-public-text-neutral-on-neutral" />
        <span className="line-clamp-1 font-segoe text-[11px] sm:text-public-fs-body-sm font-semibold leading-tight sm:leading-[140%] text-public-text-neutral-on-neutral">
          Reminder: {message}
        </span>
      </div>
    </div>
  );
};

export default AnnouncementBar;

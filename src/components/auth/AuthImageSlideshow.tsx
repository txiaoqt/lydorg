import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoginSlide {
  src: string;
  alt: string;
  description: string;
}

export const LOGIN_SLIDES: LoginSlide[] = [
  {
    src: "/loginPageImages/image1.jpg",
    alt: "Y-TRACE Community Youth Program 1",
    description: "YORP Advocacy Blueprint: Seminar-Workshop on Advocacy Building 2025",
  },
  {
    src: "/loginPageImages/image2.jpg",
    alt: "Y-TRACE Community Youth Program 2",
    description: "Youth Organizations (YOs) and Youth-Serving Organizations (YSOs) General Assembly 2026",
  },
  {
    src: "/loginPageImages/image3.jpg",
    alt: "Y-TRACE Community Youth Program 3",
    description: "Youth Organizations (YOs) and Youth-Serving Organizations (YSOs) General Assembly 2026",
  },
  {
    src: "/loginPageImages/image4.jpg",
    alt: "Y-TRACE Community Youth Program 4",
    description: "YOUTHnified: Youth for Inclusive and Gender-Fair Community 2025",
  },
];

let lastInitialIndex = -1;

export function getInitialSlideIndex(length: number): number {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (next === lastInitialIndex) {
    next = (next + 1 + Math.floor(Math.random() * (length - 1))) % length;
  }
  lastInitialIndex = next;
  return next;
}

export function resetLastInitialIndex(): void {
  lastInitialIndex = -1;
}

interface AuthImageSlideshowProps {
  className?: string;
  initialIndex?: number;
}

export default function AuthImageSlideshow({ className, initialIndex }: AuthImageSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    typeof initialIndex === "number" && initialIndex >= 0 && initialIndex < LOGIN_SLIDES.length
      ? initialIndex
      : getInitialSlideIndex(LOGIN_SLIDES.length),
  );

  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + LOGIN_SLIDES.length) % LOGIN_SLIDES.length);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % LOGIN_SLIDES.length);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    },
    [handleNext, handlePrev],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const deltaX = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 40;
      if (deltaX > minSwipeDistance) {
        handleNext();
      } else if (deltaX < -minSwipeDistance) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }, [handleNext, handlePrev]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Y-TRACE photo gallery"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "relative w-full h-full min-h-0 overflow-hidden select-none bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
    >
      {/* Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Showing photo ${activeIndex + 1} of ${LOGIN_SLIDES.length}: ${LOGIN_SLIDES[activeIndex]?.description}`}
      </div>

      {/* Full-Bleed Horizontal Sliding Track */}
      <div
        className="flex h-full w-full min-h-0 transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {LOGIN_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          const isNear = Math.abs(index - activeIndex) <= 1;
          return (
            <div
              key={slide.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${index + 1} of ${LOGIN_SLIDES.length}`}
              aria-hidden={!isActive}
              className="relative w-full h-full min-h-0 flex-shrink-0 overflow-hidden bg-muted/30"
            >
              <img
                src={slide.src}
                alt={slide.alt}
                loading={isNear ? "eager" : "lazy"}
                className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
              />
            </div>
          );
        })}
      </div>

      {/* Subtle Bottom Vignette Gradient for Universal Overlay Control Contrast */}
      <div className="absolute inset-x-0 bottom-0 h-32 sm:h-36 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none z-10" />

      {/* Floating Direct Overlay Controls */}
      {/* Slide Description & Indicators (Bottom Left) */}
      <div className="absolute left-4 sm:left-6 bottom-4 sm:bottom-6 z-20 flex flex-col items-start gap-2.5 max-w-[calc(100%-110px)] sm:max-w-[calc(100%-130px)] md:max-w-md pointer-events-none">
        <p className="text-xs sm:text-sm font-medium text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-snug line-clamp-2 transition-all duration-300">
          {LOGIN_SLIDES[activeIndex]?.description}
        </p>

        {/* Slide Indicators */}
        <div
          className="flex items-center gap-1.5 pointer-events-auto"
          aria-label="Photo pagination"
        >
          {LOGIN_SLIDES.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to photo ${index + 1}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1",
                  isActive
                    ? "w-6 bg-white shadow-sm"
                    : "w-2 bg-white/45 hover:bg-white/75",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Previous / Next Navigation Buttons (Bottom Right) */}
      <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous photo"
          className="h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 active:scale-95 text-white backdrop-blur-sm border border-white/20 shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next photo"
          className="h-9 w-9 rounded-full bg-black/35 hover:bg-black/55 active:scale-95 text-white backdrop-blur-sm border border-white/20 shadow-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

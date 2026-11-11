// Public Y-TRACE lockup: mark plus "Y-TRACE" over "PASIG CITY", matching FullNavbar.svg.
export default function BrandLockup({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2 sm:gap-3">
      <img src="/navbar-mark.svg" alt="Y-TRACE" className="h-8 w-8 rounded-[6px] object-contain sm:h-9 sm:w-9" />
      <span aria-hidden="true" className="flex flex-col font-inter leading-none">
        <span className={`text-[14.5px] font-semibold tracking-[-0.01em] sm:text-[16.5px] ${onDark ? "text-white" : "text-public-text-brand"}`}>
          Y-TRACE
        </span>
        <span className={`mt-[2px] pl-[1px] text-[8.5px] font-medium uppercase tracking-[0.18em] sm:mt-[3px] sm:text-[9.5px] ${onDark ? "text-white/75" : "text-[#536579]"}`}>
          Pasig City
        </span>
      </span>
    </span>
  );
}

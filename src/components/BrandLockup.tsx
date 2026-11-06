// Public Y-TRACE lockup: mark plus "Y-TRACE" over "PASIG CITY", matching FullNavbar.svg.
export default function BrandLockup({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <img src="/navbar-mark.svg" alt="Y-TRACE" className="h-9 w-9 rounded-[6px] object-contain lg:h-11 lg:w-11" />
      <span aria-hidden="true" className="flex flex-col font-inter leading-none">
        <span className={`text-[16.5px] font-semibold tracking-[-0.01em] lg:text-[20px] ${onDark ? "text-white" : "text-public-text-brand"}`}>
          Y-TRACE
        </span>
        <span className={`mt-[5px] pl-[2px] text-[12.5px] font-normal uppercase lg:mt-[6px] lg:text-[15px] ${onDark ? "text-white/75" : "text-[#536579]"}`}>
          Pasig City
        </span>
      </span>
    </span>
  );
}

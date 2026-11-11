// Public Y-TRACE lockup: mark plus "Y-TRACE" over "PASIG CITY", matching FullNavbar.svg.
export default function BrandLockup({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <img src="/navbar-mark.svg" alt="Y-TRACE" className="h-9 w-9 rounded-[6px] object-contain" />
      <span aria-hidden="true" className="flex flex-col font-inter leading-none">
        <span className={`text-[16.5px] font-semibold tracking-[-0.01em] ${onDark ? "text-white" : "text-public-text-brand"}`}>
          Y-TRACE
        </span>
        <span className={`mt-[3px] pl-[1px] text-[9.5px] font-medium uppercase tracking-[0.18em] ${onDark ? "text-white/75" : "text-[#536579]"}`}>
          Pasig City
        </span>
      </span>
    </span>
  );
}

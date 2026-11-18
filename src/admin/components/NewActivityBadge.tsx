/** Marks an organization that submitted something this admin has not opened yet. */
export function NewActivityBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 font-inter text-[11px] font-semibold leading-none text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      New activity
    </span>
  );
}

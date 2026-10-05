import React from "react";
import { Button } from "@/components/ui/button";

export function OrganizationHistoryPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  loading = false,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);
  return (
    <nav aria-label="History pages" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">Showing {first}–{last} of {totalCount}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">Page {page} of {totalPages}</span>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

import { format } from "date-fns";
import { CalendarDays, ChevronRight, Globe, MapPin, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { StatusPill } from "@/admin/components/BudgetRequestsTable";
import type { BudgetRequest } from "@/lib/lydo-connect-data";

export type OrganizationBudgetRequestRow = {
  id: string;
  activityTitle: string;
  referenceCode: string;
  releasedAmount: number;
  status: BudgetRequest["status"];
  isLiquidated: boolean;
};

export type OrganizationBudgetDetail = {
  organizationId: string;
  urn: string;
  organizationName: string;
  district: string;
  barangay: string;
  registrationDate: Date;
  expiryDate: Date;
  totalRequested: number;
  totalReleased: number;
  totalLiquidated: number;
  completedCount: number;
  requests: OrganizationBudgetRequestRow[];
};

type OrganizationBudgetDrawerProps = {
  detail: OrganizationBudgetDetail | null;
  onOpenChange: (open: boolean) => void;
  onReviewRequest: (requestId: string) => void;
};

const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString()}`;

export const OrganizationBudgetDrawer = ({ detail, onOpenChange, onReviewRequest }: OrganizationBudgetDrawerProps) => {
  return (
    <Sheet open={Boolean(detail)} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-[672px]">
        {detail ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 bg-bg-panel-subtle px-8 py-6">
              <div className="flex flex-col gap-2">
                <ReferenceCodeChip code={detail.urn || "—"} className="w-fit" />
                <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">
                  {detail.organizationName}
                </h2>
                <div className="flex flex-wrap items-center gap-3 font-segoe text-xs leading-[140%] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                    {[detail.district, detail.barangay ? `Brgy. ${detail.barangay}` : ""].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                    Term: {format(detail.registrationDate, "d MMM yyyy")} – {format(detail.expiryDate, "d MMM yyyy")}
                  </span>
                </div>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
              <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-6 shadow-sm">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-300 pb-4">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-[13px] w-[13px] shrink-0 text-slate-500" strokeWidth={1.6} />
                    <p className="text-justify font-segoe text-[13px] font-semibold uppercase leading-none text-slate-500">
                      Budget Requests Overview
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="font-segoe text-2xl font-semibold leading-[140%] text-text-default">{detail.completedCount}</p>
                  <p className="font-segoe text-xs font-semibold leading-[140%] text-slate-500">total requests completed</p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-4">
                    <p className="font-body text-[11px] font-semibold uppercase leading-[140%] text-slate-500">Requested</p>
                    <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                      {formatPeso(detail.totalRequested)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-4">
                    <p className="font-body text-[11px] font-semibold uppercase leading-[140%] text-slate-500">Released</p>
                    <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                      {formatPeso(detail.totalReleased)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-4">
                    <p className="font-body text-[11px] font-semibold uppercase leading-[140%] text-slate-500">Liquidated</p>
                    <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                      {formatPeso(detail.totalLiquidated)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col">
                  {detail.requests.length ? (
                    detail.requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between gap-2 border-b border-slate-300 py-4 last:border-b-0"
                      >
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                              {request.activityTitle}
                            </p>
                            {request.isLiquidated ? (
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
                                Liquidated
                              </span>
                            ) : (
                              <StatusPill status={request.status} />
                            )}
                          </div>
                          <ReferenceCodeChip code={request.referenceCode} className="w-fit rounded" />
                          <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">
                            Released {formatPeso(request.releasedAmount)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Review budget request"
                          onClick={() => onReviewRequest(request.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-text-default"
                        >
                          <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="py-6 text-center font-segoe text-xs text-slate-500">No budget requests submitted yet.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="-mx-6 -mb-8 mt-auto flex items-center justify-end gap-3 border-t border-slate-300 bg-bg-panel-subtle px-8 py-6">
                <SheetClose asChild>
                  <button
                    type="button"
                    className="flex h-11 w-[66px] items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                  >
                    Close
                  </button>
                </SheetClose>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

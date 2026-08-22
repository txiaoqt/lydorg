import { forwardRef, useEffect, useMemo, useState, type ReactNode } from "react";
import { format as formatDate } from "date-fns";
import { Archive, ChevronDown, Eye, File, FileSpreadsheet, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip } from "@/admin/components/InquiriesTable";
import { formatTemplateCategoryDropdownLabel, formatTemplateCategoryLabel, orderTemplateCategories, type TemplateRecord } from "@/lib/lydo-connect-data";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { getTemplateFileFormat, formatFileSize } from "@/components/portal/UserPortalTemplatesWorkspaceView";

export type TemplateStatusFilter = "all" | "active" | "archived";
export type TemplateCategoryFilter = "all" | string;

type TemplatesTableProps = {
  templates: TemplateRecord[];
  categoryOptions: string[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: TemplateStatusFilter;
  onStatusFilterChange: (value: TemplateStatusFilter) => void;
  categoryFilter: TemplateCategoryFilter;
  onCategoryFilterChange: (value: TemplateCategoryFilter) => void;
  onPreview: (template: TemplateRecord) => void;
  onEdit: (template: TemplateRecord) => void;
  onArchive: (template: TemplateRecord) => void;
  onRestore: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
};

const STATUS_TABS: { value: TemplateStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const GROUP_PREVIEW_COUNT = 3;

const StatusPill = ({ active }: { active: boolean }) =>
  active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
      Archived
    </span>
  );

const ActionIconButton = forwardRef<
  HTMLButtonElement,
  { label: string; onClick?: () => void; children: ReactNode }
>(({ label, onClick, children, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    onClick={onClick}
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface p-2 transition-colors hover:bg-neutral-hover-subtle"
    {...props}
  >
    {children}
  </button>
));
ActionIconButton.displayName = "ActionIconButton";

const MENU_ITEM_CLASS =
  "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 font-segoe text-sm font-normal leading-none";

const fileFormatSwatch = (format: string) => {
  const upper = format.toUpperCase();
  if (upper === "PDF") {
    return { icon: File, iconBg: "bg-danger-subtle", iconColor: "text-icon-danger-secondary" };
  }
  if (upper === "XLSX" || upper === "XLS" || upper === "CSV") {
    return { icon: FileSpreadsheet, iconBg: "bg-bg-success-subtle", iconColor: "text-positive-secondary" };
  }
  return { icon: File, iconBg: "bg-public-bg-secondary-100", iconColor: "text-public-text-brand-secondary" };
};

export const TemplatesTable = ({
  templates,
  categoryOptions,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onPreview,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: TemplatesTableProps) => {
  const [resolvedSizeByTemplateId, setResolvedSizeByTemplateId] = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (categoryFilter !== "all") {
      return [{ category: categoryFilter, items: templates }];
    }
    const allCategories = orderTemplateCategories(
      Array.from(new Set(templates.flatMap((template) => template.templateCategories))),
    );
    return allCategories.map((category) => ({
      category,
      items: templates.filter((template) => template.templateCategories.includes(category)),
    }));
  }, [templates, categoryFilter]);

  const visibleGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        visibleItems: expandedCategories.has(group.category) ? group.items : group.items.slice(0, GROUP_PREVIEW_COUNT),
      })),
    [groups, expandedCategories],
  );

  useEffect(() => {
    let isActive = true;
    const visibleTemplates = visibleGroups.flatMap((group) => group.visibleItems);
    visibleTemplates.forEach((template) => {
      if (template.templateFileSize !== null) return;
      if (resolvedSizeByTemplateId[template.id] !== undefined) return;
      const rawUrl = template.templateFileUrl || template.templateUrl;
      if (!rawUrl || rawUrl.startsWith("#")) return;

      void resolveSupabaseFileUrl(rawUrl).then((resolvedUrl) => {
        if (!resolvedUrl || !isActive) return;
        fetch(resolvedUrl, { method: "HEAD" })
          .then((res) => {
            if (!isActive) return;
            const contentLength = res.headers.get("content-length");
            if (contentLength) {
              setResolvedSizeByTemplateId((prev) => ({ ...prev, [template.id]: parseInt(contentLength, 10) }));
            }
          })
          .catch(() => {
            // Silently swallow CORS or HEAD failures
          });
      });
    });
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups]);

  const toggleExpanded = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Header: search + status tabs + category dropdown */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search forms and templates..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <div className="flex h-10 shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-admin-surface p-1.5">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusFilterChange(tab.value)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
                  active
                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                    : "text-text-default hover:bg-slate-50",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="whitespace-nowrap">{categoryFilter === "all" ? "All categories" : formatTemplateCategoryDropdownLabel(categoryFilter)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => onCategoryFilterChange("all")}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                categoryFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All categories
            </DropdownMenuItem>
            {categoryOptions.map((category) => (
              <DropdownMenuItem
                key={category}
                onClick={() => onCategoryFilterChange(category)}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  categoryFilter === category && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {formatTemplateCategoryDropdownLabel(category)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
        <span className="w-[28%]">Name &amp; Description</span>
        <span className="w-[12%]">Category</span>
        <span className="w-[14%]">File Type</span>
        <span className="w-[14%]">Updated</span>
        <span className="w-[12%]">Status</span>
        <span className="w-[80px] shrink-0">Actions</span>
      </div>

      {/* Grouped rows */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No templates found</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        visibleGroups.map((group) => {
          const isExpanded = expandedCategories.has(group.category);
          const remaining = group.items.length - group.visibleItems.length;

          return (
            <div key={group.category}>
              <div className="flex h-8 items-center gap-2.5 border-b border-slate-300 bg-neutral-hover-subtle px-4 py-3">
                <span className="font-segoe text-[12px] font-semibold leading-[140%] text-public-text-neutral-default">
                  {formatTemplateCategoryLabel(group.category)}
                </span>
                <span className="font-segoe text-[12px] font-semibold leading-[140%] text-text-disabled">
                  {group.items.length} {group.items.length === 1 ? "document" : "documents"}
                </span>
              </div>
              {group.visibleItems.map((template) => {
                const fileFormat = getTemplateFileFormat(template.templateFileUrl || template.templateUrl, template.templateFileName || template.name);
                const swatch = fileFormatSwatch(fileFormat);
                const Icon = swatch.icon;
                const sizeBytes = template.templateFileSize ?? resolvedSizeByTemplateId[template.id];
                const updatedDate = template.templateUploadedAt
                  ? formatDate(new Date(template.templateUploadedAt), "d MMM yyyy")
                  : "—";

                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 last:border-b-0"
                  >
                    <div className="flex w-[28%] items-start gap-2.5">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] p-2", swatch.iconBg)}>
                        <Icon className={cn("h-5 w-5", swatch.iconColor)} strokeWidth={1.6} />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate font-segoe text-[14px] font-semibold leading-[140%] text-text-default">
                          {template.name}
                        </p>
                        <p className="line-clamp-1 font-segoe text-[12px] font-normal leading-[100%] text-slate-500">
                          {template.description || template.templateDescription}
                        </p>
                        {template.templateFileName ? (
                          <p className="truncate font-cascadia text-[10px] font-normal leading-[100%] text-slate-500">
                            {template.templateFileName}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex w-[12%] flex-wrap items-center gap-1">
                      {template.templateCategories.map((category) => (
                        <CategoryChip key={category} category={formatTemplateCategoryLabel(category)} />
                      ))}
                    </div>

                    <div className="flex w-[14%] flex-col gap-0.5">
                      <p className="font-segoe text-xs font-semibold leading-[140%] text-text-default">{fileFormat}</p>
                      <p className="font-segoe text-[11px] leading-[140%] text-slate-500">{formatFileSize(sizeBytes)}</p>
                    </div>

                    <div className="flex w-[14%] items-center">
                      <p className="font-segoe text-xs font-semibold leading-[140%] text-text-default">{updatedDate}</p>
                    </div>

                    <div className="flex w-[12%] items-center">
                      <StatusPill active={template.isActive} />
                    </div>

                    <div className="flex w-[80px] shrink-0 items-center gap-2">
                      <ActionIconButton label="Preview" onClick={() => onPreview(template)}>
                        <Eye className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                      </ActionIconButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <ActionIconButton label="More actions">
                            <MoreHorizontal className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                          </ActionIconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="flex w-[130px] min-w-[130px] flex-col gap-1 rounded-md border-gray-200 bg-admin-surface p-1 shadow-md"
                        >
                          <DropdownMenuItem
                            className={cn(MENU_ITEM_CLASS, "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default")}
                            onClick={() => onEdit(template)}
                          >
                            <Pencil className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
                            Edit
                          </DropdownMenuItem>
                          {template.isActive ? (
                            <DropdownMenuItem
                              className={cn(MENU_ITEM_CLASS, "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default")}
                              onClick={() => onArchive(template)}
                            >
                              <Archive className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
                              Archive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className={cn(MENU_ITEM_CLASS, "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default")}
                              onClick={() => onRestore(template)}
                            >
                              <Archive className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
                              Restore
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className={cn(MENU_ITEM_CLASS, "text-icon-danger-secondary focus:bg-danger-subtle focus:text-icon-danger-secondary")}
                            onClick={() => onDelete(template)}
                          >
                            <Trash2 className="h-4 w-4 shrink-0 text-icon-danger-secondary" strokeWidth={1.6} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
              {remaining > 0 || isExpanded ? (
                <div className="border-b border-slate-300 px-4 py-3 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(group.category)}
                    className="flex items-center gap-1.5 font-segoe text-[13px] font-semibold leading-none text-public-bg-brand hover:underline"
                  >
                    <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isExpanded && "rotate-180")} strokeWidth={1.6} />
                    {isExpanded ? "Show less" : `Show ${remaining} more`}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{templates.length}</span> {templates.length === 1 ? "record" : "records"}
        </p>
      </div>
    </div>
  );
};

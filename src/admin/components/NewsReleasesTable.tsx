import { forwardRef, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NewsRelease } from "@/lib/lydo-connect-data";
import { CategoryChip } from "@/admin/components/InquiriesTable";
import { NewsPreviewDialog } from "@/admin/components/NewsPreviewDialog";

type VisibilityFilter = "all" | NewsRelease["visibilityStatus"];
type CategoryFilter = "all" | string;
type ViewMode = "list" | "grid";

type NewsReleasesTableProps = {
  newsReleases: NewsRelease[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: VisibilityFilter;
  onStatusFilterChange: (value: VisibilityFilter) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (value: CategoryFilter) => void;
  categoryOptions: string[];
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  onEdit: (news: NewsRelease) => void;
  onTogglePublish: (news: NewsRelease) => void;
  onDelete: (news: NewsRelease) => void;
};

const STATUS_TABS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

const PAGE_SIZE = 10;

const StatusPill = ({ status }: { status: NewsRelease["visibilityStatus"] }) => {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Published
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
      Hidden
    </span>
  );
};

const ToggleButton = ({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof List;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={cn(
      "group flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] transition-colors",
      active ? "bg-public-bg-brand" : "bg-admin-surface hover:bg-neutral-hover-subtle",
    )}
  >
    <Icon
      className={cn(
        "h-5 w-5 transition-colors",
        active ? "text-public-text-neutral-on-neutral" : "text-text-disabled group-hover:text-public-text-secondary",
      )}
      strokeWidth={active ? 2 : 1.6}
    />
  </button>
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

const MoreActionsMenu = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <ActionIconButton label="More actions">
        <MoreHorizontal className="h-4 w-4 text-text-default" strokeWidth={1.6} />
      </ActionIconButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      className="flex w-[112px] min-w-[112px] flex-col gap-1 rounded-md border-gray-200 bg-admin-surface p-1 shadow-md"
    >
      <DropdownMenuItem
        className={cn(MENU_ITEM_CLASS, "text-public-text-neutral-default focus:bg-neutral-hover-subtle focus:text-public-text-neutral-default")}
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4 shrink-0 text-public-text-secondary" strokeWidth={1.6} />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem
        className={cn(MENU_ITEM_CLASS, "text-icon-danger-secondary focus:bg-danger-subtle focus:text-icon-danger-secondary")}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 shrink-0 text-icon-danger-secondary" strokeWidth={1.6} />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const NewsCard = ({
  news,
  onPreview,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  news: NewsRelease;
  onPreview: (news: NewsRelease) => void;
  onEdit: (news: NewsRelease) => void;
  onTogglePublish: (news: NewsRelease) => void;
  onDelete: (news: NewsRelease) => void;
}) => {
  const date = new Date(news.datePosted);
  const isValidDate = !Number.isNaN(date.getTime());
  const published = news.visibilityStatus === "published";

  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {news.category ? <CategoryChip category={news.category} /> : <span className="text-xs text-slate-400">—</span>}
        <StatusPill status={news.visibilityStatus} />
      </div>

      <div className="flex flex-col gap-4">
        <p className="line-clamp-2 font-segoe text-sm font-semibold leading-[140%] text-text-default">{news.title}</p>
        <p className="line-clamp-2 font-segoe text-[13px] font-normal leading-[140%] text-slate-500">{news.description}</p>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-300 py-3">
          <p className="font-segoe text-[13px] font-semibold leading-[140%] text-slate-500">
            {news.visibilityStatus === "hidden" ? "Hidden" : "Published"}
          </p>
          <p className="font-cascadia text-[13px] font-normal leading-[140%] text-text-default">
            {news.visibilityStatus !== "hidden" && isValidDate ? `${format(date, "d MMM yyyy")} · ${format(date, "h:mm a")}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPreview(news)}
            className="flex h-9 w-[104px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default transition-colors hover:bg-slate-50"
          >
            <Eye className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            Preview
          </button>

          <div className="flex items-center gap-3">
            {published ? (
              <button
                type="button"
                onClick={() => onTogglePublish(news)}
                className="flex h-9 w-[85px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default transition-colors hover:bg-slate-50"
              >
                <EyeOff className="h-4 w-4 shrink-0 text-public-text-neutral-default" strokeWidth={1.6} />
                Hide
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTogglePublish(news)}
                className="flex h-9 w-[101px] items-center justify-center gap-2 rounded-md bg-public-bg-brand px-4 py-2 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
              >
                <Globe className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                Publish
              </button>
            )}
            <MoreActionsMenu onEdit={() => onEdit(news)} onDelete={() => onDelete(news)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NewsReleasesTable = ({
  newsReleases,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions,
  viewMode,
  onViewModeChange,
  onEdit,
  onTogglePublish,
  onDelete,
}: NewsReleasesTableProps) => {
  const [page, setPage] = useState(0);
  const [previewNews, setPreviewNews] = useState<NewsRelease | null>(null);

  const totalPages = Math.max(1, Math.ceil(newsReleases.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => newsReleases.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [newsReleases, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  const paginationFooter = (
    <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
      <p className="font-segoe text-[13px] text-text-neutral-tertiary">
        Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
        <span className="text-text-default">{newsReleases.length}</span> records
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => changePage(clampedPage - 1)}
          disabled={clampedPage === 0}
          className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
          Previous
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index)
            .slice(0, 5)
            .map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => changePage(index)}
                className={cn(
                  "flex h-[29px] w-8 items-center justify-center rounded-lg font-segoe text-[13px]",
                  index === clampedPage
                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                    : "text-text-default hover:bg-slate-50",
                )}
              >
                {index + 1}
              </button>
            ))}
        </div>
        <button
          type="button"
          onClick={() => changePage(clampedPage + 1)}
          disabled={clampedPage >= totalPages - 1}
          className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-default disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header: search + status tabs + category dropdown + view toggle */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search news releases..."
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
                onClick={() => {
                  onStatusFilterChange(tab.value);
                  setPage(0);
                }}
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
              <span className="whitespace-nowrap">{categoryFilter === "all" ? "All categories" : categoryFilter}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onCategoryFilterChange("all");
                setPage(0);
              }}
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
                onClick={() => {
                  onCategoryFilterChange(category);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  categoryFilter === category && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {category}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex h-10 w-[74px] shrink-0 items-center gap-0.5 rounded-md border border-slate-300 bg-admin-surface px-1 py-0.5">
          <ToggleButton active={viewMode === "list"} label="List view" icon={List} onClick={() => onViewModeChange("list")} />
          <ToggleButton active={viewMode === "grid"} label="Grid view" icon={LayoutGrid} onClick={() => onViewModeChange("grid")} />
        </div>
      </div>

      {viewMode === "grid" ? (
        newsReleases.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-md border border-slate-300 bg-admin-surface px-4 py-16 text-center shadow-sm">
            <p className="font-segoe text-sm font-semibold text-text-default">No news releases found</p>
            <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {newsReleases.map((news) => (
              <NewsCard
                key={news.id}
                news={news}
                onPreview={setPreviewNews}
                onEdit={onEdit}
                onTogglePublish={onTogglePublish}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
          {/* Column headers */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
            <span className="min-w-0 flex-1">Title</span>
            <span className="w-[12%]">Category</span>
            <span className="w-[16%]">Facebook Link</span>
            <span className="w-[16%]">Published Date</span>
            <span className="w-[12%]">Status</span>
            <span className="w-[80px] shrink-0">Actions</span>
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
              <p className="font-segoe text-sm font-semibold text-text-default">No news releases found</p>
              <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            pageItems.map((news) => {
              const date = new Date(news.datePosted);
              const isValidDate = !Number.isNaN(date.getTime());

              return (
                <div
                  key={news.id}
                  className="group flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1 pr-2">
                    <p className="line-clamp-2 font-segoe text-sm font-semibold leading-[140%] text-text-default">{news.title}</p>
                  </div>

                  <div className="flex w-[12%] items-center">
                    {news.category ? <CategoryChip category={news.category} /> : <span className="text-xs text-slate-400">—</span>}
                  </div>

                  <div className="flex w-[16%] items-center">
                    {news.facebookPostUrl ? (
                      <a
                        href={news.facebookPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link flex items-center gap-1 font-segoe text-[13px] font-semibold leading-none text-public-bg-brand transition-colors hover:text-icon-info-secondary"
                      >
                        Facebook Link
                        <ExternalLink
                          className="h-[13px] w-[13px] shrink-0 text-public-bg-brand transition-colors group-hover/link:text-icon-info-secondary"
                          strokeWidth={1.3}
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Not added</span>
                    )}
                  </div>

                  <div className="flex w-[16%] items-center">
                    <p className="font-segoe text-xs font-semibold leading-[140%] text-text-default">
                      {isValidDate ? `${format(date, "d MMM yyyy")}, ${format(date, "h:mm a")}` : ""}
                    </p>
                  </div>

                  <div className="flex w-[12%] items-center">
                    <StatusPill status={news.visibilityStatus} />
                  </div>

                  <div className="flex w-[80px] shrink-0 items-center gap-2">
                    <ActionIconButton label="Preview" onClick={() => setPreviewNews(news)}>
                      <Eye className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                    </ActionIconButton>
                    <MoreActionsMenu onEdit={() => onEdit(news)} onDelete={() => onDelete(news)} />
                  </div>
                </div>
              );
            })
          )}

          {/* Footer / pagination */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
            <p className="font-segoe text-[13px] text-text-neutral-tertiary">
              Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
              <span className="text-text-default">{newsReleases.length}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changePage(clampedPage - 1)}
                disabled={clampedPage === 0}
                className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
                Previous
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, index) => index)
                  .slice(0, 5)
                  .map((index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => changePage(index)}
                      className={cn(
                        "flex h-[29px] w-8 items-center justify-center rounded-lg font-segoe text-[13px]",
                        index === clampedPage
                          ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                          : "text-text-default hover:bg-slate-50",
                      )}
                    >
                      {index + 1}
                    </button>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => changePage(clampedPage + 1)}
                disabled={clampedPage >= totalPages - 1}
                className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-default disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      )}

      <NewsPreviewDialog
        news={previewNews}
        onOpenChange={(open) => {
          if (!open) setPreviewNews(null);
        }}
      />
    </div>
  );
};

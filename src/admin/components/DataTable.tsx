
import React from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  onRowClick?: (item: T) => void;
  getRowAriaLabel?: (item: T) => string;
  getEditAriaLabel?: (item: T) => string;
  getDeleteAriaLabel?: (item: T) => string;
  getViewAriaLabel?: (item: T) => string;
  isLoading?: boolean;
}

export function DataTable<T extends { id: string | number }>({ 
  columns, 
  data, 
  onEdit, 
  onDelete, 
  onView,
  onRowClick,
  getRowAriaLabel,
  getEditAriaLabel,
  getDeleteAriaLabel,
  getViewAriaLabel,
  isLoading 
}: DataTableProps<T>) {
  const renderCellValue = (item: T, column: Column<T>) =>
    typeof column.accessor === 'function'
      ? column.accessor(item)
      : (item[column.accessor] as React.ReactNode);

  const hasActions = Boolean(onEdit || onDelete || onView);

  const handleRowKeyDown = onRowClick
    ? (item: T) => (event: React.KeyboardEvent<HTMLDivElement | HTMLTableRowElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRowClick(item);
        }
      }
    : undefined;

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
      {data.length === 0 ? (
        <div className="px-6 py-12 text-center font-medium text-muted-foreground">
          No records found.
        </div>
      ) : (
        <>
          <div className="space-y-3 p-3 md:hidden">
            {data.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border border-border/70 bg-card text-foreground shadow-sm ${onRowClick ? "cursor-pointer transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""}`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={handleRowKeyDown ? handleRowKeyDown(item) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick ? (getRowAriaLabel?.(item) ?? "Open details") : undefined}
                role={onRowClick ? "button" : undefined}
              >
                <div className="divide-y divide-border/60">
                  {columns.map((column, idx) => (
                    <div key={idx} className="px-4 py-3">
                      <div className="grid min-w-0 gap-1.5 sm:grid-cols-[minmax(90px,35%)_1fr] sm:gap-3">
                        <p className="admin-kicker min-w-0 text-muted-foreground">
                          {column.header}
                        </p>
                        <div className={`min-w-0 break-words text-sm text-foreground ${column.className || ''}`}>
                          {renderCellValue(item, column)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasActions ? (
                    <div className="px-4 py-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(90px,35%)_1fr] sm:gap-3">
                        <p className="admin-kicker text-muted-foreground">Actions</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {onView && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onView(item);
                              }}
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                              aria-label={getViewAriaLabel?.(item) ?? "View details"}
                            >
                              <Eye size={16} />
                              View
                            </button>
                          )}
                          {onEdit && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onEdit(item);
                              }}
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-info/10 hover:text-info"
                              aria-label={getEditAriaLabel?.(item) ?? "Edit record"}
                            >
                              <Edit2 size={16} />
                              Edit
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(item);
                              }}
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                              aria-label={getDeleteAriaLabel?.(item) ?? "Delete record"}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {columns.map((column, idx) => (
                    <th 
                      key={idx} 
                      className={`admin-kicker px-6 py-4 ${column.className || ''}`}
                    >
                      {column.header}
                    </th>
                  ))}
                  {hasActions && (
                    <th className="admin-kicker px-6 py-4 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"}`}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    onKeyDown={handleRowKeyDown ? handleRowKeyDown(item) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={onRowClick ? (getRowAriaLabel?.(item) ?? "Open details") : undefined}
                  >
                    {columns.map((column, idx) => (
                      <td key={idx} className={`px-6 py-4 text-sm text-foreground ${column.className || ''}`}>
                        {renderCellValue(item, column)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                          {onView && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onView(item);
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                              aria-label={getViewAriaLabel?.(item) ?? "View details"}
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {onEdit && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onEdit(item);
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-info/10 hover:text-info"
                              aria-label={getEditAriaLabel?.(item) ?? "Edit record"}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              onClick={(event) => {
                                event.stopPropagation();
                                onDelete(item);
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                              aria-label={getDeleteAriaLabel?.(item) ?? "Delete record"}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

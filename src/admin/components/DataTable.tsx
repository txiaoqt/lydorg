
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
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {columns.map((column, idx) => (
                <th 
                  key={idx} 
                  className={`admin-kicker px-6 py-4 ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {(onEdit || onDelete || onView) && (
                <th className="admin-kicker px-6 py-4 text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-muted-foreground font-medium">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20"}`}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(item);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={onRowClick ? (getRowAriaLabel?.(item) ?? "Open details") : undefined}
                >
                  {columns.map((column, idx) => (
                    <td key={idx} className={`px-6 py-4 text-sm text-foreground ${column.className || ''}`}>
                      {typeof column.accessor === 'function' 
                        ? column.accessor(item) 
                        : (item[column.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  {(onEdit || onDelete || onView) && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {onView && (
                          <button 
                            onClick={(event) => {
                              event.stopPropagation();
                              onView(item);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
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
                            className="p-2 text-muted-foreground hover:text-info hover:bg-info/10 rounded-lg transition-all"
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
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            aria-label={getDeleteAriaLabel?.(item) ?? "Delete record"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

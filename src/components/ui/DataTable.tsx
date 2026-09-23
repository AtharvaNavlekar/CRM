import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectedIds,
  onSelectRow,
  onSelectAll,
  isAllSelected = false,
  isLoading = false,
  emptyState,
  stickyHeader = true,
  className = ''
}: DataTableProps<T>) {
  const hasSelection = Boolean(onSelectRow);

  return (
    <div
      className={`w-full overflow-hidden border border-[#E2E8F0] dark:border-[#334155] rounded-2xl bg-[#FFFFFF] dark:bg-[#161A19] shadow-2xs font-body ${className}`}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`border-b border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAF9] dark:bg-[#111514] text-xs font-semibold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider ${
                stickyHeader ? 'sticky top-0 z-10' : ''
              }`}
            >
              {hasSelection && (
                <th className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onSelectAll}
                    aria-label="Select all rows"
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#00695C] focus:ring-[#00695C] cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-4 py-3 ${alignClass} ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F1F5F4] dark:divide-[#202726] text-sm text-[#0F172A] dark:text-[#F1F5F9]">
            {data.length === 0 && !isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (hasSelection ? 1 : 0)}
                  className="px-6 py-12 text-center text-[#64748B] dark:text-[#94A3B8]"
                >
                  {emptyState || 'No records match the current criteria.'}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds?.has(id);

                return (
                  <tr
                    key={id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? 'bg-[#CCE8E1]/30 dark:bg-[#004F46]/30'
                        : 'hover:bg-[#F8FAF9] dark:hover:bg-[#1C2220]'
                    }`}
                  >
                    {hasSelection && (
                      <td className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(id)}
                          aria-label={`Select row ${id}`}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#00695C] focus:ring-[#00695C] cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 ${alignClass} ${col.className || ''}`}
                        >
                          {col.render ? col.render(item, index) : (item as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = ''
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-[#FFFFFF] dark:bg-[#161A19] border-t border-[#E2E8F0] dark:border-[#334155] rounded-b-2xl font-body text-xs text-[#64748B] dark:text-[#94A3B8] ${className}`}
    >
      <div className="tabular-nums">
        Showing <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{startItem}</span> to{' '}
        <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{endItem}</span> of{' '}
        <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">{totalItems}</span> entries
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Previous
        </Button>

        <span className="px-2 font-medium tabular-nums">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

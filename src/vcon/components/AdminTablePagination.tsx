import React from 'react';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}

const PAGE_SIZE = 20;

export const AdminTablePagination: React.FC<Props> = ({ page, totalRows, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const firstRow = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, totalRows);

  const pageButtonClass =
    'p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#181a22] rounded transition disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="h-10 px-4 flex items-center justify-between shrink-0 border-t border-[#1c1d22] bg-[#0c0d10] text-[10px] text-zinc-500 font-mono">
      <span>Showing {firstRow}-{lastRow} of {totalRows}</span>
      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          className={pageButtonClass}
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="First page"
        >
          <ChevronFirst className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={pageButtonClass}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="min-w-12 text-center text-zinc-400">Page {page} of {pageCount}</span>
        <button
          type="button"
          className={pageButtonClass}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={pageButtonClass}
          onClick={() => onPageChange(pageCount)}
          disabled={page >= pageCount}
          aria-label="Last page"
        >
          <ChevronLast className="w-3.5 h-3.5" />
        </button>
      </div>
      <span>20 per page</span>
    </div>
  );
};
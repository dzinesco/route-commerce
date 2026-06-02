"use client";

type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function AdminPagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = "" 
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i).map((page) => {
          // Show first, last, current, and adjacent pages
          const showPage = 
            page === 0 || 
            page === totalPages - 1 || 
            Math.abs(page - currentPage) <= 1;
          
          // Show ellipsis
          const showEllipsisBefore = page === 1 && currentPage > 2;
          const showEllipsisAfter = page === totalPages - 2 && currentPage < totalPages - 3;

          if (!showPage && !showEllipsisBefore && !showEllipsisAfter) return null;

          if (showEllipsisBefore || showEllipsisAfter) {
            return (
              <span key={`ellipsis-${page}`} className="px-3 py-2 text-[var(--admin-text-muted)] text-sm">
                &hellip;
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 ${
                page === currentPage
                  ? "bg-[var(--admin-accent)] text-white shadow-md"
                  : "text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] border border-transparent hover:border-[var(--admin-border)]"
              }`}
            >
              {page + 1}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// Simple previous/next pagination
type AdminSimplePaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function AdminSimplePagination({ 
  page, 
  totalPages, 
  onPageChange,
  className = "" 
}: AdminSimplePaginationProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-xs text-[var(--admin-text-muted)]">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
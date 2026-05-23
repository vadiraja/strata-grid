import type { FC } from 'react';

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  mode?: 'pages' | 'loadMore' | 'infinite';
  hasMore?: boolean;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onLoadMore?: () => void;
}

/**
 * Pagination controls rendered in the grid footer.
 * Supports page navigation, page size selection, and load-more mode.
 */
export const PaginationBar: FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  mode = 'pages',
  hasMore = true,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
}) => {
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, totalCount);

  if (mode === 'loadMore') {
    return (
      <div className="strata-pagination strata-pagination-load-more">
        <span className="strata-pagination-info">
          Showing {totalCount > 0 ? endRow : 0} of {totalCount}
        </span>
        <button
          className="strata-pagination-load-more-btn"
          onClick={onLoadMore}
          disabled={!hasMore || isLoading}
          aria-label="Load more rows"
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </button>
      </div>
    );
  }

  return (
    <div className="strata-pagination">
      <div className="strata-pagination-size">
        <label htmlFor="strata-page-size" className="strata-pagination-label">
          Rows per page
        </label>
        <select
          id="strata-page-size"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="strata-pagination-select"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <span className="strata-pagination-info">
        {totalCount > 0 ? `${startRow}\u2013${endRow} of ${totalCount}` : '0 rows'}
      </span>

      <div className="strata-pagination-nav">
        <button
          className="strata-pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          className="strata-pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
};

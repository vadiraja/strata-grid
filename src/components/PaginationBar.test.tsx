import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PaginationBar } from './PaginationBar';

describe('PaginationBar', () => {
  const defaultProps = {
    currentPage: 0,
    totalPages: 5,
    pageSize: 10,
    totalCount: 50,
    pageSizeOptions: [10, 25, 50, 100],
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it('renders page info', () => {
    render(<PaginationBar {...defaultProps} />);
    expect(screen.getByText(/1–10 of 50/)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<PaginationBar {...defaultProps} currentPage={0} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<PaginationBar {...defaultProps} currentPage={4} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('calls onPageChange when next is clicked', () => {
    const onPageChange = vi.fn();
    render(<PaginationBar {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when previous is clicked', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationBar {...defaultProps} currentPage={2} onPageChange={onPageChange} />,
    );
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageSizeChange when page size is changed', () => {
    const onPageSizeChange = vi.fn();
    render(
      <PaginationBar {...defaultProps} onPageSizeChange={onPageSizeChange} />,
    );
    fireEvent.change(screen.getByLabelText('Rows per page'), {
      target: { value: '25' },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('renders load more button in loadMore mode', () => {
    const onLoadMore = vi.fn();
    render(
      <PaginationBar
        {...defaultProps}
        mode="loadMore"
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    const btn = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(btn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables load more when hasMore is false', () => {
    render(
      <PaginationBar
        {...defaultProps}
        mode="loadMore"
        hasMore={false}
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /load more/i })).toBeDisabled();
  });
});

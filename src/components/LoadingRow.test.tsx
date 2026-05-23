import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingRow } from './LoadingRow';

describe('LoadingRow', () => {
  it('renders a loading indicator', () => {
    render(<LoadingRow depth={1} />);
    expect(screen.getByRole('row')).toBeInTheDocument();
    expect(screen.getByRole('row')).toHaveClass('strata-row-loading');
  });

  it('indents based on depth', () => {
    const { container } = render(<LoadingRow depth={3} />);
    const indent = container.querySelector('.strata-loading-indent');
    expect(indent).toHaveStyle({ paddingLeft: '72px' }); // 3 * 24px
  });

  it('renders with aria-busy', () => {
    render(<LoadingRow depth={1} />);
    expect(screen.getByRole('row')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(<LoadingRow depth={1} error="Failed to load" onRetry={onRetry} />);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows error message', () => {
    render(<LoadingRow depth={1} error="Network timeout" />);
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });
});

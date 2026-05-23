import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when visible', () => {
    render(<LoadingOverlay visible />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading data',
    );
  });

  it('does not render when not visible', () => {
    render(<LoadingOverlay visible={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('has the correct CSS class', () => {
    render(<LoadingOverlay visible />);
    expect(screen.getByRole('status').parentElement).toHaveClass(
      'strata-loading-overlay',
    );
  });
});
